"""Pipeline orchestrator (docs/03-architektura-terv.md, full §3).

Wires together the stages in order and owns the retry-on-validation-failure
loop (§3.9). Each stage's outcome is recorded as a `StageRun` so callers can
persist it 1:1 into the `processing_runs` table for full auditability.
"""

from dataclasses import dataclass, field

from app.ai.schemas import ExtractedInvoiceData
from app.ai.structuring_client import AiStructuringClient
from app.classification.document_analysis import extract_text_layer
from app.classification.invoice_type_classifier import suggest_invoice_types
from app.classification.provider_classifier import classify_provider_by_text
from app.models.enums import PipelineStage, ProcessingStatus, RunStatus
from app.models.provider import Provider
from app.ocr.base import OcrEngine
from app.parsers.registry import get_parser
from app.validation.engine import resulting_status, validate
from app.validation.rules import ValidationFinding

DEFAULT_MAX_ATTEMPTS = 3


@dataclass
class StageRun:
    stage: PipelineStage
    status: RunStatus
    attempt_number: int
    detail: str | None = None


@dataclass
class PipelineResult:
    extracted_data: ExtractedInvoiceData | None
    validation_findings: list[ValidationFinding]
    processing_status: ProcessingStatus
    attempts_used: int
    is_digital: bool
    page_count: int
    document_text: str
    document_text_engine: str
    matched_provider: Provider | None = None
    stage_runs: list[StageRun] = field(default_factory=list)


class PipelineOrchestrator:
    def __init__(
        self,
        ocr_engine: OcrEngine,
        ai_client: AiStructuringClient,
        known_providers: list[Provider],
        max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    ) -> None:
        self._ocr_engine = ocr_engine
        self._ai_client = ai_client
        self._known_providers = known_providers
        self._max_attempts = max_attempts

    def process(self, pdf_bytes: bytes) -> PipelineResult:
        stage_runs: list[StageRun] = []

        text_result = extract_text_layer(pdf_bytes)
        if text_result.is_digital:
            text = text_result.extracted_text
            text_engine = "native_text"
            stage_runs.append(
                StageRun(PipelineStage.TEXT_EXTRACTION, RunStatus.SUCCESS, attempt_number=1)
            )
        else:
            ocr_result = self._ocr_engine.extract_text(pdf_bytes)
            text = ocr_result.text
            text_engine = ocr_result.engine_name
            stage_runs.append(
                StageRun(
                    PipelineStage.OCR, RunStatus.SUCCESS, attempt_number=1, detail=ocr_result.engine_name
                )
            )

        provider_match = classify_provider_by_text(text, self._known_providers)
        stage_runs.append(
            StageRun(
                PipelineStage.PROVIDER_CLASSIFICATION,
                RunStatus.SUCCESS,
                attempt_number=1,
                detail=provider_match.provider.name if provider_match else None,
            )
        )

        invoice_type_hints = suggest_invoice_types(text)
        stage_runs.append(
            StageRun(PipelineStage.INVOICE_TYPE_CLASSIFICATION, RunStatus.SUCCESS, attempt_number=1)
        )

        parser = get_parser(provider_match.provider.parser_key if provider_match else None)
        parsed_document = parser.parse(text)
        stage_runs.append(
            StageRun(PipelineStage.PARSING, RunStatus.SUCCESS, attempt_number=1, detail=parser.parser_key)
        )

        labelled_text = "\n\n".join(
            f"[{segment.label.upper()}]\n{segment.text}" for segment in parsed_document.segments
        )

        return self._structure_and_validate_with_retries(
            parsed_document_text=labelled_text,
            provider_hint=provider_match.provider.name if provider_match else None,
            invoice_type_hints=[hint.value for hint in invoice_type_hints],
            stage_runs=stage_runs,
            is_digital=text_result.is_digital,
            page_count=text_result.page_count,
            document_text=text,
            document_text_engine=text_engine,
            matched_provider=provider_match.provider if provider_match else None,
        )

    def _structure_and_validate_with_retries(
        self,
        parsed_document_text: str,
        provider_hint: str | None,
        invoice_type_hints: list[str],
        stage_runs: list[StageRun],
        is_digital: bool,
        page_count: int,
        document_text: str,
        document_text_engine: str,
        matched_provider: Provider | None,
    ) -> PipelineResult:
        last_findings: list[ValidationFinding] = []
        last_data: ExtractedInvoiceData | None = None

        for attempt in range(1, self._max_attempts + 1):
            try:
                data = self._ai_client.structure_invoice(
                    parsed_document_text, provider_hint, invoice_type_hints
                )
            except Exception as exc:  # noqa: BLE001 — any AI-side failure triggers a retry
                stage_runs.append(
                    StageRun(PipelineStage.AI_STRUCTURING, RunStatus.FAILED, attempt, detail=str(exc))
                )
                continue

            stage_runs.append(StageRun(PipelineStage.AI_STRUCTURING, RunStatus.SUCCESS, attempt))
            last_data = data

            findings = validate(data)
            status = resulting_status(findings)
            stage_runs.append(
                StageRun(
                    PipelineStage.VALIDATION,
                    RunStatus.SUCCESS if status.value == "valid" else RunStatus.FAILED,
                    attempt,
                    detail=f"{len(findings)} finding(s)",
                )
            )
            last_findings = findings

            if status.value == "valid":
                return PipelineResult(
                    extracted_data=data,
                    validation_findings=findings,
                    processing_status=ProcessingStatus.DONE,
                    attempts_used=attempt,
                    is_digital=is_digital,
                    page_count=page_count,
                    document_text=document_text,
                    document_text_engine=document_text_engine,
                    matched_provider=matched_provider,
                    stage_runs=stage_runs,
                )

            if attempt < self._max_attempts:
                stage_runs.append(StageRun(PipelineStage.REPROCESSING, RunStatus.SUCCESS, attempt))

        return PipelineResult(
            extracted_data=last_data,
            validation_findings=last_findings,
            processing_status=ProcessingStatus.NEEDS_REVIEW,
            attempts_used=self._max_attempts,
            is_digital=is_digital,
            page_count=page_count,
            document_text=document_text,
            document_text_engine=document_text_engine,
            matched_provider=matched_provider,
            stage_runs=stage_runs,
        )
