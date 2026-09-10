import os
import tempfile
import sys
import json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

# Add root directory to python path so we can import ml_pipeline
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml_pipeline.audio_ai import analyze_audio
from ml_pipeline.video_ai import analyze_video
from ml_pipeline.nlp_ai import analyze_nlp
from ml_pipeline.llm_ai import generate_feedback
from ml_pipeline.scoring_ai import calculate_scores
from ml_pipeline.embedding_ai import generate_embedding

from db.session import get_db
from db.models import User, Session as SessionModel, SessionEmbedding, StudentBatchMap, FacultyBatchMap, Notification
from api.deps import get_current_active_user
from core.email import send_performance_report_email

router = APIRouter()

@router.post("/analyze")
async def analyze_session(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    batch_id: int = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Accepts a video upload, runs the ML pipeline, and stores the session results.
    """
    if not file.filename.endswith(('.mp4', '.mov', '.avi', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid video format. Must be mp4, mov, avi, or webm.")
        
    # Verify student is in the batch if batch_id is provided
    if batch_id:
        mapping = db.query(StudentBatchMap).filter(
            StudentBatchMap.student_id == current_user.id,
            StudentBatchMap.batch_id == batch_id
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="You are not assigned to this batch")
    else:
        # Auto-lookup if not provided, take the first one they are assigned to
        mapping = db.query(StudentBatchMap).filter(StudentBatchMap.student_id == current_user.id).first()
        if mapping:
            batch_id = mapping.batch_id
        
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
        content = await file.read()
        temp_video.write(content)
        temp_video_path = temp_video.name
        
    try:
        # Run ML Pipeline
        audio_results = analyze_audio(temp_video_path)
        nlp_results = analyze_nlp(audio_results.get("transcript", ""))
        video_results = analyze_video(temp_video_path)
        
        # Calculate historical average score
        past_sessions = db.query(SessionModel).filter(SessionModel.user_id == current_user.id).all()
        if past_sessions:
            avg_past_score = round(sum(s.overall_score for s in past_sessions) / len(past_sessions), 1)
        else:
            avg_past_score = None

        # Calculate scores and generate feedback
        scores = calculate_scores(audio_results, video_results, nlp_results)
        feedback_report = generate_feedback(audio_results, video_results, nlp_results, avg_past_score)
        
        # Create database record
        new_session = SessionModel(
            user_id=current_user.id,
            batch_id=batch_id,
            video_filename=file.filename,
            duration_sec=audio_results.get("duration_sec", 0),
            
            wpm=audio_results.get("wpm", 0),
            fillers=audio_results.get("fillers", 0),
            fillers_per_minute=audio_results.get("fillers_per_minute", 0),
            num_pauses=audio_results.get("num_pauses", 0),
            avg_pause_sec=audio_results.get("avg_pause_sec", 0),
            total_pause_sec=audio_results.get("total_pause_sec", 0),
            mean_pitch_hz=audio_results.get("mean_pitch_hz", 0),
            pitch_variation_hz=audio_results.get("pitch_variation_hz", 0),
            
            eye_contact_pct=video_results.get("eye_contact_pct", 0),
            head_pose_forward_pct=video_results.get("head_pose_forward_pct", 0),
            head_pose_dominant=video_results.get("head_pose_dominant", "Unknown"),
            posture_upright_pct=video_results.get("posture_upright_pct", 0),
            posture_dominant=video_results.get("posture_dominant", "Unknown"),
            gesture_active_pct=video_results.get("gesture_active_pct", 0),
            smile_pct=video_results.get("smile_pct", 0),
            
            readability=nlp_results.get("readability", "Unknown"),
            grade_level=str(nlp_results.get("flesch_kincaid_grade", "N/A")),
            reading_ease=nlp_results.get("flesch_reading_ease", 0),
            vocabulary_ttr=nlp_results.get("vocabulary_ttr", 0),
            coherence_score=nlp_results.get("coherence_score", 0),
            total_sentences=nlp_results.get("sentence_count", 0),
            avg_sentence_length=nlp_results.get("avg_sentence_length", 0),
            
            transcript=None,  # Intentionally not stored in DB
            llm_report=feedback_report,
            
            confidence_score=scores.get("Confidence", 0),
            fluency_score=scores.get("Fluency", 0),
            english_proficiency_score=scores.get("English Proficiency", 0),
            communication_impact_score=scores.get("Communication Impact", 0),
            vocal_engagement_score=scores.get("Vocal Engagement", 0),
            physical_presence_score=scores.get("Physical Presence", 0),
            overall_score=scores.get("Overall Performance", 0)
        )
        
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # --- RAG Integration: Generate and save embedding ---
        metrics_dict = {
            "Overall Performance": scores.get("Overall Performance", 0),
            "Confidence": scores.get("Confidence", 0),
            "Fluency": scores.get("Fluency", 0),
            "English Proficiency": scores.get("English Proficiency", 0),
            "Communication Impact": scores.get("Communication Impact", 0),
            "Vocal Engagement": scores.get("Vocal Engagement", 0),
            "Physical Presence": scores.get("Physical Presence", 0),
            "wpm": audio_results.get("wpm", 0),
            "fillers": audio_results.get("fillers", 0),
            "eye_contact_pct": video_results.get("eye_contact_pct", 0),
            "pitch_variation_hz": audio_results.get("pitch_variation_hz", 0)
        }
        
        combined_text = f"Transcript:\n{audio_results.get('transcript', '')}\n\nExtracted Metrics:\n{json.dumps(metrics_dict, indent=2)}\n\nFeedback:\n{feedback_report}"
        embedding_vector = generate_embedding(combined_text)
        
        new_embedding = SessionEmbedding(
            session_id=new_session.id,
            user_id=current_user.id,
            batch_id=batch_id,
            content=combined_text,
            embedding=embedding_vector
        )
        db.add(new_embedding)
        db.commit()
        
        # --- Asynchronous Email Dispatch ---
        email_data = {
            "overall_score": scores.get("Overall Performance", 0),
            "confidence_score": scores.get("Confidence", 0),
            "fluency_score": scores.get("Fluency", 0),
            "eye_contact_pct": video_results.get("eye_contact_pct", 0),
            "feedback": feedback_report
        }
        background_tasks.add_task(send_performance_report_email, current_user.email, current_user.username, email_data)
        
        # --- Notifications: Notify Faculty ---
        if batch_id:
            faculty_maps = db.query(FacultyBatchMap).filter(FacultyBatchMap.batch_id == batch_id).all()
            for f_map in faculty_maps:
                notification = Notification(
                    user_id=f_map.faculty_id,
                    title="New Session Submission",
                    message=f"Student {current_user.username} has submitted a new session in batch {batch_id}. Score: {scores.get('Overall Performance', 0):.1f}%"
                )
                db.add(notification)
            db.commit()
        
    finally:
        os.remove(temp_video_path)
        
    return {
        "id": new_session.id,
        "overall_score": new_session.overall_score,
        "confidence_score": new_session.confidence_score,
        "fluency_score": new_session.fluency_score,
        "english_proficiency_score": new_session.english_proficiency_score,
        "communication_impact_score": new_session.communication_impact_score,
        "vocal_engagement_score": new_session.vocal_engagement_score,
        "physical_presence_score": new_session.physical_presence_score,
        "wpm": new_session.wpm,
        "eye_contact_pct": new_session.eye_contact_pct,
        "grammar_mistakes": "",
        "feedback": new_session.llm_report,
        "transcription": audio_results.get("transcript", "")  # Returned once to client, not stored
    }

@router.get("/")
def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(SessionModel).filter(SessionModel.user_id == current_user.id).order_by(SessionModel.session_date.desc()).all()
    return sessions

@router.get("/{session_id}")
def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Check permissions (either it's their own session, or they are staff)
    from db.models import UserRole
    if session.user_id != current_user.id and current_user.role not in [UserRole.super_admin, UserRole.admin, UserRole.faculty]:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
        
    return session
