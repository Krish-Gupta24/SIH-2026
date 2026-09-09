# Production-Readiness & Security Manual

## 1. Executive Summary & Security Mandates

The **Area-Specific Shelter Thermal Design & Simulation Platform** was developed for defense and humanitarian deployments in extreme high-altitude alpine regions (e.g. Northern Command / Ladakh at 3,500m–5,500m elevation). Given the mission-critical nature of structural, climatic, and thermal life-safety engineering data:

> [!IMPORTANT]
> **Core Security Principles**:
> 1. **Zero Arbitrary Execution**: The platform must **never** allow a normal user or network caller to execute arbitrary operating-system commands.
> 2. **Controlled Simulation Binaries**: Simulation jobs must **only** execute approved binaries and controlled, programmatically generated files.
> 3. **Boundary Confinement**: All file reads, writes, and scratch operations must remain strictly sandboxed within authorized ephemeral directories.
> 4. **No Path Traversal**: User-supplied filenames or relative path tokens (`../`) must be rejected prior to filesystem interaction.
> 5. **Cryptographic Provenance**: Authentication, session tokens, and data checksums use NIST-approved cryptographic primitives (PBKDF2-HMAC-SHA256).

---

## 2. 17-Domain Security Audit & Control Matrix

| Audit Domain | Threat / Vulnerability Analyzed | Mitigation & Architectural Control | Implementation Reference | Status |
|---|---|---|---|---|
| **1. Authentication** | Unauthenticated API abuse; credential stuffing | PBKDF2-HMAC-SHA256 password hashing with random salt; HMAC-SHA256 signed bearer tokens with expiry | `backend/core/security.py`<br>`backend/api/v1/endpoints/auth.py` | **VERIFIED** |
| **2. Authorization** | Privilege escalation; viewers mutating simulation jobs | Role-Based Access Control (RBAC: `viewer`, `engineer`, `admin`) with route guard dependencies (`require_role`) | `backend/core/security.py` | **VERIFIED** |
| **3. Input Validation** | Out-of-bounds geometries; unphysical thermal envelopes | Strict Pydantic validation: building dimensions bounded ($1\text{m} \le L,W \le 100\text{m}$, $1.8\text{m} \le H \le 30\text{m}$), $0 \le \text{WWR} \le 0.90$, orientation $0^\circ \le \theta \le 360^\circ$ | `backend/api/v1/endpoints/simulations.py`<br>`simulation/generators/` | **VERIFIED** |
| **4. File Upload Security** | Malicious script ingestion; oversized file DoS | Strict `.epw` extension check; magic byte header verification (`LOCATION,`); 25MB size limit; UUID quarantine isolation | `backend/core/path_security.py` | **VERIFIED** |
| **5. Command Execution Security** | Host OS takeover via custom executable parameter | `BinaryAllowlist` verifying approved binary names (`energyplus.exe`, `fluent.exe`) and installation directories; rejection with `SecurityException` | `backend/core/binary_allowlist.py`<br>`simulation/runners/energyplus_runner.py` | **VERIFIED** |
| **6. Simulation Sandboxing** | Scratch file pollution; symlink directory escapes | Dedicated ephemeral directories (`storage/simulations/sim_<uuid>_<ts>/`); post-run cleanup of `.eso`, `.bnd`, `.audit` transient files | `backend/simulation/tasks.py`<br>`backend/simulation/runner.py` | **VERIFIED** |
| **7. Secrets Management** | Hardcoded secrets committed or leaked | Fail-fast boot validator rejecting `default-insecure-...` or keys $< 32$ chars when `ENVIRONMENT == "production"`; `.env` in `.gitignore` | `backend/core/config.py`<br>`.gitignore` | **VERIFIED** |
| **8. API Security** | Clickjacking; MIME confusion; cross-site attacks | `SecurityHeadersMiddleware` (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS, Referrer-Policy); Swagger hidden in prod | `backend/core/middleware.py`<br>`backend/main.py` | **VERIFIED** |
| **9. Database Security** | SQL injection; credential exposure in tracebacks | SQLAlchemy ORM parameterized queries; connection pooling (`pool_pre_ping=True`, `pool_recycle=3600`); exception sanitization | `backend/core/database.py` | **VERIFIED** |
| **10. Error Handling** | Internal server path leakage; stack trace exposure | Global exception handlers redacting filesystem paths (`[PATH]/...`) via `sanitize_message`; correlation `X-Request-ID` attached | `backend/main.py`<br>`backend/simulation/store.py` | **VERIFIED** |
| **11. Logging** | Leakage of passwords/tokens in server logs | Structured `SecurityAudit` logger with regex-based credential masking (`[REDACTED]`); logs auth events and violations | `backend/core/audit_logger.py` | **VERIFIED** |
| **12. Rate Limiting** | Automated simulation spam; compute resource starvation | Sliding-window in-memory/Redis rate limiter; 15 simulations/min, 60 general reqs/min; returns `HTTP 429` with `Retry-After` | `backend/core/rate_limiter.py`<br>`backend/api/v1/endpoints/` | **VERIFIED** |
| **13. Resource Limits** | Gigabyte JSON payload memory exhaustion attacks | `RequestBodySizeLimitMiddleware` rejecting requests exceeding 15MB with `HTTP 413 Payload Too Large` | `backend/core/middleware.py`<br>`backend/main.py` | **VERIFIED** |
| **14. Simulation Timeouts** | Zombie or orphaned simulation processes | User timeout clamped to `MAX_SIMULATION_TIMEOUT_SECONDS` (1800s max); subprocess timeout with forced termination (`kill`) | `backend/simulation/tasks.py`<br>`simulation/runners/energyplus_runner.py` | **VERIFIED** |
| **15. Concurrent Simulations** | Multi-tenant CPU/RAM thrashing | `SimulationJobStore.can_start_simulation()` enforcing `MAX_CONCURRENT_SIMULATIONS` (default: 4); excess requests queued or throttled | `backend/simulation/store.py`<br>`backend/api/v1/endpoints/simulations.py` | **VERIFIED** |
| **16. Path Traversal** | Arbitrary file reads via `../../` directory escapes | `resolve_safe_path()` asserting `target.relative_to(base_dir)` containment; rejection of null bytes and dot-dot tokens | `backend/core/path_security.py` | **VERIFIED** |
| **17. Arbitrary Command Injection** | Shell meta-character injection (`&`, `|`, `;`) | Absolute ban on `shell=True`, `os.system()`, `os.popen()`, `eval()`, `exec()`; argument lists passed directly to OS kernel | Global codebase audit | **VERIFIED** |

---

## 3. Threat Model (STRIDE Analysis)

```
+---------------------------------------------------------------------------------------+
|                                    TRUST BOUNDARY                                     |
|                                                                                       |
|   Untrusted Network Client (Browser / API Client)                                     |
|       |                                                                               |
|       v  [HTTPS / Rate Limiting / Body Size Limit (15MB)]                             |
|   +-------------------------------------------------------------------------------+   |
|   | FastAPI Gateway                                                               |   |
|   | - SecurityHeadersMiddleware (CSP, HSTS, X-Frame-Options: DENY)                |   |
|   | - TokenManager (HMAC-SHA256 Authenticator)                                   |   |
|   | - RBAC Guard (Viewer vs Engineer vs Admin)                                    |   |
|   +-------------------------------------------------------------------------------+   |
|       |                                                                               |
|       v  [Input Validation: Bounded Geometry, WWR <= 0.90, Sanitized Paths]           |
|   +-------------------------------------------------------------------------------+   |
|   | Simulation Orchestrator (SimulationJobStore)                                  |   |
|   | - Concurrency Throttling (Max 4 Active Jobs)                                  |   |
|   | - Timeout Clamping (<= 1800s)                                                 |   |
|   +-------------------------------------------------------------------------------+   |
|       |                                                                               |
|       v  [SANDBOX ISOLATION: storage/simulations/sim_<uuid>_<ts>/]                    |
|   +-------------------------------------------------------------------------------+   |
|   | Execution Sandbox                                                             |   |
|   | - BinaryAllowlist Verification (energyplus.exe / fluent.exe only)             |   |
|   | - subprocess.run(cmd_list, shell=False, timeout=T)                            |   |
|   | - Safe cleanup of transient .eso / .audit scratch files                       |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### 1. Spoofing (Identity)
- **Threat**: Attackers forging JWT or bearer tokens to masquerade as Military Engineers or System Administrators.
- **Mitigation**: Tokens are HMAC-SHA256 signed using a strong 32+ character server-side secret key with expiration timestamps (`exp`). Constant-time comparison prevents timing attacks.

### 2. Tampering (Data)
- **Threat**: Injecting shell metacharacters or arbitrary executable flags into simulation run requests.
- **Mitigation**: Command line arguments are strictly passed as lists of strings (`["energyplus", "-w", epw, "-d", out, "-r", idf]`). Subprocess calls strictly set `shell=False`.

### 3. Repudiation (Auditability)
- **Threat**: Users denying that they queued intensive simulations or generated conflicting reports.
- **Mitigation**: `SecurityAudit` logger records all authentication events, job queueing operations, and access denials with timestamps, actor IDs, client IPs, and status codes.

### 4. Information Disclosure
- **Threat**: Application stack traces revealing internal absolute paths (e.g. `C:\Users\...\`), database schemas, or credentials.
- **Mitigation**: `sanitize_message()` recursively redacts Windows and POSIX absolute filesystem paths into `[PATH]/...`. Production configurations hide Swagger/OpenAPI docs and replace 500 error bodies with generic failure messages.

### 5. Denial of Service (DoS)
- **Threat**: Spawning 100 simultaneous EnergyPlus simulations or uploading gigabyte-sized JSON/EPW files to exhaust server CPU and RAM.
- **Mitigation**:
  - `RequestBodySizeLimitMiddleware` terminates requests $> 15\text{MB}$.
  - `SlidingWindowRateLimiter` restricts simulation submissions to $15/\text{minute}$ per IP.
  - `SimulationJobStore.can_start_simulation()` restricts active running simulations to 4 concurrent processes.

### 6. Elevation of Privilege
- **Threat**: A `viewer` role submitting batch optimization sweeps or deleting project baselines.
- **Mitigation**: `require_role([UserRole.ENGINEER, UserRole.ADMIN])` verifies claims before allowing state-mutating operations.

---

## 4. Approved Simulation Binary Allowlist Specification

The platform implements a cryptographic and path-based allowlist for external binaries. Any invocation outside this matrix triggers a `SecurityException`:

```python
APPROVED_BINARY_NAMES = {
    "energyplus.exe",
    "energyplus",
    "fluent.exe",
    "fluent",
    "openstudio.exe",
    "openstudio",
}
```

### Path & Signature Verification Workflow
1. **Basename Check**: Candidate executable basename must exist in `APPROVED_BINARY_NAMES`.
2. **Directory Confinement**: Executable must reside in standard system directories (e.g. `C:\EnergyPlusV24-1-0`, `C:\Program Files\EnergyPlus*`, `C:\Program Files\ANSYS Inc\*`, `/usr/local/EnergyPlus*`).
3. **Execution Flag Protection**: Shell execution is strictly prohibited (`shell=False`).
4. **Signature Probe**: The runner verifies the banner output string (e.g. `EnergyPlus, Version 24.1.0...`) to detect binary substitution or wrapper scripts.

---

## 5. Security Incident Response & Disclosure

In the event of a suspected security incident:
1. **Immediate Quarantine**: Set `CELERY_ALWAYS_EAGER=False` and terminate active worker processes.
2. **Audit Extraction**: Extract structured logs from `[SECURITY AUDIT]` stream to isolate the requesting client IP and correlation `X-Request-ID`.
3. **Revocation**: Rotate `SECRET_KEY` in environment variables and flush Redis token caches.
4. **Patch Verification**: Run the automated security suite:
   ```bash
   py -m pytest tests/unit/test_security_audit.py -v
   ```
