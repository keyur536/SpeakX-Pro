
from db.session import SessionLocal
from db.models import User, UserRole

def delete_all_students():
    db = SessionLocal()
    try:
        students = db.query(User).filter(User.role == UserRole.student).all()
        count = len(students)
        for student in students:
            db.delete(student)
        db.commit()
        print(f'Successfully deleted {count} student(s) and all their cascaded data.')
    except Exception as e:
        db.rollback()
        print(f'Error: {e}')
    finally:
        db.close()

if __name__ == '__main__':
    delete_all_students()

