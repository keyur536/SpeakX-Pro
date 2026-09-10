
from db.session import SessionLocal
from db.models import User
from core.security import get_password_hash
db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()
if admin:
    admin.password_hash = get_password_hash('admin123')
    db.commit()
    print('Password reset for admin to admin123')
student = db.query(User).filter(User.username == 'student1').first()
if student:
    student.password_hash = get_password_hash('student123')
    db.commit()
    print('Password reset for student1 to student123')

