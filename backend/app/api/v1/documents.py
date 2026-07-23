import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from pypdf.errors import PdfReadError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_tenant_db
from app.models.document import Document
from app.pipeline.dependencies import get_pipeline_orchestrator
from app.pipeline.orchestrator import PipelineOrchestrator
from app.schemas.document import DocumentRead
from app.services.document_processing import process_uploaded_document
from app.storage.base import StorageBackend
from app.storage.factory import get_storage_backend

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    orchestrator: PipelineOrchestrator = Depends(get_pipeline_orchestrator),
    storage: StorageBackend = Depends(get_storage_backend),
) -> DocumentRead:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Csak PDF fájl tölthető fel",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="A fájl mérete meghaladja a megengedett 20 MB-ot",
        )

    try:
        document = process_uploaded_document(
            db=db,
            storage=storage,
            orchestrator=orchestrator,
            tenant_id=current_user.tenant_id,
            uploaded_by_user_id=current_user.id,
            original_filename=file.filename or "dokumentum.pdf",
            content=content,
        )
    except PdfReadError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A feltöltött fájl nem érvényes vagy sérült PDF",
        ) from exc

    return DocumentRead.model_validate(document)


@router.get("/{document_id}/download")
def download_document(
    document_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    storage: StorageBackend = Depends(get_storage_backend),
) -> Response:
    document = db.scalar(select(Document).where(Document.id == document_id))
    if document is None:
        raise HTTPException(status_code=404, detail="A dokumentum nem található")

    content = storage.read(document.gcs_path)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{document.original_filename}"'},
    )
