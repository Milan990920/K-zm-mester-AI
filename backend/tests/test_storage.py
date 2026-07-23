import pytest

from app.storage.local import LocalFilesystemStorage


@pytest.fixture
def storage(tmp_path):
    return LocalFilesystemStorage(str(tmp_path))


def test_save_and_read_round_trip(storage):
    storage.save("tenants/abc/doc1.pdf", b"hello world")

    assert storage.exists("tenants/abc/doc1.pdf") is True
    assert storage.read("tenants/abc/doc1.pdf") == b"hello world"


def test_exists_is_false_for_missing_path(storage):
    assert storage.exists("tenants/abc/missing.pdf") is False


def test_save_creates_intermediate_directories(storage):
    storage.save("a/b/c/d.pdf", b"data")
    assert storage.read("a/b/c/d.pdf") == b"data"


def test_path_traversal_outside_root_is_rejected(storage):
    with pytest.raises(ValueError):
        storage.save("../escape.pdf", b"data")
