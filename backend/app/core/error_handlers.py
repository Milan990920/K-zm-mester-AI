"""Registers a catch-all exception handler.

Without this, an unhandled exception in a route propagates past
`CORSMiddleware` (added outside `ExceptionMiddleware` in the Starlette
stack), so the resulting 500 response is missing CORS headers — the
browser then reports it as a confusing "CORS blocked" failure instead of
the real error. Turning it into a normal (if generic) JSON response here
lets it flow back out through the CORS layer like any other response.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("kozmu_mester")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Kezeletlen hiba a %s %s kérés feldolgozása közben", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Váratlan hiba történt a kérés feldolgozása közben"},
        )
