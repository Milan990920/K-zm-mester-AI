from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Közmű Mester API",
        version="0.1.0",
        debug=settings.debug,
    )
    app.include_router(api_router)
    return app


app = create_app()
