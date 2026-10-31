
import pytest

from app.services.github_service import GitHubService


@pytest.mark.asyncio
async def test_fetch_readme_content():
    github = GitHubService()

    content = await github.fetch_file_content(
        owner="octocat",
        repo="Hello-World",
        file_path="README",
        ref="master"
    )

    assert isinstance(content, str)
    assert len(content) > 0
