import json
import re
import httpx


OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "qwen3:4b"
MAX_MATCHES_PER_BATCH = 1


class AIServiceError(Exception):
    """Raised when AI verification fails."""
    pass


class AIService:

    def __init__(self):
        self.model = MODEL_NAME
        self.url = OLLAMA_URL

    def _validate_result(self, result: dict) -> dict:
        """Validate a documentation verification result."""
        if not isinstance(result, dict):
            raise AIServiceError("AI returned an invalid JSON object.")

        required_fields = [
            "is_outdated",
            "severity",
            "confidence",
            "explanation",
            "documented_value",
            "actual_value",
            "suggestion",
        ]
        missing = [field for field in required_fields if field not in result]

        if missing:
            raise AIServiceError(
                f"AI response is missing fields: {missing}"
            )

        if not isinstance(result["is_outdated"], bool):
            raise AIServiceError("Invalid is_outdated value.")

        if result["severity"] not in ("high", "medium", "low"):
            raise AIServiceError("Invalid severity.")

        confidence = result["confidence"]
        if (
            not isinstance(confidence, (int, float))
            or isinstance(confidence, bool)
            or not 0 <= confidence <= 1
        ):
            raise AIServiceError("Invalid confidence score.")

        return result

    async def _request_ollama(self, prompt: str) -> dict:
        """Send a JSON-only request to Ollama."""
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": "/no_think\n" + prompt,
                }
            ],
            "stream": False,
            "format": "json",
            "think": False,
            "options": {
                "temperature": 0,
                "num_predict": 512,
                "num_ctx": 4096,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(self.url, json=payload)
                response.raise_for_status()

            response_data = response.json()
            message = response_data.get("message", {})
            content = message.get("content", "").strip()

            if not content:
                done_reason = response_data.get("done_reason", "unknown")
                thinking = message.get("thinking", "")
                raise AIServiceError(
                    "Qwen returned empty content. "
                    f"Reason: {done_reason}. "
                    f"Thinking length: {len(thinking)}."
                )

            result = json.loads(content)
            if not isinstance(result, dict):
                raise AIServiceError(
                    "Qwen returned an invalid JSON object."
                )
            return result

        except httpx.TimeoutException as error:
            raise AIServiceError("Qwen request timed out.") from error
        except httpx.HTTPError as error:
            raise AIServiceError(
                "Unable to communicate with Ollama. "
                "Check whether Ollama is running."
            ) from error
        except json.JSONDecodeError as error:
            raise AIServiceError("Qwen returned invalid JSON.") from error

    def _configuration_fallback(self, mapping: dict) -> dict:
        """Fallback for numeric configuration mismatches only."""
        matches = mapping.get("documentation_matches", [])
        if not matches or mapping.get("kind") != "configuration":
            raise AIServiceError(
                "Fallback supports numeric configuration facts only."
            )

        documented_text = str(matches[0].get("text", ""))
        actual = str(mapping.get("actual_value", "")).strip()
        number_pattern = r"(?<![A-Za-z_])[-+]?\d+(?:\.\d+)?"

        documented_numbers = re.findall(number_pattern, documented_text)
        actual_numbers = re.findall(number_pattern, actual)

        if not documented_numbers or not actual_numbers:
            raise AIServiceError(
                "Could not extract numeric configuration values."
            )

        documented_value = documented_numbers[-1]
        actual_value = actual_numbers[-1]
        outdated = documented_value != actual_value

        return {
            "is_outdated": outdated,
            "severity": "high" if outdated else "low",
            "confidence": 0.95,
            "explanation": (
                f"Documentation states {documented_value}, "
                f"but the actual code value is {actual_value}."
                if outdated
                else "Documentation matches the actual code value."
            ),
            "documented_value": documented_value if outdated else None,
            "actual_value": actual_value if outdated else None,
            "suggestion": (
                f"Update the documentation to use {actual_value}."
                if outdated else None
            ),
        }

    async def verify_documentation(self, mapping: dict) -> dict:
        """Verify the first documentation match for one code fact."""
        matches = mapping.get("documentation_matches", [])
        if not matches:
            return {
                "is_outdated": False,
                "severity": "low",
                "confidence": 0.0,
                "explanation": "No documentation matches found.",
                "documented_value": None,
                "actual_value": None,
                "suggestion": None,
            }

        input_data = {
            "kind": mapping.get("kind"),
            "symbol": mapping.get("symbol"),
            "source_file": mapping.get("source_file"),
            "source_line": mapping.get("source_line"),
            "previous_value": mapping.get("previous_value"),
            "actual_value": mapping.get("actual_value"),
            "documentation": matches[0],
        }

        prompt = f"""
You are DocGuard, a documentation drift detector.
Compare the actual code fact with its documentation.

Rules:
- Actual code is the source of truth.
- Detect only genuine contradictions.
- Do not invent values or behavior.
- Missing documentation is not automatically outdated.
- Return a verification result, not the input data.

Input:
{json.dumps(input_data, separators=(",", ":"))}

Return ONLY a JSON object with these fields:
{{
    "is_outdated": false,
    "severity": "low",
    "confidence": 0.0,
    "explanation": "No documentation drift detected.",
    "documented_value": null,
    "actual_value": null,
    "suggestion": null
}}

For genuine outdated documentation, set is_outdated to true,
explain the mismatch, include both values and suggest a correction.
Severity must be high, medium or low.
Confidence must be between 0 and 1.
Return JSON only.
"""
        try:
            result = await self._request_ollama(prompt)
            return self._validate_result(result)
        except (AIServiceError, TypeError, AttributeError):
            return self._configuration_fallback(mapping)

    async def verify_documentation_batch(self, mapping: dict) -> list:
        """Verify all documentation matches for one code fact."""
        results = await self.verify_all_documentation_batches([mapping])
        if not results:
            return []
        return results[0]["results"]

    def _extract_batch_results(
        self,
        response: dict,
        batch_size: int,
    ) -> list:
        """Normalize common Qwen response shapes."""
        results = response.get("results")

        if isinstance(results, dict):
            results = [results]
        elif not isinstance(results, list):
            single_result = response.get("result")
            if isinstance(single_result, dict):
                results = [single_result]
            elif "is_outdated" in response:
                results = [response]
            else:
                raise AIServiceError(
                    "Qwen returned an unsupported response structure. "
                    f"Response keys: {list(response.keys())}"
                )

        if len(results) != batch_size:
            raise AIServiceError(
                f"Qwen returned {len(results)} results; "
                f"expected {batch_size}."
            )
        return results

    async def verify_all_documentation_batches(
        self,
        mappings: list,
    ) -> list:
        """
        Verify multiple code facts using bounded Qwen requests.
        Each request uses local match IDs; original IDs are preserved.
        """
        flattened_matches = []

        for mapping_index, mapping in enumerate(mappings):
            for match_index, match in enumerate(
                mapping.get("documentation_matches", [])
            ):
                flattened_matches.append({
                    "match_id": len(flattened_matches),
                    "mapping_id": mapping_index,
                    "original_match_id": match_index,
                    "code_fact": {
                        "kind": mapping.get("kind"),
                        "symbol": mapping.get("symbol"),
                        "source_file": mapping.get("source_file"),
                        "source_line": mapping.get("source_line"),
                        "previous_value": mapping.get("previous_value"),
                        "actual_value": mapping.get("actual_value"),
                    },
                    "documentation": match,
                })

        if not flattened_matches:
            return []

        verified = {}

        for start in range(
            0,
            len(flattened_matches),
            MAX_MATCHES_PER_BATCH,
        ):
            batch = flattened_matches[
                start:start + MAX_MATCHES_PER_BATCH
            ]

            model_batch = [
                {**item, "match_id": local_id}
                for local_id, item in enumerate(batch)
            ]

            prompt = f"""
You are DocGuard, a precise documentation drift detector.
Compare each actual code fact with its documentation.

Rules:
1. Actual code is the source of truth.
2. Detect only genuine documentation inaccuracies.
3. Do not report harmless code changes.
4. Missing documentation is not automatically outdated.
5. Never invent values or behavior.
6. Evaluate every item independently.
7. Return one result for every input item.
8. Preserve the supplied match_id.
9. Return JSON only.

Input:
{json.dumps(model_batch, separators=(",", ":"))}

Return this structure:
{{
    "results": [
        {{
            "match_id": 0,
            "is_outdated": false,
            "severity": "low",
            "confidence": 0.0,
            "explanation": "No documentation drift detected.",
            "documented_value": null,
            "actual_value": null,
            "suggestion": null
        }}
    ]
}}

For outdated documentation:
- Set is_outdated to true.
- Explain the exact mismatch.
- Include documented_value and actual_value.
- Provide a correction suggestion.
- Severity must be high, medium or low.
- Confidence must be between 0 and 1.
Return every match_id exactly once.
"""

            response = await self._request_ollama(prompt)
            results = self._extract_batch_results(response, len(batch))

            expected_local_ids = set(range(len(batch)))
            batch_results = {}

            for result in results:
                if not isinstance(result, dict):
                    raise AIServiceError(
                        "Qwen returned an invalid batch result."
                    )

                # A one-item batch has only one possible target.
                # Ignore Qwen's ID entirely in this case, whether it
                # omits it or returns it as an unexpected type/value.
                if len(batch) == 1:
                    local_id = 0
                else:
                    local_id = result.get("match_id")

                    if (
                        isinstance(local_id, str)
                        and local_id.strip().isdigit()
                    ):
                        local_id = int(local_id.strip())

                    if (
                        not isinstance(local_id, int)
                        or isinstance(local_id, bool)
                        or local_id not in expected_local_ids
                    ):
                        raise AIServiceError(
                            "Qwen returned invalid local match ID: "
                            f"{local_id}"
                        )

                if local_id in batch_results:
                    raise AIServiceError(
                        "Qwen returned a duplicate match ID."
                    )

                validated = self._validate_result(result)
                original_id = batch[local_id]["match_id"]
                batch_results[original_id] = validated

            if len(batch_results) != len(batch):
                raise AIServiceError(
                    "Qwen did not return a result for every match."
                )

            verified.update(batch_results)

        grouped_results = {}

        for item in flattened_matches:
            mapping_id = item["mapping_id"]
            grouped_results.setdefault(mapping_id, [])
            grouped_results[mapping_id].append({
                "match_id": item["original_match_id"],
                **verified[item["match_id"]],
            })

        return [
            {
                "mapping_id": mapping_id,
                "results": results,
            }
            for mapping_id, results in sorted(grouped_results.items())
        ]
