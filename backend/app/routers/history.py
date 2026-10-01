import csv
import io

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Scan, ThreatReport, User
from app.routers.auth import get_current_user
from app.schemas import MessageResponse, ReasonCode, ScanHistoryItem

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


def _csv_safe(value) -> str:
    """
    Scanned content is untrusted (it's usually a scam message). A cell that starts
    with = + - @ would be run as a formula when the CSV is opened in Excel, so we
    prefix such cells with an apostrophe to keep them as plain text.
    """
    text = "" if value is None else str(value)
    if text[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


@router.get("/export")
def export_scan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Download the logged-in user's scan history as a CSV file."""
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["scan_id", "date_utc", "type", "risk_score", "risk_tier", "confidence", "scanned_content", "reasons"]
    )
    for scan in scans:
        reasons = " | ".join(r.detail or r.label for r in scan.reports)
        writer.writerow(
            [
                scan.id,
                scan.created_at.strftime("%Y-%m-%d %H:%M:%S") if scan.created_at else "",
                scan.modality,
                scan.risk_score,
                scan.risk_tier,
                round(scan.confidence, 3),
                _csv_safe(scan.extracted_text),
                _csv_safe(reasons),
            ]
        )

    # utf-8 BOM so Excel shows non-English text (e.g. Hindi) correctly.
    body = "\ufeff" + buffer.getvalue()
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="ai-guardian-history.csv"'},
    )


@router.delete("", response_model=MessageResponse)
def delete_scan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Permanently delete every scan (and its reason codes) belonging to the logged-in user."""
    scan_ids = [row[0] for row in db.query(Scan.id).filter(Scan.user_id == current_user.id).all()]
    if scan_ids:
        db.query(ThreatReport).filter(ThreatReport.scan_id.in_(scan_ids)).delete(synchronize_session=False)
        db.query(Scan).filter(Scan.id.in_(scan_ids)).delete(synchronize_session=False)
    db.commit()
    return MessageResponse(message=f"Deleted {len(scan_ids)} scan(s).")
