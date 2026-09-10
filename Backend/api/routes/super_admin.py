from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
import pandas as pd
import io
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
    assigned_admin_id: Optional[int] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    duration_months: Optional[int] = None
    assigned_admin_id: Optional[int] = None
    assigned_admin_name: Optional[str] = None
    
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
    enrollment_deadline: Optional[datetime.date] = None
    assigned_admin_id: Optional[int] = None
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
        
    if course_in.assigned_admin_id:
        admin = db.query(User).filter(User.id == course_in.assigned_admin_id, User.role == UserRole.admin).first()
        if not admin:
            raise HTTPException(status_code=400, detail="Assigned user must be an Admin")

    new_course = Course(
        name=course_in.name,
        code=course_in.code,
        description=course_in.description,
        duration_months=course_in.duration_months,
        assigned_admin_id=course_in.assigned_admin_id,
        created_by=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    if course_in.assigned_admin_id:
        new_map = AdminCourseMap(
            admin_id=course_in.assigned_admin_id,
            course_id=new_course.id,
            assigned_by=current_user.id
        )
        db.add(new_map)
        db.commit()
    
    log_action(db, current_user.id, "create_course", "course", new_course.id, f"Created course {new_course.code}")
    return new_course

@router.get("/courses")
def get_all_courses(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    courses = db.query(Course).all()
    result = []
    for c in courses:
        admin_name = None
        if c.assigned_admin_id:
            admin = db.query(User).filter(User.id == c.assigned_admin_id).first()
            if admin:
                admin_name = admin.username or admin.email
        
        result.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "duration_months": c.duration_months,
            "assigned_admin_id": c.assigned_admin_id,
            "assigned_admin_name": admin_name
        })
    return result

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

class AdminCreate(BaseModel):
    username: str
    email: str
    password: str

@router.post("/admins", response_model=UserResponse)
def create_admin(
    admin_in: AdminCreate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == admin_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(User).filter(User.username == admin_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
        
    new_admin = User(
        username=admin_in.username,
        email=admin_in.email,
        password_hash=get_password_hash(admin_in.password),
        role=UserRole.admin,
        status=ApprovalStatus.approved,
        reviewed_by=current_user.id,
        reviewed_at=datetime.datetime.utcnow()
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    log_action(db, current_user.id, "create_admin", "user", new_admin.id, f"Created admin {new_admin.email}")
    return new_admin

@router.get("/faculty", response_model=List[UserResponse])
def get_all_faculty(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role.in_([UserRole.faculty, UserRole.admin])).all()

@router.delete("/faculty/{faculty_id}")
def delete_faculty(
    faculty_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    faculty = db.query(User).filter(User.id == faculty_id, User.role.in_([UserRole.faculty, UserRole.admin])).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(faculty)
    db.commit()
    
    log_action(db, current_user.id, "delete_user", "user", faculty_id, f"Deleted {faculty.role.value} {faculty.email}")
    return {"message": "User successfully deleted"}

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
    course = db.query(Course).filter(Course.id == batch_in.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Inherit admin from course, fallback to current super_admin if none assigned
    admin_id_to_use = course.assigned_admin_id if course.assigned_admin_id else current_user.id
        
    if db.query(Batch).filter(Batch.batch_code == batch_in.batch_code).first():
        raise HTTPException(status_code=400, detail="Batch code already exists")
        
    new_batch = Batch(
        course_id=batch_in.course_id,
        name=batch_in.name,
        batch_code=batch_in.batch_code,
        start_date=batch_in.start_date,
        end_date=batch_in.end_date,
        enrollment_deadline=batch_in.enrollment_deadline or batch_in.end_date, # Fallback
        assigned_admin_id=admin_id_to_use,
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

from sqlalchemy import func
from db.models import Session as SessionModel, StudentBatchMap

@router.get("/overview")
def get_superadmin_overview(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.student).scalar()
    total_faculty = db.query(func.count(User.id)).filter(User.role.in_([UserRole.faculty, UserRole.admin])).scalar()
    total_sessions = db.query(func.count(SessionModel.id)).scalar()
    avg_score = db.query(func.avg(SessionModel.overall_score)).scalar()
    
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    sessions_this_week = db.query(func.count(SessionModel.id)).filter(SessionModel.session_date >= seven_days_ago).scalar()
    
    return {
        "total_students": total_students or 0,
        "total_faculty": total_faculty or 0,
        "total_sessions": total_sessions or 0,
        "avg_overall_score": float(avg_score) if avg_score else 0.0,
        "sessions_this_week": sessions_this_week or 0
    }

@router.get("/students")
def get_superadmin_students(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    students = db.query(
        User.id,
        User.username,
        User.email,
        Batch.batch_code.label("batch_name")
    ).outerjoin(
        StudentBatchMap, StudentBatchMap.student_id == User.id
    ).outerjoin(
        Batch, Batch.id == StudentBatchMap.batch_id
    ).filter(
        User.role == UserRole.student
    ).offset(skip).limit(limit).all()
    
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
def get_superadmin_student_sessions(
    student_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == student_id
    ).order_by(SessionModel.session_date.desc()).all()
    return sessions

@router.get("/admins")
def get_superadmin_admins(
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    admins = db.query(User).filter(
        User.role == UserRole.admin,
        User.status == ApprovalStatus.approved
    ).all()
    return admins

@router.put("/courses/{course_id}/admin")
def reassign_course_admin(
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

    course.assigned_admin_id = request.admin_id
    
    new_map = AdminCourseMap(
        admin_id=request.admin_id,
        course_id=course_id,
        assigned_by=current_user.id
    )
    db.add(new_map)
    db.commit()
    
    log_action(db, current_user.id, "reassign_course_admin", "course", course_id, f"Reassigned admin {request.admin_id} to course {course_id}")
    return {"message": "Admin successfully reassigned to course"}

@router.get("/courses/{course_id}")
def get_course_detail(
    course_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    admin = None
    if course.assigned_admin_id:
        admin = db.query(User).filter(User.id == course.assigned_admin_id).first()
        
    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "description": course.description,
        "duration_months": course.duration_months,
        "assigned_admin_id": course.assigned_admin_id,
        "admin_name": admin.username if admin else None,
        "admin_email": admin.email if admin else None
    }

@router.get("/batches/{batch_id}/students")
def get_superadmin_batch_students(
    batch_id: int,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
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


class StudentCreate(BaseModel):
    username: str
    email: str
    password: str

@router.post('/batches/{batch_id}/students')
def add_student_to_batch_superadmin(
    batch_id: int,
    student_in: StudentCreate,
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail='Batch not found')
    
    if db.query(User).filter(User.email == student_in.email).first():
        raise HTTPException(status_code=400, detail='Email already registered')
        
    new_student = User(
        username=student_in.username,
        email=student_in.email,
        password_hash=get_password_hash(student_in.password),
        role=UserRole.student,
        status=ApprovalStatus.approved
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    student_map = StudentBatchMap(student_id=new_student.id, batch_id=batch_id)
    db.add(student_map)
    db.commit()
    
    log_action(db, current_user.id, 'add_student', 'user', new_student.id, f'Super Admin added student to batch {batch_id}')
    return {'message': 'Student successfully added'}

@router.post('/batches/{batch_id}/students/bulk')
async def add_student_to_batch_bulk_superadmin(
    batch_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.super_admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail='Batch not found')
        
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail='Invalid file format. Please upload a valid Excel or CSV file.')
        
    df.columns = df.columns.str.lower().str.strip()
    
    added_count = 0
    errors = []
    
    for index, row in df.iterrows():
        username = str(row.get('username') or row.get('name', '')).strip()
        email = str(row.get('email', '')).strip()
        password = str(row.get('password') or row.get('temporary password', '')).strip()
        
        if not email or email == 'nan' or not username or username == 'nan':
            continue
            
        if db.query(User).filter(User.email == email).first():
            errors.append(f'{email} (Already exists)')
            continue
            
        new_student = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.student,
            status=ApprovalStatus.approved
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        
        new_map = StudentBatchMap(student_id=new_student.id, batch_id=batch_id)
        db.add(new_map)
        db.commit()
        added_count += 1
        
    return {'message': f'Successfully added {added_count} students.', 'errors': errors}
