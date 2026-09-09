from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Scan, ThreatReport, User
from app.routers.auth import get_current_user
from app.schemas import QrScanRequest, ScanResponse
from app.utils import dummy_response

router = APIRouter(prefix="/predict/qr", tags=["qr"])


@router.post("", response_model=ScanResponse)
def predict_qr(
    payload: QrScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    """
    TODO pipeline: decode QR (Sparsh's CV module) -> extract embedded URL
    -> run through the URL classifier -> return combined result.
    """
    result = dummy_response(modality="qr", extracted_text="[decoded QR content placeholder]")

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
