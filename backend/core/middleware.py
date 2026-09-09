"""
HTTP middleware for security headers, request size limits, and audit request IDs.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.status import HTTP_413_REQUEST_ENTITY_TOO_LARGE

from backend.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects industry-standard HTTP security headers into every response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Generate or capture correlation request ID
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        response = await call_next(request)

        # Inject Security Headers
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:*; "
            "frame-ancestors 'none';"
        )

        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects request payloads exceeding maximum byte threshold to prevent memory exhaustion."""

    def __init__(self, app, max_bytes: int = 15 * 1024 * 1024):  # 15 MB default
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > self.max_bytes:
                    return JSONResponse(
                        status_code=HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": "Payload Too Large",
                            "detail": f"Request body ({length} bytes) exceeds maximum allowable limit of {self.max_bytes} bytes.",
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)
