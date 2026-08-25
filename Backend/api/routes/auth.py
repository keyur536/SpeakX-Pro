from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.session import get_db
from db.models import User, UserRole, ApprovalStatus, Batch, StudentBatchMap
from core.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from api.deps import get_current_active_user, require_role
from core.limiter import limiter

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    
    class Config:
        from_attributes = True

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # Authenticate user
    user = db.query(User).filter(User.email == form_data.username).first() # frontend uses email as username field
    
    if not user and "@" not in form_data.username:
        # Fallback to username just in case
        user = db.query(User).filter(User.username == form_data.username).first()
        
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    if user.status != ApprovalStatus.approved:
        raise HTTPException(status_code=403, detail=user.status.value)

    # Generate JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role.value
    }

class StudentCreate(BaseModel):
    username: str
    email: str
    password: str
    batch_code: str

@router.post("/register/student", response_model=UserResponse)
@limiter.limit("3/minute")
def register_student(request: Request, user_in: StudentCreate, db: Session = Depends(get_db)):
    from datetime import date
    
    # Verify the batch exists by code
    batch = db.query(Batch).filter(Batch.batch_code == user_in.batch_code).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found. Please provide a valid batch code.")

    # Check enrollment deadline
    if batch.enrollment_deadline and batch.enrollment_deadline < date.today():
        raise HTTPException(status_code=400, detail="Enrollment closed. The deadline for this batch has passed.")

    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.student,
        status=ApprovalStatus.approved # Auto approve student since they have valid batch code
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Insert mapping
    student_map = StudentBatchMap(
        student_id=new_user.id,
        batch_id=batch.id
    )
    db.add(student_map)
    db.commit()
    
    return new_user

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Returns the currently logged-in user.
    """
    return current_user

@router.get("/admin-only", response_model=dict)
def test_admin_route(current_user: User = Depends(require_role([UserRole.admin, UserRole.super_admin]))):
    """
    Test route to verify RBAC is working. Only admins can hit this.
    """
    return {"message": f"Welcome Admin {current_user.username}!"}
