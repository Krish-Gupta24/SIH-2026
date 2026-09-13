"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.router import api_router
from backend.core.config import settings
from backend.core.middleware import SecurityHeadersMiddleware, RequestBodySizeLimitMiddleware
from backend.simulation.store import sanitize_message
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


def create_application() -> FastAPI:
    """Application factory for the FastAPI backend."""
    # Hide docs in production if not explicitly debugging
    docs_url = f"{settings.API_V1_STR}/docs" if settings.DEBUG or settings.ENVIRONMENT != "production" else None
    redoc_url = f"{settings.API_V1_STR}/redoc" if settings.DEBUG or settings.ENVIRONMENT != "production" else None

    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=docs_url,
        redoc_url=redoc_url,
        debug=settings.DEBUG,
    )

    # Security Headers Middleware
    app.add_middleware(SecurityHeadersMiddleware)

    # Request Body Size Limit Middleware
    app.add_middleware(
        RequestBodySizeLimitMiddleware,
        max_bytes=settings.MAX_REQUEST_BODY_BYTES,
    )

    # CORS configuration - Allow all web origins (Vercel, Render, Localhost)
    cors_origins = settings.CORS_ORIGINS
    if "*" in cors_origins or any("localhost" in o for o in cors_origins) or settings.ENVIRONMENT != "production":
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=r"^https?://.*",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    elif cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Global Sanitized Exception Handlers (Redacting internal file paths)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        clean_msg = sanitize_message(str(exc.detail))
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": clean_msg,
                "error": clean_msg,
            },
            headers=getattr(exc, "headers", None),
        )


    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation Error",
                "details": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request, exc):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": sanitize_message(str(exc)) if settings.DEBUG else "An unexpected server error occurred.",
            },
        )

    # Mount API routers under both /api/v1 and /api
    app.include_router(api_router, prefix=settings.API_V1_STR)
    app.include_router(api_router, prefix="/api")

    # Direct /simulate endpoint as specified in workflow
    from backend.api.v1.endpoints.simulations import queue_simulation
    app.add_api_route(
        "/simulate",
        queue_simulation,
        methods=["POST"],
        status_code=202,
        tags=["Simulation Execution"],
        summary="Direct endpoint for queuing asynchronous simulations",
    )

    @app.on_event("startup")
    async def on_startup():
        import logging
        from backend.services.seeder import seed_application_data
        from backend.simulation.store import simulation_store

        logger = logging.getLogger("backend.startup")
        seed_application_data()

        # Reap any leftover/orphaned simulation jobs from previous unexpected server shutdowns
        reaped = simulation_store.reap_stale_or_orphaned_jobs(timeout_threshold_seconds=600)
        if reaped > 0:
            logger.info(f"Startup maintenance: Reaped {reaped} orphaned simulation jobs.")

    return app



app = create_application()
