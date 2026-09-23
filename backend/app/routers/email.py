import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Scan, ThreatReport, User
from app.routers.auth import get_current_user
from app.schemas import EmailScanRequest, ReasonCode, ScanResponse
from app.services.email_classifier import predict_email
from app.utils import tier_from_score

router = APIRouter(prefix="/predict/email", tags=["email"])


@router.post("", response_model=ScanResponse)
def predict_email_route(
    payload: EmailScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    prediction = predict_email(subject=payload.subject, body=payload.body)

    result = ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="email",
        risk_score=prediction["risk_score"],
        risk_tier=tier_from_score(prediction["risk_score"]),
        reason_codes=[ReasonCode(**rc) for rc in prediction["reason_codes"]],
        extracted_text=prediction["extracted_text"],
        confidence=prediction["confidence"],
    )

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
