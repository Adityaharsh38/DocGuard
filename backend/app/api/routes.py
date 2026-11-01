from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.analysis_service import (
    AnalysisService,
    AnalysisServiceError
)

from app.services.github_service import (
    GitHubService,
    GitHubServiceError
)

router = APIRouter()


class GitHubPRRequest(BaseModel):
    repo_url: str
    pr_number: int = Field(gt=0)


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "docguard-api"
    }


@router.get("/api/model-status")
async def model_status():
    import httpx

    model_name = "qwen3:4b"

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                "http://localhost:11434/api/tags"
            )
            response.raise_for_status()

            models = response.json().get("models", [])

            available = any(
                model.get("name") == model_name
                or model.get("name", "").startswith(model_name + ":")
                for model in models
            )

            return {
                "available": available,
                "provider": "ollama",
                "model": model_name,
                "message": (
                    "Model is ready"
                    if available
                    else "Qwen3 4B is not downloaded"
                )
            }

    except httpx.HTTPError:
        return {
            "available": False,
            "provider": "ollama",
            "model": model_name,
            "message": "Ollama is not running or is unreachable"
        }


@router.post("/api/github/pr")
async def fetch_github_pr(request: GitHubPRRequest):

    github = GitHubService()

    try:
        result = await github.fetch_pull_request(
            repo_url=request.repo_url,
            pr_number=request.pr_number
        )

        return {
            "status": "success",
            "data": result
        }

    except GitHubServiceError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch pull request from GitHub."
        )

@router.post("/api/analyze")
async def analyze_pull_request(request: GitHubPRRequest):
    """
    Analyze a GitHub pull request for documentation drift.
    """

    service = AnalysisService()

    try:
        result = await service.analyze_pull_request(
            repo_url=request.repo_url,
            pr_number=request.pr_number
        )

        return result

    except AnalysisServiceError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error)
        )