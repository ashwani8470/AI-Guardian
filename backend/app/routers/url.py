from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Scan, ThreatReport, User
from app.routers.auth import get_current_user
from app.schemas import ScanResponse, UrlScanRequest
# Aliased on import - the route handler below is also named predict_url,
# same name-collision bug you hit and fixed while wiring text.py.
from app.services.url_classifier import predict_url as classify_url

router = APIRouter(prefix="/predict/url", tags=["url"])


@router.post("", response_model=ScanResponse)
def predict_url(
    payload: UrlScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    """
    TODO: expand shortened URLs + check link reputation (Sparsh's
    preprocessing) before passing to the classifier.
    """
    result = classify_url(payload.url)

    scan = Scan(
        id=result.scan_id,
        user_id=current_user.id,
        modality=result.modality,
        risk_score=result.risk_score,
        risk_tier=result.risk_tier.value,
        confidence=result.confidence,
        extracted_text=result.extracted_text,
    )
    db.add(scan)
    for rc in result.reason_codes:
        db.add(ThreatReport(scan_id=scan.id, label=rc.label, weight=rc.weight, detail=rc.detail))
    db.commit()

    return result