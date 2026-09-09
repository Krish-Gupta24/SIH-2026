"""Celery application configuration for asynchronous simulation execution."""

import os
from celery import Celery
from backend.core.config import settings

# Create Celery application
celery_app = Celery(
    "shelter_simulation_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
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

# Support in-memory eager mode for tests or environments without a running Redis daemon
if os.getenv("CELERY_ALWAYS_EAGER", "False").lower() in ("true", "1", "yes"):
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
