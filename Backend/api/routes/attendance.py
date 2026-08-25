from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import datetime

from db.session import get_db
from db.models import User, UserRole, Batch, Attendance, StudentBatchMap, FacultyBatchMap
from api.deps import get_current_active_user, require_role

router = APIRouter()

class AttendanceRecord(BaseModel):
    student_id: int
    is_present: bool

class MarkAttendanceRequest(BaseModel):
    session_date: datetime.date
    records: List[AttendanceRecord]

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    batch_id: int
    session_date: datetime.date
    is_present: bool
    
    class Config:
        from_attributes = True

@router.post("/batch/{batch_id}")
def mark_attendance(
    batch_id: int,
    request: MarkAttendanceRequest,
    current_user: User = Depends(require_role([UserRole.faculty, UserRole.admin, UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # Security: If faculty, check if assigned
    if current_user.role == UserRole.faculty:
        is_assigned = db.query(FacultyBatchMap).filter_by(faculty_id=current_user.id, batch_id=batch_id).first()
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not assigned to this batch")
            
    # Upsert attendance
    for record in request.records:
        existing = db.query(Attendance).filter_by(
            student_id=record.student_id,
            batch_id=batch_id,
            session_date=request.session_date
        ).first()
        
        if existing:
            existing.is_present = record.is_present
            existing.marked_by = current_user.id
        else:
            new_record = Attendance(
                student_id=record.student_id,
                batch_id=batch_id,
                session_date=request.session_date,
                is_present=record.is_present,
                marked_by=current_user.id
            )
            db.add(new_record)
            
    db.commit()
    return {"message": "Attendance recorded successfully"}

@router.get("/batch/{batch_id}", response_model=List[AttendanceResponse])
def get_attendance(
    batch_id: int,
    session_date: datetime.date = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).filter(Attendance.batch_id == batch_id)
    if session_date:
        query = query.filter(Attendance.session_date == session_date)
        
    if current_user.role == UserRole.student:
        query = query.filter(Attendance.student_id == current_user.id)
        
    return query.all()
