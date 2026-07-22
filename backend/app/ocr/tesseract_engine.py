"""Fallback OCR engine (docs/03-architektura-terv.md §3.2) for environments
without Google Cloud Vision credentials configured — e.g. local/self-hosted
development. Renders each PDF page to an image, then OCRs it with Tesseract.
"""

import pytesseract
from pdf2image import convert_from_bytes

from app.ocr.base import OcrResult

ENGINE_NAME = "tesseract_v5"


class TesseractOcrEngine:
    def __init__(self, language: str = "hun") -> None:
        self._language = language

    def extract_text(self, pdf_bytes: bytes) -> OcrResult:
        pages = convert_from_bytes(pdf_bytes)
        page_texts = [pytesseract.image_to_string(page, lang=self._language) for page in pages]
        return OcrResult(text="\n".join(page_texts), engine_name=ENGINE_NAME)
