import httpx

from app.services.github_service import (
    GitHubService,
    GitHubServiceError,
    parse_github_url,
)
from app.services.diff_service import analyze_changed_files
from app.services.code_analyzer import (
    analyze_python_code,
    compare_code_analyses,
)
from app.services.docs_mapper import map_documentation
from app.services.ai_service import (
    AIService,
    AIServiceError,
    MAX_MATCHES_PER_BATCH,
)


class AnalysisServiceError(Exception):
    """Raised when PR analysis fails."""
    pass


class AnalysisService:

    def __init__(self):
        self.github = GitHubService()
        self.ai = AIService()

    async def _fetch_repository_docs(
        self,
        owner: str,
        repo: str,
        ref: str,
        limit: int = 30,
    ) -> list:
        """Fetch Markdown documentation files from the PR head."""

        tree_url = (
            f"https://api.github.com/repos/{owner}/{repo}"
            f"/git/trees/{ref}"
        )

        async with httpx.AsyncClient(
            timeout=30.0,
            headers=self.github.headers,
        ) as client:
            tree = await self.github._make_request(
                client,
                tree_url,
                params={"recursive": "1"},
            )

        if tree.get("truncated"):
            raise AnalysisServiceError(
                "Repository is too large to scan its complete "
                "documentation tree."
            )

        documentation_paths = [
            item["path"]
            for item in tree.get("tree", [])
            if item.get("type") == "blob"
            and item["path"].lower().endswith((".md", ".mdx", ".rst"))
            and not any(
                part.startswith(".")
                for part in item["path"].split("/")
            )
        ]

        # Prioritize README and docs directories.
        documentation_paths.sort(
            key=lambda path: (
                0 if path.lower().endswith("readme.md") else
                1 if path.lower().startswith("docs/") else
                2,
                path,
            )
        )

        documentation_files = []

        for path in documentation_paths[:limit]:
            try:
                content = await self.github.fetch_file_content(
                    owner,
                    repo,
                    path,
                    ref,
                )

                documentation_files.append({
                    "filename": path,
                    "content": content,
                })

            except GitHubServiceError:
                continue

        return documentation_files

    async def analyze_pull_request(
        self,
        repo_url: str,
        pr_number: int,
    ) -> dict:
        """Run the complete DocGuard analysis pipeline."""

        try:
            # 1. Fetch PR metadata and changed files.
            pr = await self.github.fetch_pull_request(
                repo_url,
                pr_number,
            )

            owner, repo = parse_github_url(repo_url)

            # 2. Parse PR patches.
            diff_result = analyze_changed_files(pr["changed_files"])

            # 3. Compare actual Python code at base and head.
            code_analyses = []
            changed_facts = []

            for file in diff_result["source_files"]:
                filename = file["filename"]

                # Deleted files have no current head version.
                if file.get("status") == "removed":
                    continue

                try:
                    head_source = await self.github.fetch_file_content(
                        owner,
                        repo,
                        filename,
                        pr["head_sha"],
                    )

                    head_analysis = analyze_python_code(
                        head_source,
                        filename,
                    )

                    try:
                        base_source = await self.github.fetch_file_content(
                            owner,
                            repo,
                            filename,
                            pr["base_sha"],
                        )

                        base_analysis = analyze_python_code(
                            base_source,
                            filename,
                        )

                    except GitHubServiceError:
                        if file.get("status") != "added":
                            raise

                        # A newly added file has no base version.
                        base_analysis = {
                            "filename": filename,
                            "error": None,
                            "functions": [],
                            "classes": [],
                            "cli_arguments": [],
                            "configurations": [],
                        }

                    code_analyses.append(head_analysis)

                    file_changes = compare_code_analyses(
                        base_analysis,
                        head_analysis,
                    )

                    changed_facts.extend(file_changes)

                except GitHubServiceError as error:
                    raise AnalysisServiceError(
                        f"Unable to compare {filename}: {error}"
                    ) from error

            # 4. Fetch documentation from the repository.
            documentation_files = await self._fetch_repository_docs(
                owner,
                repo,
                pr["head_sha"],
            )

            # 5. Map changed code facts to documentation.
            mappings = map_documentation(
                changed_facts,
                documentation_files,
            )

            mapping_result = {
                "total_code_facts": len(changed_facts),
                "mapped_facts": len(mappings),
                "unmapped_facts": len(changed_facts) - len(mappings),
                "mappings": mappings,
            }

            # 6. Verify documentation matches.
            findings = []
            total_qwen_requests = 0

            print("\n========== DOCGUARD PERFORMANCE ==========")
            print("Repository:", pr["repository"])
            print("Pull request:", pr_number)
            print("Changed code facts:", len(changed_facts))
            print("Documentation files:", len(documentation_files))
            print("Mapped facts:", len(mappings))

            # Print facts before AI verification. This confirms whether
            # function_behavior facts actually reach the documentation mapper.
            print("\n========== CHANGED FACTS ==========")
            for fact in changed_facts:
                print(
                    "KIND:", fact.get("kind"),
                    "| SYMBOL:", fact.get("symbol"),
                    "| PREVIOUS:", str(fact.get("previous_value"))[:500],
                    "| ACTUAL:", str(fact.get("actual_value"))[:500],
                )
            print("===================================\n")

            active_mappings = [
                mapping
                for mapping in mappings
                if mapping.get("documentation_matches")
            ]

            if active_mappings:
                ai_results = await self.ai.verify_all_documentation_batches(
                    active_mappings
                )

                total_documentation_matches = sum(
                    len(mapping.get("documentation_matches", []))
                    for mapping in active_mappings
                )

                total_qwen_requests = (
                    total_documentation_matches
                    + MAX_MATCHES_PER_BATCH - 1
                ) // MAX_MATCHES_PER_BATCH

                # Diagnostic output: show exactly which facts Qwen assessed
                # and why a result may later be filtered out.
                print("\n========== AI VERIFICATION RESULTS ==========")

                for item in ai_results:
                    mapping_index = item.get("mapping_id")

                    if (
                        not isinstance(mapping_index, int)
                        or isinstance(mapping_index, bool)
                        or mapping_index < 0
                        or mapping_index >= len(active_mappings)
                    ):
                        print("INVALID MAPPING ID:", mapping_index)
                        continue

                    mapping = active_mappings[mapping_index]

                    print(
                        "\nFACT:", mapping.get("kind"),
                        "| SYMBOL:", mapping.get("symbol"),
                    )

                    for result in item.get("results", []):
                        print("MATCH ID:", result.get("match_id"))
                        print("OUTDATED:", result.get("is_outdated"))
                        print("SEVERITY:", result.get("severity"))
                        print("CONFIDENCE:", result.get("confidence"))
                        print("EXPLANATION:", result.get("explanation"))
                        print("DOCUMENTED:", result.get("documented_value"))
                        print("ACTUAL:", result.get("actual_value"))

                print("==============================================\n")

                for mapping_result_item in ai_results:
                    mapping_index = mapping_result_item["mapping_id"]

                    if (
                        mapping_index < 0
                        or mapping_index >= len(active_mappings)
                    ):
                        continue

                    mapping = active_mappings[mapping_index]

                    documentation_matches = mapping.get(
                        "documentation_matches",
                        [],
                    )

                    for ai_result in mapping_result_item["results"]:
                        match_id = ai_result.get("match_id")

                        if (
                            not isinstance(match_id, int)
                            or isinstance(match_id, bool)
                            or match_id < 0
                            or match_id >= len(documentation_matches)
                        ):
                            print("SKIPPED: invalid match_id:", match_id)
                            continue

                        doc_match = documentation_matches[match_id]

                        if not ai_result.get("is_outdated", False):
                            print(
                                "FILTERED: AI marked current documentation",
                                "| FACT:", mapping.get("symbol"),
                            )
                            continue

                        confidence = ai_result.get("confidence", 0)

                        if confidence < 0.70:
                            print(
                                "FILTERED: confidence below 0.70",
                                "| FACT:", mapping.get("symbol"),
                                "| CONFIDENCE:", confidence,
                            )
                            continue

                        findings.append({
                            "id": f"finding-{len(findings) + 1}",
                            "type": mapping["kind"],
                            "severity": ai_result["severity"],
                            "docs_file": doc_match["docs_file"],
                            "docs_line": doc_match["docs_line"],
                            "documented_value": ai_result["documented_value"],
                            "actual_value": ai_result["actual_value"],
                            "code_file": mapping["source_file"],
                            "code_line": mapping["source_line"],
                            "explanation": ai_result["explanation"],
                            "suggestion": ai_result["suggestion"],
                            "confidence": confidence,
                        })

            print("Total Qwen batch requests:", total_qwen_requests)
            print("Total findings:", len(findings))
            print("==========================================\n")

            # 7. Prepare summary.
            summary = {
                "total_findings": len(findings),
                "high": sum(
                    finding["severity"] == "high"
                    for finding in findings
                ),
                "medium": sum(
                    finding["severity"] == "medium"
                    for finding in findings
                ),
                "low": sum(
                    finding["severity"] == "low"
                    for finding in findings
                ),
            }

            # 8. Return API response.
            return {
                "status": "completed",
                "repository": pr["repository"],
                "pr_number": pr["pr_number"],
                "pr_title": pr["title"],
                "summary": summary,
                "findings": findings,
                "analysis": {
                    "changed_files": pr["changed_files_count"],
                    "python_files_analyzed": len(code_analyses),
                    "documentation_files_scanned": len(documentation_files),
                    "code_facts": mapping_result["total_code_facts"],
                    "mapped_facts": mapping_result["mapped_facts"],
                    "qwen_requests": total_qwen_requests,
                },
            }

        except (GitHubServiceError, AIServiceError) as error:
            raise AnalysisServiceError(str(error)) from error

        except httpx.HTTPError as error:
            raise AnalysisServiceError(
                "Unable to retrieve repository data from GitHub."
            ) from error
