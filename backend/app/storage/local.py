"""Local filesystem storage backend — used for local/self-hosted development
where a GCS bucket isn't configured. Never used in production (see
`GcsStorage`), but implements the same `StorageBackend` interface so the
rest of the app never branches on which one is active.
"""

from pathlib import Path


class LocalFilesystemStorage:
    def __init__(self, root_dir: str) -> None:
        self._root = Path(root_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    def save(self, path: str, content: bytes) -> None:
        full_path = self._resolve(path)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(content)

    def read(self, path: str) -> bytes:
        return self._resolve(path).read_bytes()

    def exists(self, path: str) -> bool:
        return self._resolve(path).exists()

    def _resolve(self, path: str) -> Path:
        resolved = (self._root / path).resolve()
        if self._root.resolve() not in resolved.parents and resolved != self._root.resolve():
            raise ValueError(f"Path '{path}' escapes storage root")
        return resolved
