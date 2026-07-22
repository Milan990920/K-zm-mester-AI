import enum


class UtilityType(str, enum.Enum):
    ELECTRICITY = "electricity"
    GAS = "gas"
    WATER = "water"
    SEWAGE = "sewage"
    DISTRICT_HEATING = "district_heating"
    WASTE = "waste"


class InvoiceType(str, enum.Enum):
    COMMERCIAL = "commercial"
    NETWORK_USAGE_FEE = "network_usage_fee"
    CAPACITY_FEE = "capacity_fee"
    PARTIAL = "partial"
    SETTLEMENT = "settlement"
    STORNO = "storno"
    CORRECTION = "correction"


class DeliveryFormat(str, enum.Enum):
    ELECTRONIC = "electronic"
    SCANNED_PAPER = "scanned_paper"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class ProcessingStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class ValidationStatus(str, enum.Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    NEEDS_REVIEW = "needs_review"


class SubscriptionPlan(str, enum.Enum):
    TRIAL = "trial"
    STANDARD = "standard"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class RoleCode(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    PARTNER = "partner"
    CUSTOMER_ADMIN = "customer_admin"
    CUSTOMER_USER = "customer_user"


class MeterType(str, enum.Enum):
    ELECTRICITY = "electricity"
    GAS = "gas"
    WATER = "water"
    HEAT = "heat"


class ReadingType(str, enum.Enum):
    START = "start"
    END = "end"


class ReadingMethod(str, enum.Enum):
    ACTUAL = "actual"
    ESTIMATED = "estimated"


class PipelineStage(str, enum.Enum):
    TEXT_EXTRACTION = "text_extraction"
    OCR = "ocr"
    DOC_TYPE_CLASSIFICATION = "doc_type_classification"
    PROVIDER_CLASSIFICATION = "provider_classification"
    INVOICE_TYPE_CLASSIFICATION = "invoice_type_classification"
    PARSING = "parsing"
    AI_STRUCTURING = "ai_structuring"
    VALIDATION = "validation"
    REPROCESSING = "reprocessing"


class RunStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"


class IssueSeverity(str, enum.Enum):
    WARNING = "warning"
    ERROR = "error"
