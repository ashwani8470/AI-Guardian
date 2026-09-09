from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Scan, User
from app.routers.auth import get_current_user
from app.schemas import ReasonCode, ScanHistoryItem

router = APIRouter(prefix="/scans", tags=["history"])


@router.get("", response_model=list[ScanHistoryItem])
def get_scan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScanHistoryItem]:
    """Returns the logged-in user's past scans, most recent first."""
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )

    return [
        ScanHistoryItem(
            scan_id=scan.id,
            modality=scan.modality,
            risk_score=scan.risk_score,
            risk_tier=scan.risk_tier,
            reason_codes=[
                ReasonCode(label=r.label, weight=r.weight, detail=r.detail) for r in scan.reports
            ],
            extracted_text=scan.extracted_text,
            confidence=scan.confidence,
            created_at=scan.created_at,
        )
        for scan in scans
    ]
