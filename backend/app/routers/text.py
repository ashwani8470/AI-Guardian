import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.services.text_classifier import predict_text as run_text_prediction
from app.db.database import get_db
from app.db.models import Scan, ThreatReport, User
from app.routers.auth import get_current_user
from app.schemas import ScanResponse, TextScanRequest

router = APIRouter(prefix="/predict/text", tags=["text"])


@router.post("", response_model=ScanResponse)
def predict_text_route(
    payload: TextScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    prediction = run_text_prediction(content=payload.content)

    scan_id = str(uuid.uuid4())

    scan = Scan(
        id=scan_id,
        user_id=current_user.id,
        modality="text",
        risk_score=prediction["risk_score"],
        risk_tier=prediction["risk_tier"],
        confidence=prediction["confidence"],
        extracted_text=payload.content,
    )
    db.add(scan)

    reason_reports = []
    for rc in prediction["reason_codes"]:
        report = ThreatReport(scan_id=scan.id, label=rc["label"], weight=rc["weight"], detail=rc["detail"])
        db.add(report)
        reason_reports.append(report)

    db.commit()

    return ScanResponse(
        scan_id=scan_id,
        modality="text",
        risk_score=prediction["risk_score"],
        risk_tier=prediction["risk_tier"],
        confidence=prediction["confidence"],
        extracted_text=payload.content,
        reason_codes=prediction["reason_codes"],
    )
