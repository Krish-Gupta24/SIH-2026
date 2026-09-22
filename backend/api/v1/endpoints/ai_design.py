"""FastAPI endpoints for AI Generative Thermal Design, SHAP explainability, and physics verification."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.ai.model_registry import ModelRegistry
from backend.ai.schemas import (
    CandidateResponse,
    ExplainCandidateRequest,
    GenerateDesignRequest,
    OptimizationJobStatus,
    VerifyCandidatesRequest,
)
from backend.ai.service import AIDesignService

router = APIRouter()
ai_service = AIDesignService.get_instance()


@router.post(
    "/design/generate",
    response_model=OptimizationJobStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate AI Generative Design search job",
)
def generate_designs(request: GenerateDesignRequest):
    """Submits a mission definition and triggers background NSGA-II optimization with surrogate ML."""
    try:
        job = ai_service.start_generation_job(request)
        return job
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start optimization job: {e}",
        )


@router.get(
    "/design/jobs/{job_id}",
    response_model=OptimizationJobStatus,
    summary="Check status and generation progress of AI search job",
)
def get_job_status(job_id: str):
    job = ai_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")
    return job


@router.get(
    "/design/candidates/{job_id}",
    response_model=List[CandidateResponse],
    summary="Retrieve non-dominated Pareto candidates for an optimization job",
)
def get_job_candidates(job_id: str):
    job = ai_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")

    candidates = ai_service.get_job_candidates(job_id)
    return [CandidateResponse(**c) for c in candidates]


@router.post(
    "/design/verify/{job_id}",
    summary="Execute parallel EnergyPlus physics verification on top diverse candidates",
)
def verify_job_candidates(job_id: str, request: VerifyCandidatesRequest):
    try:
        verified_results = ai_service.verify_job_candidates(
            job_id=job_id,
            k=request.k,
            period_days=request.period_days,
        )
        return {
            "job_id": job_id,
            "verified_count": len(verified_results),
            "candidates": verified_results,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Verification failed: {e}")


@router.post(
    "/design/explain",
    summary="Compute target-specific SHAP feature attributions for a candidate design",
)
def explain_candidate(request: ExplainCandidateRequest):
    try:
        report = ai_service.explain_candidate(
            candidate=request.candidate,
            target_name=request.target_name,
            top_k=request.top_k,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Explainability calculation failed: {e}")


@router.post(
    "/design/apply",
    summary="Convert an AI candidate design into canonical ShelterModel format for the 3D Designer",
)
def apply_candidate_to_designer(candidate: Dict[str, Any]):
    try:
        shelter_model = ai_service.candidate_to_shelter_model(candidate)
        return {
            "success": True,
            "shelter_model": shelter_model,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to convert design: {e}")


@router.get(
    "/models/status",
    summary="Get active surrogate model metadata, approval status, and Model Card",
)
def get_model_status():
    registry = ModelRegistry()
    try:
        _, card = registry.load_approved_model()
        card_dict = card.to_dict()
        card_dict["model_version"] = f"v{card.version}.0"
        card_dict["version"] = str(card.version)
        return {
            "is_surrogate_available": True,
            "model_card": card_dict,
        }
    except Exception:
        try:
            _, card = registry.load_model()
            card_dict = card.to_dict()
            card_dict["model_version"] = f"v{card.version}.0"
            card_dict["version"] = str(card.version)
            return {
                "is_surrogate_available": True,
                "model_card": card_dict,
            }
        except Exception:
            return {
                "is_surrogate_available": False,
                "message": "AI Surrogate Unavailable — Running Forward Physics Mode",
            }


@router.get(
    "/models",
    summary="List all versioned models in registry",
)
def list_models():
    registry = ModelRegistry()
    return {"models": registry.list_models()}
