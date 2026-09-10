
import os

super_admin_path = r'c:\Users\DELL\Desktop\Projects\Video Analyzer\Backend\api\routes\super_admin.py'
admin_path = r'c:\Users\DELL\Desktop\Projects\Video Analyzer\Backend\api\routes\admin.py'

# 1. Update super_admin.py
with open(super_admin_path, 'r') as f:
    sa_content = f.read()

import_statement = '''from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import pandas as pd
import io
'''
sa_content = sa_content.replace('from fastapi import APIRouter, Depends, HTTPException', import_statement)

bulk_sa_route = '''
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
'''

if 'students/bulk' not in sa_content:
    sa_content += bulk_sa_route
    with open(super_admin_path, 'w') as f:
        f.write(sa_content)

# 2. Update admin.py
with open(admin_path, 'r') as f:
    admin_content = f.read()

admin_content = admin_content.replace('from fastapi import APIRouter, Depends, HTTPException', import_statement)

bulk_admin_route = '''
@router.post('/batches/{batch_id}/students/bulk')
async def add_student_to_batch_bulk_admin(
    batch_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.admin])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter_by(id=batch_id).first()
    check_admin_batch_access(db, current_user.id, batch)
        
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
'''

if 'students/bulk' not in admin_content:
    admin_content += bulk_admin_route
    with open(admin_path, 'w') as f:
        f.write(admin_content)

print('Backend routes patched successfully!')

