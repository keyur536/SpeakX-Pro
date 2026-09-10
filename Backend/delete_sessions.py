
import sys

backend_path = r'c:\Users\DELL\Desktop\Projects\Video Analyzer\Backend'
sys.path.insert(0, backend_path)

from db.session import SessionLocal
from db.models import SessionEmbedding

db = SessionLocal()
try:
    num_deleted = db.query(SessionEmbedding).delete()
    db.commit()
    print(f'Successfully deleted {num_deleted} embeddings.')
except Exception as e:
    db.rollback()
    print(f'Error: {e}')
finally:
    db.close()

