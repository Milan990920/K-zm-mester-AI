"""Ties the upload API to the pipeline and persists its result
(docs/03-architektura-terv.md §3.10). This is the one place that maps
`ExtractedInvoiceData` (the AI structuring output shape) onto the DB models.
"""

import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.consumption_point import ConsumptionPoint
from app.models.document import Document
from app.models.enums import DocumentStatus, PipelineStage, RunStatus, ValidationStatus
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.invoice_site import InvoiceSite
from app.models.processing_run import ProcessingRun
from app.models.validation_issue import ValidationIssue
from app.pipeline.orchestrator import PipelineOrchestrator
from app.storage.base import StorageBackend
from app.validation.rules import ValidationFinding


def compute_content_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def find_existing_document(db: Session, tenant_id: uuid.UUID, content_hash: str) -> Document | None:
    return db.scalar(
        select(Document).where(
            Document.tenant_id == tenant_id, Document.content_hash == content_hash
        )
    )


def process_uploaded_document(
    db: Session,
    storage: StorageBackend,
    orchestrator: PipelineOrchestrator,
    tenant_id: uuid.UUID,
    uploaded_by_user_id: uuid.UUID,
    original_filename: str,
    content: bytes,
) -> Document:
    """Idempotent: re-uploading the same bytes for the same tenant returns the
    already-processed document instead of running the pipeline again — this
    is the content-hash cache described in docs/03-architektura-terv.md §4.
    """
    content_hash = compute_content_hash(content)

    existing = find_existing_document(db, tenant_id, content_hash)
    if existing is not None:
        return existing

    storage_path = f"tenants/{tenant_id}/documents/{content_hash}.pdf"
    storage.save(storage_path, content)

    document = Document(
        tenant_id=tenant_id,
        uploaded_by_user_id=uploaded_by_user_id,
        original_filename=original_filename,
        gcs_path=storage_path,
        content_hash=content_hash,
        file_size_bytes=len(content),
        status=DocumentStatus.PROCESSING,
    )
    db.add(document)
    db.flush()

    result = orchestrator.process(content)

    document.is_digital = result.is_digital
    document.page_count = result.page_count
    document.ocr_text = result.document_text
    document.ocr_engine = result.document_text_engine
    document.status = (
        DocumentStatus.DONE
        if result.processing_status.value == "done"
        else DocumentStatus.NEEDS_REVIEW
    )

    processing_runs = [
        ProcessingRun(
            tenant_id=tenant_id,
            document_id=document.id,
            attempt_number=stage_run.attempt_number,
            pipeline_stage=stage_run.stage,
            status=stage_run.status,
            error_message=stage_run.detail if stage_run.status == RunStatus.FAILED else None,
        )
        for stage_run in result.stage_runs
    ]
    db.add_all(processing_runs)
    db.flush()

    last_validation_run = next(
        (
            run
            for run, stage_run in zip(
                reversed(processing_runs), reversed(result.stage_runs), strict=True
            )
            if stage_run.stage == PipelineStage.VALIDATION
        ),
        None,
    )

    invoice: Invoice | None = None
    if result.extracted_data is not None:
        data = result.extracted_data
        consumption_point = _find_consumption_point_by_pod(db, tenant_id, data.pod)

        invoice = Invoice(
            tenant_id=tenant_id,
            document_id=document.id,
            provider_id=result.matched_provider.id if result.matched_provider else None,
            consumption_point_id=consumption_point.id if consumption_point else None,
            utility_type=data.utility_type,
            secondary_utility_types=data.secondary_utility_types,
            invoice_type=data.invoice_type,
            delivery_format=data.delivery_format,
            invoice_number=data.invoice_number,
            invoice_date=data.invoice_date,
            performance_date=data.performance_date,
            due_date=data.due_date,
            billing_period_start=data.billing_period_start,
            billing_period_end=data.billing_period_end,
            pod=data.pod,
            poc=data.poc,
            metering_point=data.metering_point,
            heating_center_id=data.heating_center_id,
            meter_serial_number=data.meter_serial_number,
            contract_number=data.contract_number,
            current_account_number=data.current_account_number,
            partner_code=data.partner_code,
            customer_reference=data.customer_reference,
            net_amount=data.net_amount,
            vat_amount=data.vat_amount,
            gross_amount=data.gross_amount,
            amount_due=data.amount_due,
            currency=data.currency,
            meter_reading_start=data.meter_reading_start,
            meter_reading_end=data.meter_reading_end,
            consumption_value=data.consumption_value,
            consumption_unit=data.consumption_unit,
            reactive_energy_value=data.reactive_energy_value,
            contracted_capacity_kw=data.contracted_capacity_kw,
            measured_max_capacity_kw=data.measured_max_capacity_kw,
            validation_status=resulting_validation_status(result.validation_findings),
            processing_status=result.processing_status,
            raw_ai_json=data.model_dump(mode="json"),
        )
        db.add(invoice)
        db.flush()

        for run in processing_runs:
            run.invoice_id = invoice.id

        for line_number, item in enumerate(data.line_items, start=1):
            db.add(
                InvoiceLineItem(
                    tenant_id=tenant_id,
                    invoice_id=invoice.id,
                    line_number=line_number,
                    description=item.description,
                    quantity=item.quantity,
                    unit=item.unit,
                    unit_net_price=item.unit_net_price,
                    net_value=item.net_value,
                    vat_rate=item.vat_rate,
                    vat_value=item.vat_value,
                    gross_value=item.gross_value,
                )
            )

        for finding in result.validation_findings:
            db.add(
                _validation_issue_from_finding(tenant_id, invoice.id, last_validation_run.id, finding)
            )

        for site in data.sites:
            db.add(
                InvoiceSite(
                    tenant_id=tenant_id,
                    invoice_id=invoice.id,
                    site_address=site.site_address,
                    site_identifier=site.site_identifier,
                    meter_serial_number=site.meter_serial_number,
                    consumption_value=site.consumption_value,
                    consumption_unit=site.consumption_unit,
                    gross_amount=site.gross_amount,
                )
            )

    db.commit()
    db.refresh(document)
    return document


def resulting_validation_status(findings: list[ValidationFinding]) -> ValidationStatus:
    if any(f.severity.value == "error" for f in findings):
        return ValidationStatus.INVALID
    return ValidationStatus.VALID


def _validation_issue_from_finding(
    tenant_id: uuid.UUID,
    invoice_id: uuid.UUID,
    processing_run_id: uuid.UUID,
    finding: ValidationFinding,
) -> ValidationIssue:
    return ValidationIssue(
        tenant_id=tenant_id,
        invoice_id=invoice_id,
        processing_run_id=processing_run_id,
        rule_code=finding.rule_code,
        severity=finding.severity,
        message=finding.message,
        field_name=finding.field_name,
    )


def _find_consumption_point_by_pod(db: Session, tenant_id: uuid.UUID, pod: str | None):
    if not pod:
        return None
    return db.scalar(
        select(ConsumptionPoint).where(
            ConsumptionPoint.tenant_id == tenant_id, ConsumptionPoint.pod == pod
        )
    )
