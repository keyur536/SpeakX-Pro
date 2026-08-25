import os
import tempfile
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import User, Batch, Course, BatchStatus, StudentBatchMap
from api.deps import get_current_active_user
from core.certificate import generate_certificate

router = APIRouter()

@router.get("/batch/{batch_id}/download")
def download_certificate(
    batch_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify student is in this batch
    mapping = db.query(StudentBatchMap).filter_by(student_id=current_user.id, batch_id=batch_id).first()
    if not mapping:
        raise HTTPException(status_code=403, detail="You are not enrolled in this batch.")
        
    # Verify batch is completed
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")
        
    if batch.status != BatchStatus.completed:
        raise HTTPException(status_code=400, detail="Certificates are only available for completed batches.")
        
    course = db.query(Course).filter(Course.id == batch.course_id).first()
    
    # Generate PDF in a temporary directory
    temp_dir = tempfile.mkdtemp()
    file_name = f"Certificate_{current_user.username.replace(' ', '_')}_{batch.batch_code}.pdf"
    file_path = os.path.join(temp_dir, file_name)
    
    generate_certificate(
        student_name=current_user.username,
        course_name=course.name,
        batch_code=batch.batch_code,
        issue_date=date.today().strftime("%B %d, %Y"),
        output_path=file_path
    )
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/pdf",
        background=None # File cleanup handled by OS temp dir eventually, or can use background task
    )
