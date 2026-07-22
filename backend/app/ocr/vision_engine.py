"""Primary OCR engine (docs/03-architektura-terv.md §3.2): Google Cloud
Vision, chosen for its Hungarian-language accuracy over Tesseract.
"""

from google.cloud import vision

from app.ocr.base import OcrResult

ENGINE_NAME = "google_cloud_vision"


class GoogleVisionOcrEngine:
    def __init__(self) -> None:
        self._client = vision.ImageAnnotatorClient()

    def extract_text(self, pdf_bytes: bytes) -> OcrResult:
        input_config = vision.InputConfig(content=pdf_bytes, mime_type="application/pdf")
        feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
        request = vision.AnnotateFileRequest(input_config=input_config, features=[feature])

        response = self._client.batch_annotate_files(requests=[request])
        page_texts = [
            image_response.full_text_annotation.text
            for file_response in response.responses
            for image_response in file_response.responses
        ]
        return OcrResult(text="\n".join(page_texts), engine_name=ENGINE_NAME)
