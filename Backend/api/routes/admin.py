from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import io
import csv
import pandas as pd

from db.session import get_db
from db.models import User, UserRole, ApprovalStatus, Course, Batch, BatchStatus, AdminCourseMap, FacultyBatchMap, StudentBatchMap
from api.deps import get_current_active_user, require_role
from core.audit import log_action
from core.security import get_password_hash

router = APIRouter()

class BatchCreate(BaseModel):
    course_id: int
    name: str
    batch_code: str
    start_date: date
    end_date: date
    enrollment_deadline: Optional[date] = None
    assigned_faculty_id: Optional[int] = None

class BatchResponse(BaseModel):
    id: int
    course_id: int
    name: str
    batch_code: str
    status: str
    assigned_admin_id: int
    
    class Config:
        from_attributes = True

class BatchStatusUpdate(BaseModel):
    status: BatchStatus

class AssignFacultyRequest(BaseModel):
    faculty_id: int

class StudentCreate(BaseModel):
    username: str
    email: str
    password: str

def check_admin_course_access(db: Session, admin_id: int, course_id: int):
    is_assigned = db.query(AdminCourseMap).filter_by(admin_id=admin_id, course_id=course_id).first()
    if not is_assigned:
        raise HTTPException(status_code=403, detail="You do not have permission to manage this course")

def check_admin_batch_access(db: Session, admin_id: int, batch: Batch):
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.assigned_admin_id != admin_id:
        # Check if they own the parent course as fallback
        check_admin_course_access(db, admin_id, batch.course_id)

@router.post("/batches", response_model=BatchResponse)
def create_batch(
    batch_in: BatchCreate,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    check_admin_course_access(db, current_user.id, batch_in.course_id)
        
    if db.query(Batch).filter(Batch.batch_code == batch_in.batch_code).first():
        raise HTTPException(status_code=400, detail="Batch code already exists")
        
    new_batch = Batch(
        course_id=batch_in.course_id,
        name=batch_in.name,
        batch_code=batch_in.batch_code,
        start_date=batch_in.start_date,
        end_date=batch_in.end_date,
        enrollment_deadline=batch_in.enrollment_deadline or batch_in.end_date,
        assigned_admin_id=current_user.id,
        created_by=current_user.id,
        status=BatchStatus.ongoing
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    
    if batch_in.assigned_faculty_id:
        faculty = db.query(User).filter(User.id == batch_in.assigned_faculty_id, User.role == UserRole.faculty).first()
        if faculty:
            new_map = FacultyBatchMap(faculty_id=faculty.id, batch_id=new_batch.id, assigned_by=current_user.id)
            db.add(new_map)
            db.commit()
    
    log_action(db, current_user.id, "create_sub_batch", "batch", new_batch.id, f"Admin created sub-batch {new_batch.batch_code}")
    return new_batch

@router.get("/batches", response_model=List[BatchResponse])
def get_admin_batches(
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    # Admin can only see batches they are assigned to, or batches in courses they manage
    course_ids = [m.course_id for m in db.query(AdminCourseMap).filter_by(admin_id=current_user.id).all()]
    return db.query(Batch).filter(
        (Batch.assigned_admin_id == current_user.id) | (Batch.course_id.in_(course_ids))
    ).all()

@router.put("/batches/{batch_id}/status")
def update_batch_status(
    batch_id: int,
    request: BatchStatusUpdate,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
        
    batch.status = request.status
    db.commit()
    
    log_action(db, current_user.id, "update_batch_status", "batch", batch_id, f"Admin updated batch status to {request.status.value}")
    return {"message": f"Batch status updated to {request.status.value}"}

@router.post("/batches/{batch_id}/faculty")
def assign_faculty_to_batch(
    batch_id: int,
    request: AssignFacultyRequest,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
            
    faculty = db.query(User).filter(User.id == request.faculty_id, User.role == UserRole.faculty).first()
    if not faculty or faculty.status != ApprovalStatus.approved:
        raise HTTPException(status_code=400, detail="Invalid or unapproved faculty member")

    existing = db.query(FacultyBatchMap).filter_by(faculty_id=request.faculty_id, batch_id=batch_id).first()
    if existing:
        return {"message": "Faculty is already assigned to this batch"}
        
    new_map = FacultyBatchMap(faculty_id=request.faculty_id, batch_id=batch_id, assigned_by=current_user.id)
    db.add(new_map)
    db.commit()
    
    log_action(db, current_user.id, "assign_faculty_batch", "batch", batch_id, f"Admin assigned faculty {request.faculty_id}")
    return {"message": "Faculty successfully assigned to batch"}

@router.post("/batches/{batch_id}/students")
def add_student_to_batch(
    batch_id: int,
    student_in: StudentCreate,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
    
    if db.query(User).filter(User.email == student_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_student = User(
        username=student_in.username,
        email=student_in.email,
        password_hash=get_password_hash(student_in.password),
        role=UserRole.student,
        status=ApprovalStatus.approved # Admin directly adding them means they are approved
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    student_map = StudentBatchMap(student_id=new_student.id, batch_id=batch_id)
    db.add(student_map)
    db.commit()
    
    log_action(db, current_user.id, "add_student", "user", new_student.id, f"Admin added student to batch {batch_id}")
    return {"message": "Student successfully added"}

@router.post("/batches/{batch_id}/students/bulk")
async def bulk_import_students(
    batch_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    added_count = 0
    for row in csv_reader:
        username = row.get('username')
        email = row.get('email')
        password = row.get('password')
        
        if not (username and email and password):
            continue
            
        if db.query(User).filter(User.email == email).first():
            continue # Skip existing
            
        new_student = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.student,
            status=ApprovalStatus.approved
        )
        db.add(new_student)
        db.flush() # get ID
        
        student_map = StudentBatchMap(student_id=new_student.id, batch_id=batch_id)
        db.add(student_map)
        added_count += 1
        
    db.commit()
    log_action(db, current_user.id, "bulk_add_students", "batch", batch_id, f"Admin bulk imported {added_count} students")
    return {"message": f"Successfully imported {added_count} students"}

from sqlalchemy import func
from db.models import Session as SessionModel

@router.get("/courses")
def get_admin_courses(
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    course_ids = [m.course_id for m in db.query(AdminCourseMap).filter_by(admin_id=current_user.id).all()]
    return db.query(Course).filter(Course.id.in_(course_ids)).all()

@router.get("/students")
def get_admin_students(
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    course_ids = [m.course_id for m in db.query(AdminCourseMap).filter_by(admin_id=current_user.id).all()]
    batch_ids = [b.id for b in db.query(Batch).filter(Batch.course_id.in_(course_ids)).all()]
    
    if not batch_ids:
        return []
        
    students = db.query(
        User.id,
        User.username,
        User.email,
        Batch.batch_code.label("batch_name")
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
def get_admin_student_sessions(
    student_id: int,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    course_ids = [m.course_id for m in db.query(AdminCourseMap).filter_by(admin_id=current_user.id).all()]
    batch_ids = [b.id for b in db.query(Batch).filter(Batch.course_id.in_(course_ids)).all()]
    
    mapping = db.query(StudentBatchMap).filter(
        StudentBatchMap.student_id == student_id,
        StudentBatchMap.batch_id.in_(batch_ids)
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=403, detail="Student not in your managed courses.")
        
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == student_id
    ).order_by(SessionModel.session_date.desc()).all()
    return sessions

@router.get("/faculty")
def get_admin_faculty(
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(
        User.role == UserRole.faculty,
        User.status == ApprovalStatus.approved
    ).all()

@router.get("/batches/{batch_id}/students")
def get_admin_batch_students(
    batch_id: int,
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
    
    students = db.query(
        User.id,
        User.username,
        User.email,
        Batch.batch_code.label("batch_name")
    ).join(
        StudentBatchMap, StudentBatchMap.student_id == User.id
    ).join(
        Batch, Batch.id == StudentBatchMap.batch_id
    ).filter(
        StudentBatchMap.batch_id == batch_id,
        User.role == UserRole.student
    ).all()
    
    results = []
    for st in students:
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
