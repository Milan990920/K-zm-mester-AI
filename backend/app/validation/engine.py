from app.ai.schemas import ExtractedInvoiceData
from app.models.enums import IssueSeverity, ValidationStatus
from app.validation.rules import ALL_RULES, ValidationFinding


def validate(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    findings: list[ValidationFinding] = []
    for rule in ALL_RULES:
        findings.extend(rule(data))
    return findings


def resulting_status(findings: list[ValidationFinding]) -> ValidationStatus:
    if any(f.severity == IssueSeverity.ERROR for f in findings):
        return ValidationStatus.INVALID
    return ValidationStatus.VALID
