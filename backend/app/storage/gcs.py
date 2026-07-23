"""Google Cloud Storage backend (docs/03-architektura-terv.md §7) — the
production storage for original PDFs, under a per-tenant path prefix
(docs/01-rendszerterv.md §7).
"""

from google.cloud import storage

from app.core.config import get_settings


class GcsStorage:
    def __init__(self, bucket_name: str | None = None) -> None:
        client = storage.Client()
        self._bucket = client.bucket(bucket_name or get_settings().gcs_bucket_name)

    def save(self, path: str, content: bytes) -> None:
        self._bucket.blob(path).upload_from_string(content)

    def read(self, path: str) -> bytes:
        return self._bucket.blob(path).download_as_bytes()

    def exists(self, path: str) -> bool:
        return self._bucket.blob(path).exists()
