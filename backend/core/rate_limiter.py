"""
Sliding-window rate limiter for protecting endpoints against DoS and compute exhaustion.
"""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter tracking timestamps per client identifier."""

    def __init__(self):
        # Map client key -> list of request timestamps (epoch floats)
        self._records: Dict[str, List[float]] = defaultdict(list)

    def check_limit(
        self,
        key: str,
        max_requests: int = 60,
        window_seconds: int = 60,
    ) -> Tuple[bool, int, int]:
        """
        Evaluate if client exceeded rate limit.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - window_seconds

        # Clean timestamps older than window
        timestamps = [t for t in self._records[key] if t > window_start]
        self._records[key] = timestamps

        if len(timestamps) >= max_requests:
            oldest = timestamps[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return False, 0, retry_after

        # Record this request
        self._records[key].append(now)
        remaining = max_requests - len(self._records[key])
        return True, remaining, 0

    def clear(self):
        """Reset rate limiter state (useful in test suites)."""
        self._records.clear()


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter()


def rate_limit_dependency(max_requests: int = 60, window_seconds: int = 60):
    """FastAPI route dependency to enforce sliding-window rate limiting per client IP."""
    async def limiter_check(request: Request):
        # Get client IP or fallback
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"{client_ip}:{request.url.path}"

        allowed, remaining, retry_after = rate_limiter.check_limit(
            key=key,
            max_requests=max_requests,
            window_seconds=window_seconds,
        )

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {max_requests} requests per {window_seconds}s.",
                headers={"Retry-After": str(retry_after)},
            )

    return limiter_check
