
import pytest

from app.services.ai_service import AIService


@pytest.mark.asyncio
async def test_qwen_verification():
    service = AIService()

    mapping = {
        "kind": "configuration",
        "symbol": "MAX_RETRIES",
        "source_file": "config.py",
        "source_line": 10,
        "actual_value": "5",
        "documentation_matches": [
            {
                "docs_file": "README.md",
                "docs_line": 20,
                "text": "MAX_RETRIES is set to 3.",
                "matched_terms": ["MAX_RETRIES"]
            }
        ]
    }

    result = await service.verify_documentation(mapping)

    assert isinstance(result, dict)
    assert result["is_outdated"] is True
    assert result["severity"] in ("high", "medium", "low")
    assert result["confidence"] >= 0.0
    assert result["suggestion"] is not None
