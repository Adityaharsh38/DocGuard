import json
import re

import httpx


OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "qwen3:4b"
MAX_MATCHES_PER_BATCH = 1


class AIServiceError(Exception):
    """Raised when AI verification fails."""


class AIService:
    def __init__(self):
        self.model = MODEL_NAME
        self.url = OLLAMA_URL

    def _validate_result(self, result: dict) -> dict:
        """Validate one normalized AI verification result."""
        if not isinstance(result, dict):
            raise AIServiceError("AI returned an invalid JSON object.")

        required_fields = (
            "is_outdated",
            "severity",
            "confidence",
            "explanation",
            "documented_value",
            "actual_value",
            "suggestion",
        )
        # Optional fields may be omitted by Qwen.
        result.setdefault("suggestion", None)
        result.setdefault("documented_value", None)
        result.setdefault("actual_value", None)
        missing = [field for field in required_fields if field not in result]
        if missing:
            raise AIServiceError(f"AI response is missing fields: {missing}")

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
        """Send a JSON-only request to Ollama and return its JSON object."""
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": "/no_think\n" + prompt}],
            "stream": False,
            "format": "json",
            "think": False,
            "options": {
    "temperature": 0.1,
    "top_p": 0.8,
    "top_k": 20,
    "repeat_penalty": 1.2,
    "repeat_last_n": 128,
    "num_predict": 256,
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
                raise AIServiceError(
                    "Qwen returned empty content. "
                    f"Done reason: {response_data.get('done_reason')}."
                )

            result = json.loads(content)
            if not isinstance(result, dict):
                raise AIServiceError("Qwen returned an invalid JSON object.")

            return result

        except httpx.TimeoutException as error:
            raise AIServiceError(f"Ollama request timed out: {error}") from error
        except httpx.HTTPStatusError as error:
            raise AIServiceError(
                f"Ollama returned HTTP {error.response.status_code}: "
                f"{error.response.text[:1000]}"
            ) from error
        except httpx.RequestError as error:
            raise AIServiceError(
                f"Cannot connect to Ollama at {self.url}: "
                f"{type(error).__name__}: {error}"
            ) from error
        except json.JSONDecodeError as error:
            raise AIServiceError("Qwen returned invalid JSON.") from error

    def _configuration_fallback(self, mapping: dict) -> dict:
        """Deterministically compare numeric configuration values."""
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
                f"Documentation states {documented_value}, but the actual "
                f"code value is {actual_value}."
                if outdated
                else "Documentation matches the actual code value."
            ),
            "documented_value": documented_value if outdated else None,
            "actual_value": actual_value if outdated else None,
            "suggestion": (
                f"Update the documentation to use {actual_value}."
                if outdated
                else None
            ),
        }

    def _build_verification_prompt(self, item: dict) -> str:
        """Build a focused prompt for one code/documentation comparison."""
        fact = item.get("code_fact", {})
        documentation = item.get("documentation", {})
        kind = fact.get("kind")

        if kind == "function_behavior":
            instructions = ("""
You are checking whether documentation accurately describes
the actual behavior of a changed function.

IMPORTANT RULES:
1. The current implementation is the source of truth.
2. Compare the meaning of the documentation with the actual code.
3. Look for changed limits, caps, conditions, calculations,
   validation, defaults, and return behavior.
4. A documentation statement can be incorrect even if it
   does not explicitly mention the changed implementation detail.
5. If documentation says the FULL, ENTIRE, or PROVIDED
   percentage/value is applied, but the code limits it using
   min(), max(), a condition, or another cap, this IS a
   contradiction.
6. Do not mark documentation as correct merely because it
   does not explicitly mention the new restriction.
7. If the documentation contradicts the implementation,
   is_outdated MUST be true.

For this comparison:
- Documentation: "full discount percentage is applied"
- Actual code: discount = min(discount, 20)

The documentation is outdated because discounts above 20%
are capped at 20%.

Return valid JSON only with:
match_id, is_outdated, severity, confidence,
explanation, documented_value, actual_value, suggestion.

Use confidence between 0 and 1.
Do not omit any required field.
"""

            )
        elif kind == "function":
            instructions = (
                "This is a FUNCTION SIGNATURE fact. Compare documented "
                "parameters, defaults, and return annotations with the "
                "current signature. Do not infer implementation behavior "
                "from a signature alone."
            )
        else:
            instructions = (
                "Compare the current code fact with the documentation. "
                "Report only a concrete contradiction."
            )

        return (
            "You are DocGuard. Analyze exactly one documentation match.\n"
            f"{instructions}\n"
            "Return ONLY a JSON object with exactly these keys:\n"
            '{"match_id":0,"is_outdated":false,"severity":"low",'
            '"confidence":0.0,"explanation":"...",'
            '"documented_value":null,"actual_value":null,"suggestion":null}\n'
            "Set is_outdated true only if the documentation contradicts "
            "the current code. If true, explain the mismatch and provide "
            "a specific correction. If false, use null for the three value/"
            "suggestion fields. Do not repeat or return the input object.\n"
            "INPUT:\n"
            + json.dumps(item, separators=(",", ":"), default=str)
        )

    def _build_repair_prompt(self, item: dict) -> str:
        """Short retry prompt for models that echo the input instead of answering."""
        fact = item.get("code_fact", {})
        doc = item.get("documentation", {})
        compact = {
            "kind": fact.get("kind"),
            "symbol": fact.get("symbol"),
            "previous_value": fact.get("previous_value"),
            "actual_value": fact.get("actual_value"),
            "documentation_text": doc.get("text", ""),
        }
        return (
            "TASK: Decide whether documentation_text is contradicted by "
            "actual_value. Current code is authoritative. Return a NEW "
            "JSON answer, never copy the input.\n"
            "Required JSON schema:\n"
            '{"match_id":0,"is_outdated":false,"severity":"low",'
            '"confidence":0.0,"explanation":"reason",'
            '"documented_value":null,"actual_value":null,"suggestion":null}\n'
            "For a behavior fact, inspect the current function body for "
            "restrictions/caps/formula changes. If documentation says the "
            "full discount is applied but current code caps it at 20%, "
            "set is_outdated=true and explain that contradiction.\n"
            "INPUT:\n"
            + json.dumps(compact, separators=(",", ":"), default=str)
        )

    async def _verify_item(self, item: dict) -> dict:
        """Ask Qwen, retry once with a shorter prompt if it echoes bad JSON."""
        last_error = None
        for prompt in (
            self._build_verification_prompt(item),
            self._build_repair_prompt(item),
        ):
            try:
                response = await self._request_ollama(prompt)

                # Accept common wrapped response shapes.
                if isinstance(response.get("result"), dict):
                    response = response["result"]
                elif (
                    isinstance(response.get("results"), list)
                    and len(response["results"]) == 1
                    and isinstance(response["results"][0], dict)
                ):
                    response = response["results"][0]

                response.setdefault("match_id", 0)
                return self._validate_result(response)
            except AIServiceError as error:
                last_error = error

        raise AIServiceError(
            f"Qwen failed to produce a valid verification after retry: "
            f"{last_error}"
        )

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

        if mapping.get("kind") == "configuration":
            try:
                return self._configuration_fallback(mapping)
            except AIServiceError:
                pass

        item = {
            "match_id": 0,
            "code_fact": {
                "kind": mapping.get("kind"),
                "symbol": mapping.get("symbol"),
                "source_file": mapping.get("source_file"),
                "source_line": mapping.get("source_line"),
                "previous_value": mapping.get("previous_value"),
                "actual_value": mapping.get("actual_value"),
            },
            "documentation": matches[0],
        }
        return await self._verify_item(item)

    async def verify_documentation_batch(self, mapping: dict) -> list:
        """Verify all documentation matches for one code fact."""
        results = await self.verify_all_documentation_batches([mapping])
        return results[0]["results"] if results else []

    def _extract_batch_results(self, response: dict, batch_size: int) -> list:
        """Normalize common Qwen response structures."""
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
                f"Qwen returned {len(results)} results; expected {batch_size}."
            )
        return results

    async def verify_all_documentation_batches(self, mappings: list) -> list:
        """Verify every mapped match and group results by mapping."""
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
        for item in flattened_matches:
            mapping = mappings[item["mapping_id"]]

            # Numeric config mismatches do not need probabilistic inference.
            if mapping.get("kind") == "configuration":
                single_mapping = {
                    **mapping,
                    "documentation_matches": [item["documentation"]],
                }
                try:
                    result = self._configuration_fallback(single_mapping)
                    result["match_id"] = item["original_match_id"]
                    verified[item["match_id"]] = self._validate_result(result)
                    continue
                except AIServiceError:
                    pass

            model_item = {
                "match_id": 0,
                "code_fact": item["code_fact"],
                "documentation": item["documentation"],
            }
            result = await self._verify_item(model_item)
            result["match_id"] = item["original_match_id"]
            verified[item["match_id"]] = result

        grouped_results = {}
        for item in flattened_matches:
            mapping_id = item["mapping_id"]
            grouped_results.setdefault(mapping_id, [])
            grouped_results[mapping_id].append({
                "match_id": item["original_match_id"],
                **verified[item["match_id"]],
            })

        return [
            {"mapping_id": mapping_id, "results": results}
            for mapping_id, results in sorted(grouped_results.items())
        ]
