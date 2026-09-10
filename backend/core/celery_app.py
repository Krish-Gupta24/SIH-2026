"""Celery application configuration for asynchronous simulation execution."""

import os
from celery import Celery
from backend.core.config import settings

# Support in-memory eager mode for tests or environments without a running Redis daemon
def _is_redis_running(url: str) -> bool:
    try:
        import socket
        from urllib.parse import urlparse
        p = urlparse(url)
        host = p.hostname or "127.0.0.1"
        port = p.port or 6379
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        res = s.connect_ex((host, port))
        s.close()
        return res == 0
    except Exception:
        return False

# When ENABLE_CELERY=False (default in development), never probe or require Redis
if not getattr(settings, "ENABLE_CELERY", False):
    use_eager = True
else:
    eager_env = os.getenv("CELERY_ALWAYS_EAGER")
    if eager_env is not None:
        use_eager = eager_env.lower() in ("true", "1", "yes")
    else:
        use_eager = not _is_redis_running(settings.CELERY_BROKER_URL)

broker_url = "memory://" if use_eager else settings.CELERY_BROKER_URL
backend_url = "cache+memory://" if use_eager else settings.CELERY_RESULT_BACKEND

# Create Celery application
celery_app = Celery(
    "shelter_simulation_worker",
    broker=broker_url,
    backend=backend_url,
    include=["backend.simulation.tasks"],
)

# Configure Celery settings
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=settings.SIMULATION_TIMEOUT_SECONDS + 60,
    task_soft_time_limit=settings.SIMULATION_TIMEOUT_SECONDS,
)

if use_eager:
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
