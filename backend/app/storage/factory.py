from functools import lru_cache

from app.core.config import get_settings
from app.storage.base import StorageBackend


@lru_cache
def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.google_application_credentials:
        from app.storage.gcs import GcsStorage

        return GcsStorage()

    from app.storage.local import LocalFilesystemStorage

    return LocalFilesystemStorage(settings.local_storage_dir)
