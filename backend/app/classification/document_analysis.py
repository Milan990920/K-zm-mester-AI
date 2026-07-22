"""Deterministic, non-AI PDF analysis: text-layer extraction and the
digital-vs-scanned decision described in docs/03-architektura-terv.md §3.1.
"""

import io
from dataclasses import dataclass

from pypdf import PdfReader

# Below this average number of extractable characters per page, we treat the
# PDF as having no usable text layer (i.e. it is a scanned/rasterized document).
MIN_CHARS_PER_PAGE_FOR_DIGITAL = 20


@dataclass
class TextExtractionResult:
    is_digital: bool
    page_count: int
    extracted_text: str


def extract_text_layer(pdf_bytes: bytes) -> TextExtractionResult:
    reader = PdfReader(io.BytesIO(pdf_bytes))

    page_texts = [page.extract_text() or "" for page in reader.pages]
    extracted_text = "\n".join(page_texts)
    page_count = len(reader.pages)

    avg_chars_per_page = len(extracted_text.strip()) / page_count if page_count else 0
    is_digital = avg_chars_per_page >= MIN_CHARS_PER_PAGE_FOR_DIGITAL

    return TextExtractionResult(
        is_digital=is_digital,
        page_count=page_count,
        extracted_text=extracted_text,
    )
