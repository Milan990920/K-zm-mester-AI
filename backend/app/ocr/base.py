from dataclasses import dataclass
from typing import Protocol


@dataclass
class OcrResult:
    text: str
    engine_name: str


class OcrEngine(Protocol):
    def extract_text(self, pdf_bytes: bytes) -> OcrResult: ...
