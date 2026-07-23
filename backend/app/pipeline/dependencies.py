"""Constructs a `PipelineOrchestrator` wired to the real OCR/AI
implementations. Kept separate from `orchestrator.py` so tests can build an
orchestrator with fakes without needing this factory at all.
"""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.structuring_client import AnthropicAiStructuringClient
from app.api.deps import get_tenant_db
from app.core.config import get_settings
from app.models.provider import Provider
from app.ocr.base import OcrEngine
from app.pipeline.orchestrator import PipelineOrchestrator


def _select_ocr_engine() -> OcrEngine:
    if get_settings().google_application_credentials:
        from app.ocr.vision_engine import GoogleVisionOcrEngine

        return GoogleVisionOcrEngine()

    from app.ocr.tesseract_engine import TesseractOcrEngine

    return TesseractOcrEngine()


def build_pipeline_orchestrator(db: Session) -> PipelineOrchestrator:
    known_providers = list(db.scalars(select(Provider).where(Provider.is_active.is_(True))))
    return PipelineOrchestrator(
        ocr_engine=_select_ocr_engine(),
        ai_client=AnthropicAiStructuringClient(),
        known_providers=known_providers,
    )


def get_pipeline_orchestrator(db: Session = Depends(get_tenant_db)) -> PipelineOrchestrator:
    """FastAPI dependency wrapper — tests override this directly to inject a
    fake AI/OCR-backed orchestrator without touching the real ones.
    """
    return build_pipeline_orchestrator(db)
