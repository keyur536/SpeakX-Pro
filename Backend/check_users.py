
from db.session import SessionLocal
from db.models import User
db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f'User: {u.username}, Email: {u.email}, Role: {u.role.value}')

