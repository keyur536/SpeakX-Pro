import sys
import os
# Add the project root to python path so we can import ml_pipeline
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api.routes import auth, sessions, chat, super_admin, admin, notifications, attendance, certificates
from core.limiter import limiter

app = FastAPI(
    title="SpeakX-Pro Enterprise API",
    description="Backend API for Public Speaking Analyzer",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS Configuration for the React Frontend
origins = [
    "http://localhost:5173",     # Vite Default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["Sessions"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(super_admin.router, prefix="/api/v1/super-admin", tags=["Super Admin"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(certificates.router, prefix="/api/v1/certificates", tags=["Certificates"])
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "message": "API is running."}
