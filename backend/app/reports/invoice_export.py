"""Excel/CSV export for the invoice list (docs/01-rendszerterv.md §8).

Column set and order are shared between both formats so the two exports
never drift apart — only the serialization differs.
"""

import csv
import enum
import io

from openpyxl import Workbook

from app.models.invoice import Invoice

COLUMNS: list[tuple[str, str]] = [
    ("invoice_number", "Számlaszám"),
    ("utility_type", "Közmű"),
    ("invoice_type", "Számlatípus"),
    ("invoice_date", "Számla kelte"),
    ("due_date", "Fizetési határidő"),
    ("billing_period_start", "Elszámolási időszak kezdete"),
    ("billing_period_end", "Elszámolási időszak vége"),
    ("pod", "POD"),
    ("net_amount", "Nettó összeg"),
    ("vat_amount", "ÁFA"),
    ("gross_amount", "Bruttó összeg"),
    ("currency", "Pénznem"),
    ("validation_status", "Validációs állapot"),
]


def _row_values(invoice: Invoice) -> list:
    values = []
    for field, _ in COLUMNS:
        value = getattr(invoice, field)
        if isinstance(value, enum.Enum):
            value = value.value
        values.append(value if value is not None else "")
    return values


def invoices_to_csv(invoices: list[Invoice]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _, label in COLUMNS])
    for invoice in invoices:
        writer.writerow(_row_values(invoice))
    return buffer.getvalue().encode("utf-8-sig")  # BOM so Excel detects UTF-8 correctly


def invoices_to_xlsx(invoices: list[Invoice]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Számlák"
    sheet.append([label for _, label in COLUMNS])
    for invoice in invoices:
        sheet.append(_row_values(invoice))

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
