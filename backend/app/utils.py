import uuid

from app.schemas import ReasonCode, RiskTier, ScanResponse


def tier_from_score(score: int) -> RiskTier:
    if score <= 30:
        return RiskTier.SAFE
    if score <= 70:
        return RiskTier.SUSPICIOUS
    return RiskTier.DANGEROUS


def dummy_response(modality: str, extracted_text: str | None = None) -> ScanResponse:
    """
    Placeholder response so downstream teams (Android app, dashboard) can
    integrate now. Replace the hardcoded score/reason_codes with real calls
    into Sparsh's CV/OCR pipeline and the NLP/XAI teammate's model once
    they're ready.
    """
    score = 42  # fixed dummy value for now
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality=modality,
        risk_score=score,
        risk_tier=tier_from_score(score),
        reason_codes=[
            ReasonCode(label="Placeholder reason — model not yet wired in", weight=1.0)
        ],
        extracted_text=extracted_text,
        confidence=0.5,
    )
