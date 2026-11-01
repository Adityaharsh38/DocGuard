
import os
import re
import httpx

import base64
from urllib.parse import quote

from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

GITHUB_API = "https://api.github.com"


class GitHubServiceError(Exception):
    """Raised when GitHub API requests fail."""
    pass


def parse_github_url(repo_url: str):
    """Extract owner and repository name from a GitHub URL."""

    parsed = urlparse(repo_url.strip())

    if parsed.hostname not in ("github.com", "www.github.com"):
        raise GitHubServiceError(
            "Please provide a valid github.com repository URL."
        )

    parts = [
        part for part in parsed.path.strip("/").split("/") if part
    ]

    if len(parts) != 2:
        raise GitHubServiceError(
            "Repository URL must look like https://github.com/owner/repo"
        )

    owner, repo = parts

    if repo.endswith(".git"):
        repo = repo[:-4]

    if not re.fullmatch(r"[A-Za-z0-9_.-]+", owner):
        raise GitHubServiceError("Invalid GitHub owner name.")

    if not re.fullmatch(r"[A-Za-z0-9_.-]+", repo):
        raise GitHubServiceError("Invalid GitHub repository name.")

    return owner, repo


class GitHubService:

    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")

        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "DocGuard"
        }

        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    async def _make_request(self, client, url, params=None):
        """Make a GitHub API request with useful error handling."""

        try:
            response = await client.get(url, params=params)

        except httpx.TimeoutException:
            raise GitHubServiceError(
                "GitHub request timed out. Please try again."
            )

        except httpx.RequestError:
            raise GitHubServiceError(
                "Unable to connect to GitHub API."
            )

        if response.status_code == 401:
            raise GitHubServiceError(
                "GitHub authentication failed. Check your GITHUB_TOKEN."
            )

        if response.status_code == 403:
            remaining = response.headers.get(
                "X-RateLimit-Remaining", "unknown"
            )

            raise GitHubServiceError(
                f"GitHub access denied or rate limit reached. "
                f"Remaining requests: {remaining}. "
                "Check your token permissions and rate limit."
            )

        if response.status_code == 404:
            raise GitHubServiceError(
                f"GitHub returned 404 for {url}. "
                "Check that the repository exists, the PR number is "
                "correct, and your token has access to the repository."
            )

        if response.status_code >= 400:
            raise GitHubServiceError(
                f"GitHub API error {response.status_code}: "
                f"{response.text[:300]}"
            )

        return response.json()

    async def fetch_pull_request(self, repo_url: str, pr_number: int):
        """Fetch PR metadata and all changed files from GitHub."""

        if pr_number < 1:
            raise GitHubServiceError(
                "Pull request number must be positive."
            )

        owner, repo = parse_github_url(repo_url)

        async with httpx.AsyncClient(
            timeout=30.0,
            headers=self.headers
        ) as client:

            # 1. Fetch repository information first.
            repo_url_api = f"{GITHUB_API}/repos/{owner}/{repo}"

            repo_data = await self._make_request(
                client, repo_url_api
            )

            # 2. Fetch pull request metadata.
            pr_url = (
                f"{GITHUB_API}/repos/{owner}/{repo}"
                f"/pulls/{pr_number}"
            )

            pr_data = await self._make_request(
                client, pr_url
            )

            # 3. Fetch changed files.
            files_url = (
                f"{GITHUB_API}/repos/{owner}/{repo}"
                f"/pulls/{pr_number}/files"
            )

            changed_files = []
            page = 1
            max_pages = 10

            while page <= max_pages:

                page_files = await self._make_request(
                    client,
                    files_url,
                    params={
                        "per_page": 100,
                        "page": page
                    }
                )

                if not page_files:
                    break

                for file in page_files:
                    changed_files.append({
                        "filename": file.get("filename"),
                        "status": file.get("status"),
                        "additions": file.get("additions", 0),
                        "deletions": file.get("deletions", 0),
                        "changes": file.get("changes", 0),
                        "patch": file.get("patch"),
                        "blob_url": file.get("blob_url"),
                        "raw_url": file.get("raw_url")
                    })

                if len(page_files) < 100:
                    break

                page += 1

        return {
            "repository": repo_data.get("full_name"),
            "pr_number": pr_number,
            "title": pr_data.get("title"),
            "description": pr_data.get("body"),
            "state": pr_data.get("state"),
            "url": pr_data.get("html_url"),
            "base_branch": pr_data.get("base", {}).get("ref"),
            "head_branch": pr_data.get("head", {}).get("ref"),
            "base_sha": pr_data.get("base", {}).get("sha"),
            "head_sha": pr_data.get("head", {}).get("sha"),
            "changed_files_count": len(changed_files),
            "changed_files": changed_files
        }
    
    async def fetch_file_content(
        self,
        owner: str,
        repo: str,
        file_path: str,
        ref: str
    ) -> str:
        """
        Fetch the complete contents of a repository file
        at a specific commit SHA or branch.
        """

        encoded_path = quote(file_path, safe="/")

        url = (
            f"{GITHUB_API}/repos/{owner}/{repo}"
            f"/contents/{encoded_path}"
        )

        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                headers=self.headers
            ) as client:

                response = await client.get(
                    url,
                    params={"ref": ref}
                )

                if response.status_code == 404:
                    raise GitHubServiceError(
                        f"File not found: {file_path} at ref {ref}"
                    )

                if response.status_code == 403:
                    raise GitHubServiceError(
                        "GitHub rate limit reached while fetching "
                        f"{file_path}."
                    )

                if response.status_code == 401:
                    raise GitHubServiceError(
                        "GitHub authentication failed."
                    )

                response.raise_for_status()

                data = response.json()

                if data.get("type") != "file":
                    raise GitHubServiceError(
                        f"{file_path} is not a regular file."
                    )

                if data.get("encoding") != "base64":
                    raise GitHubServiceError(
                        f"Unsupported content encoding for {file_path}."
                    )

                encoded_content = data.get("content", "")

                if not encoded_content:
                    raise GitHubServiceError(
                        f"File content is empty or unavailable: {file_path}"
                    )

                decoded = base64.b64decode(encoded_content)

                return decoded.decode("utf-8")

        except httpx.TimeoutException:
            raise GitHubServiceError(
                f"Timed out fetching {file_path}."
            )

        except httpx.HTTPError as error:
            raise GitHubServiceError(
                f"GitHub request failed for {file_path}: {error}"
            )

