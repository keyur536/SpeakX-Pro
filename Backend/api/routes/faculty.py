from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from db.models import User, UserRole, Batch, Course, FacultyBatchMap, StudentBatchMap, Session as SessionModel
from api.deps import get_current_active_user, require_role

router = APIRouter()

@router.get("/batches")
def get_faculty_batches(
    current_user: User = Depends(require_role([UserRole.faculty])),
    db: Session = Depends(get_db)
):
    """
    Get all batches assigned to the faculty member, joined with course names.
    """
    batches = db.query(
        Batch.id,
        Batch.code,
        Batch.status,
        Course.name.label("course_name")
    ).join(
        FacultyBatchMap, FacultyBatchMap.batch_id == Batch.id
    ).join(
        Course, Course.id == Batch.course_id
    ).filter(
        FacultyBatchMap.faculty_id == current_user.id
    ).all()
    
    return [
        {
            "id": b.id,
            "code": b.code,
            "status": b.status,
            "course_name": b.course_name
        }
        for b in batches
    ]

@router.get("/students")
def get_faculty_students(
    current_user: User = Depends(require_role([UserRole.faculty])),
    db: Session = Depends(get_db)
):
    """
    Get all students inside faculty's assigned batches.
    Returns: id, username, email, batch_name, latest_overall_score, total_sessions, last_session_date
    """
    # Find all batch IDs assigned to this faculty
    assigned_batches = db.query(FacultyBatchMap.batch_id).filter(
        FacultyBatchMap.faculty_id == current_user.id
    ).all()
    batch_ids = [b[0] for b in assigned_batches]
    
    if not batch_ids:
        return []

    # Get students in these batches
    students = db.query(
        User.id,
        User.username,
        User.email,
        Batch.code.label("batch_name")
    ).join(
        StudentBatchMap, StudentBatchMap.student_id == User.id
    ).join(
        Batch, Batch.id == StudentBatchMap.batch_id
    ).filter(
        StudentBatchMap.batch_id.in_(batch_ids),
        User.role == UserRole.student
    ).all()
    
    results = []
    for st in students:
        # Get stats from sessions
        session_stats = db.query(
            func.count(SessionModel.id).label("total_sessions"),
            func.max(SessionModel.session_date).label("last_session_date")
        ).filter(SessionModel.user_id == st.id).first()
        
        latest_session = db.query(SessionModel.overall_score).filter(
            SessionModel.user_id == st.id
        ).order_by(SessionModel.session_date.desc()).first()
        
        results.append({
            "id": st.id,
            "username": st.username,
            "email": st.email,
            "batch_name": st.batch_name,
            "total_sessions": session_stats.total_sessions or 0,
            "last_session_date": session_stats.last_session_date,
            "latest_overall_score": latest_session[0] if latest_session else None
        })
        
    return results

@router.get("/students/{student_id}/sessions")
def get_student_sessions(
    student_id: int,
    current_user: User = Depends(require_role([UserRole.faculty])),
    db: Session = Depends(get_db)
):
    """
    Full session history for a student. 403 if student not in faculty's batches.
    """
    assigned_batches = db.query(FacultyBatchMap.batch_id).filter(
        FacultyBatchMap.faculty_id == current_user.id
    ).all()
    batch_ids = [b[0] for b in assigned_batches]
    
    # Check if student is in one of these batches
    mapping = db.query(StudentBatchMap).filter(
        StudentBatchMap.student_id == student_id,
        StudentBatchMap.batch_id.in_(batch_ids)
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=403, detail="Student not in your assigned batches.")
        
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == student_id
    ).order_by(SessionModel.session_date.desc()).all()
    
    # Do not return transcript, it's null anyway
    return sessions
