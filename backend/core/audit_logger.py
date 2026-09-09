"""
Security audit logger for tracking authentication, authorization, simulation dispatches,
and security violation events with automatic credential and PII redaction.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Configure standard audit logger
audit_logger = logging.getLogger("security.audit")
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[SECURITY AUDIT] %(asctime)s - %(message)s")
    handler.setFormatter(formatter)
    audit_logger.addHandler(handler)
    audit_logger.setLevel(logging.INFO)


SENSITIVE_PATTERNS = [
    (re.compile(r"""(["']?password["']?\s*[:=]\s*)(["']?)[^"',}\s]+(["']?)""", re.IGNORECASE), r"\1\2[REDACTED]\3"),
    (re.compile(r"""(["']?token["']?\s*[:=]\s*)(["']?)[^"',}\s]+(["']?)""", re.IGNORECASE), r"\1\2[REDACTED]\3"),
    (re.compile(r"""(["']?secret_key["']?\s*[:=]\s*)(["']?)[^"',}\s]+(["']?)""", re.IGNORECASE), r"\1\2[REDACTED]\3"),
    (re.compile(r"Bearer\s+[A-Za-z0-9\-\._~+/]+=*", re.IGNORECASE), "Bearer [REDACTED]"),
]



def redact_secrets(message: str) -> str:
    """Scrub passwords, tokens, and credentials from audit messages."""
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


class SecurityAudit:
    """Convenience methods for logging structured security audit records."""

    @classmethod
    def log_event(
        cls,
        event_type: str,
        actor: str,
        action: str,
        status: str,
        details: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None,
    ):
        """Record an immutable security event."""
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "actor": actor,
            "action": action,
            "status": status,
            "client_ip": client_ip or "internal",
            "details": details or {},
        }
        msg_str = json.dumps(payload, default=str)
        cleaned = redact_secrets(msg_str)
        audit_logger.info(cleaned)

    @classmethod
    def log_auth_success(cls, email: str, client_ip: Optional[str] = None):
        cls.log_event("AUTH", email, "login", "SUCCESS", client_ip=client_ip)

    @classmethod
    def log_auth_failure(cls, email: str, reason: str, client_ip: Optional[str] = None):
        cls.log_event("AUTH", email, "login", "FAILURE", {"reason": reason}, client_ip=client_ip)

    @classmethod
    def log_access_denied(cls, actor: str, path: str, required_role: str, client_ip: Optional[str] = None):
        cls.log_event("AUTHORIZATION", actor, "access_route", "DENIED", {"path": path, "required_role": required_role}, client_ip=client_ip)

    @classmethod
    def log_simulation_dispatch(cls, actor: str, sim_id: str, client_ip: Optional[str] = None):
        cls.log_event("SIMULATION", actor, "dispatch_job", "QUEUED", {"simulation_id": sim_id}, client_ip=client_ip)

    @classmethod
    def log_security_violation(cls, violation_type: str, details: Dict[str, Any], client_ip: Optional[str] = None):
        cls.log_event("VIOLATION", "unknown", violation_type, "BLOCKED", details, client_ip=client_ip)
