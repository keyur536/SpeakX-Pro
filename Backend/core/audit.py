from sqlalchemy.orm import Session
from db.models import AuditLog

def log_action(db: Session, actor_id: int, action: str, target_type: str, target_id: int = None, details: str = ""):
    """
    Records an action performed by an admin or super admin to the audit_log table.
    """
    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details
    )
    db.add(log_entry)
    db.commit()
