from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from db.session import get_db
from db.models import User, UserRole, SessionEmbedding, Session as SessionModel, ChatHistory, FacultyBatchMap, AdminCourseMap, Batch
from api.deps import get_current_active_user
from ml_pipeline.embedding_ai import generate_embedding
from ml_pipeline.llm_ai import ask_rag_coach

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
def chat_with_coach(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    RAG-powered chat endpoint. Takes a user question, finds relevant past performances via pgvector,
    and asks the AI coach for personalized advice.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    # 1. Embed the query
    query_embedding = generate_embedding(request.message)
    
    # 2. RBAC Filter: Determine which embeddings the user is allowed to search
    base_query = db.query(SessionEmbedding)
    
    if current_user.role == UserRole.student:
        base_query = base_query.filter(SessionEmbedding.user_id == current_user.id)
    elif current_user.role == UserRole.faculty:
        assigned_batches = db.query(FacultyBatchMap.batch_id).filter(FacultyBatchMap.faculty_id == current_user.id).all()
        batch_ids = [b[0] for b in assigned_batches]
        base_query = base_query.filter(SessionEmbedding.batch_id.in_(batch_ids))
    elif current_user.role == UserRole.admin:
        course_ids = db.query(AdminCourseMap.course_id).filter(AdminCourseMap.admin_id == current_user.id).all()
        course_ids = [c[0] for c in course_ids]
        batch_ids = db.query(Batch.id).filter(Batch.course_id.in_(course_ids)).all()
        batch_ids = [b[0] for b in batch_ids]
        base_query = base_query.filter(SessionEmbedding.batch_id.in_(batch_ids))
    # super_admin: unrestricted (unchanged)
    # 3. Retrieve top 3 most relevant sessions using pgvector l2_distance
    relevant_embeddings = base_query.order_by(
        SessionEmbedding.embedding.l2_distance(query_embedding)
    ).limit(3).all()
    
    # 3. Build context from retrieved sessions
    context_blocks = []
    for se in relevant_embeddings:
        # Fetch the actual session data
        session_data = db.query(SessionModel).filter(SessionModel.id == se.session_id).first()
        if session_data:
            transcript = session_data.transcript or ""
            llm_report = session_data.llm_report or ""
            block = (
                f"Session Date: {session_data.session_date}\n"
                f"Overall Score: {session_data.overall_score}/100\n"
                f"Transcript snippet: {transcript[:500]}...\n"
                f"Coach's original feedback: {llm_report[:500]}...\n"
            )
            context_blocks.append(block)
            
    context_str = "\n---\n".join(context_blocks)
    if not context_str:
        context_str = "No past sessions found. This is a new user."
        
    # 4. Ask the LLM
    ai_reply = ask_rag_coach(query=request.message, context=context_str)
    
    # 5. Save to chat history
    user_chat = ChatHistory(
        user_id=current_user.id,
        role="user",
        message=request.message
    )
    ai_chat = ChatHistory(
        user_id=current_user.id,
        role="assistant",
        message=ai_reply
    )
    db.add(user_chat)
    db.add(ai_chat)
    db.commit()
    
    return {"reply": ai_reply}
