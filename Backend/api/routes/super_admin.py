from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
from pydantic import BaseModel
from typing import List, Optional

from db.session import get_db
from db.models import User, UserRole, ApprovalStatus, Course, AdminCourseMap, Batch, BatchStatus, FacultyCourseMap, FacultyBatchMap, AuditLog
from api.deps import get_current_active_user, require_role
from core.security import get_password_hash
from core.audit import log_action

router = APIRouter()

# --- Pydantic Models ---

class CourseCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    duration_months: int = 6

class CourseResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    duration_months: int
    
    class Config:
        from_attributes = True

class AssignAdminRequest(BaseModel):
    admin_id: int

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    
    class Config:
        from_attributes = True

class StatusUpdateRequest(BaseModel):
    status: ApprovalStatus
    review_note: str = ""

class FacultyCreate(BaseModel):
    username: str
    email: str
    phone: Optional[str] = None
    password: str

class BatchCreate(BaseModel):
    course_id: int
    name: str
    batch_code: str
    start_date: datetime.date
    end_date: datetime.date
    enrollment_deadline: datetime.date
    assigned_admin_id: int

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

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int]
    action: str
    target_type: str
    target_id: Optional[int]
    details: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Courses ---

@router.post("/courses", response_model=CourseResponse)
def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    if db.query(Course).filter(Course.code == course_in.code).first():
        raise HTTPException(status_code=400, detail="Course code already exists")
        
    new_course = Course(
        name=course_in.name,
        code=course_in.code,
        description=course_in.description,
        duration_months=course_in.duration_months,
        created_by=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    log_action(db, current_user.id, "create_course", "course", new_course.id, f"Created course {new_course.code}")
    return new_course

@router.get("/courses", response_model=List[CourseResponse])
def get_all_courses(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(Course).all()

@router.post("/courses/{course_id}/admin")
def assign_admin_to_course(
    course_id: int,
    request: AssignAdminRequest,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    admin = db.query(User).filter(User.id == request.admin_id, User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found or user is not an admin")
        
    if admin.status != ApprovalStatus.approved:
        raise HTTPException(status_code=400, detail="Admin account must be approved first")

    existing = db.query(AdminCourseMap).filter(
        AdminCourseMap.admin_id == request.admin_id, 
        AdminCourseMap.course_id == course_id
    ).first()
    
    if existing:
        return {"message": "Admin is already assigned to this course"}
        
    new_map = AdminCourseMap(
        admin_id=request.admin_id,
        course_id=course_id,
        assigned_by=current_user.id
    )
    db.add(new_map)
    db.commit()
    
    log_action(db, current_user.id, "assign_admin_course", "course", course_id, f"Assigned admin {request.admin_id} to course {course_id}")
    return {"message": "Admin successfully assigned to course"}

# --- Faculty Management ---

@router.post("/faculty", response_model=UserResponse)
def create_faculty(
    faculty_in: FacultyCreate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == faculty_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(User).filter(User.username == faculty_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
        
    new_faculty = User(
        username=faculty_in.username,
        email=faculty_in.email,
        phone=faculty_in.phone,
        password_hash=get_password_hash(faculty_in.password),
        role=UserRole.faculty,
        status=ApprovalStatus.approved, # SA creates them, so auto-approve
        reviewed_by=current_user.id,
        reviewed_at=datetime.datetime.utcnow()
    )
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    
    log_action(db, current_user.id, "create_faculty", "user", new_faculty.id, f"Created faculty {new_faculty.email}")
    return new_faculty

@router.get("/faculty", response_model=List[UserResponse])
def get_all_faculty(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role == UserRole.faculty).all()

@router.post("/faculty/{faculty_id}/assign-course")
def assign_faculty_course(
    faculty_id: int,
    course_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    existing = db.query(FacultyCourseMap).filter_by(faculty_id=faculty_id, course_id=course_id).first()
    if existing:
        return {"message": "Faculty already assigned to course"}
        
    new_map = FacultyCourseMap(faculty_id=faculty_id, course_id=course_id, assigned_by=current_user.id)
    db.add(new_map)
    db.commit()
    
    log_action(db, current_user.id, "assign_faculty_course", "course", course_id, f"Assigned faculty {faculty_id} to course {course_id}")
    return {"message": "Faculty assigned to course"}

@router.post("/faculty/{faculty_id}/assign-batch")
def assign_faculty_batch(
    faculty_id: int,
    batch_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    existing = db.query(FacultyBatchMap).filter_by(faculty_id=faculty_id, batch_id=batch_id).first()
    if existing:
        return {"message": "Faculty already assigned to batch"}
        
    new_map = FacultyBatchMap(faculty_id=faculty_id, batch_id=batch_id, assigned_by=current_user.id)
    db.add(new_map)
    db.commit()
    
    log_action(db, current_user.id, "assign_faculty_batch", "batch", batch_id, f"Assigned faculty {faculty_id} to batch {batch_id}")
    return {"message": "Faculty assigned to batch"}

# --- Batches ---

@router.post("/batches", response_model=BatchResponse)
def create_batch(
    batch_in: BatchCreate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    # Enforce compulsory admin
    if not batch_in.assigned_admin_id:
        raise HTTPException(status_code=400, detail="Assigned admin ID is compulsory for a batch")
        
    admin = db.query(User).filter(User.id == batch_in.assigned_admin_id, User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Assigned admin not found or is not an admin")
        
    if db.query(Batch).filter(Batch.batch_code == batch_in.batch_code).first():
        raise HTTPException(status_code=400, detail="Batch code already exists")
        
    new_batch = Batch(
        course_id=batch_in.course_id,
        name=batch_in.name,
        batch_code=batch_in.batch_code,
        start_date=batch_in.start_date,
        end_date=batch_in.end_date,
        enrollment_deadline=batch_in.enrollment_deadline,
        assigned_admin_id=batch_in.assigned_admin_id,
        created_by=current_user.id,
        status=BatchStatus.ongoing
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    
    log_action(db, current_user.id, "create_batch", "batch", new_batch.id, f"Created batch {new_batch.batch_code}")
    return new_batch

@router.get("/batches", response_model=List[BatchResponse])
def get_all_batches(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(Batch).all()

@router.put("/batches/{batch_id}/status")
def update_batch_status(
    batch_id: int,
    request: BatchStatusUpdate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    batch.status = request.status
    db.commit()
    
    log_action(db, current_user.id, "update_batch_status", "batch", batch_id, f"Updated batch status to {request.status.value}")
    return {"message": f"Batch status updated to {request.status.value}"}

# --- General User Approvals & Audit ---

@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.status == ApprovalStatus.pending).all()

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    request: StatusUpdateRequest,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = request.status
    user.reviewed_by = current_user.id
    user.reviewed_at = datetime.datetime.utcnow()
    user.review_note = request.review_note
    db.commit()
    
    log_action(db, current_user.id, "update_user_status", "user", user_id, f"Updated status to {request.status.value}")
    return {"message": f"User status updated to {request.status.value}"}

@router.get("/audit-log", response_model=List[AuditLogResponse])
def get_audit_log(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
