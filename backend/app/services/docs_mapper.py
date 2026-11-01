import re
from pathlib import PurePosixPath


SUPPORTED_DOC_SUFFIXES = (".md", ".mdx", ".rst")


def normalize_text(value: str) -> str:
    """Normalize text for matching."""
    return value.lower().replace("-", "_").strip()


def contains_term(text: str, term: str) -> bool:
    """Check whether a term occurs as a meaningful token."""
    if not term:
        return False

    if term.startswith("--"):
        return term.lower() in text.lower()

    pattern = (
        r"(?<![a-zA-Z0-9_])"
        + re.escape(term)
        + r"(?![a-zA-Z0-9_])"
    )
    return bool(re.search(pattern, text, re.IGNORECASE))


def _paragraph_context(lines: list[str], index: int) -> str:
    """
    Return the complete non-empty paragraph containing a matched line.

    Documentation often puts a function name on the first line and its
    behavioral description on the following lines. Matching only the
    function-name line deprives the AI verifier of the actual claim.
    """
    start = index
    end = index

    while start > 0 and lines[start - 1].strip():
        start -= 1

    while end + 1 < len(lines) and lines[end + 1].strip():
        end += 1

    return " ".join(line.strip() for line in lines[start:end + 1])


def extract_code_facts(code_analysis: dict) -> list:
    """Convert AST output into searchable code facts."""
    facts = []
    filename = code_analysis.get("filename", "")

    for function in code_analysis.get("functions", []):
        facts.append({
            "kind": "function",
            "symbol": function["name"],
            "source_file": filename,
            "source_line": function["line"],
            "actual_value": {
                "parameters": function.get("parameters", []),
                "return_annotation": function.get("return_annotation"),
            },
            "search_terms": [function["name"]],
        })

        # Also expose the implementation as a fact when callers use this
        # extractor directly (the PR comparison pipeline creates these
        # facts in compare_code_analyses).
        if function.get("body") is not None:
            facts.append({
                "kind": "function_behavior",
                "symbol": function.get("qualified_name", function["name"]),
                "source_file": filename,
                "source_line": function["line"],
                "actual_value": {"body": function.get("body", "")},
                "search_terms": [function["name"]],
            })

    for config in code_analysis.get("configurations", []):
        facts.append({
            "kind": "configuration",
            "symbol": config["name"],
            "source_file": filename,
            "source_line": config["line"],
            "actual_value": config["value"],
            "search_terms": [config["name"]],
        })

    for argument in code_analysis.get("cli_arguments", []):
        for flag in argument.get("flags", []):
            facts.append({
                "kind": "cli_argument",
                "symbol": flag,
                "source_file": filename,
                "source_line": argument["line"],
                "actual_value": argument.get("options", {}),
                "search_terms": [flag],
            })

    for class_info in code_analysis.get("classes", []):
        facts.append({
            "kind": "class",
            "symbol": class_info["name"],
            "source_file": filename,
            "source_line": class_info["line"],
            "actual_value": {
                "methods": class_info.get("methods", []),
            },
            "search_terms": [class_info["name"]],
        })

    return facts


def map_documentation(code_facts: list, documentation_files: list) -> list:
    """
    Map changed code facts to documentation paragraphs.

    A match retains the original starting line for UI navigation, but its
    `text` contains the whole paragraph so semantic verification can inspect
    the actual documented behavior rather than only a symbol-name line.
    """
    mappings = []

    for fact in code_facts:
        terms = [
            term for term in fact.get("search_terms", [])
            if isinstance(term, str) and term.strip()
        ]
        if not terms:
            continue

        matches = []
        seen_matches = set()

        for doc in documentation_files:
            filename = doc.get("filename", "")
            if PurePosixPath(filename).suffix.lower() not in SUPPORTED_DOC_SUFFIXES:
                continue

            content = doc.get("content", "")
            if not content:
                continue

            lines = content.splitlines()

            for index, line in enumerate(lines):
                matched_terms = [
                    term for term in terms if contains_term(line, term)
                ]
                if not matched_terms:
                    continue

                paragraph = _paragraph_context(lines, index)
                dedupe_key = (filename, paragraph)

                if dedupe_key in seen_matches:
                    continue

                seen_matches.add(dedupe_key)
                matches.append({
                    "docs_file": filename,
                    "docs_line": index + 1,
                    "text": paragraph,
                    "matched_terms": matched_terms,
                })

        if matches:
            mappings.append({
                "kind": fact.get("kind", "unknown"),
                "symbol": fact.get("symbol", ""),
                "source_file": fact.get("source_file", ""),
                "source_line": fact.get("source_line"),
                "previous_value": fact.get("previous_value"),
                "actual_value": fact.get("actual_value"),
                "documentation_matches": matches,
            })

    return mappings


def map_code_to_documentation(
    code_analyses: list,
    documentation_files: list,
) -> dict:
    """Run fact extraction and documentation mapping."""
    all_facts = []

    for analysis in code_analyses:
        if analysis.get("error"):
            continue
        all_facts.extend(extract_code_facts(analysis))

    mappings = map_documentation(all_facts, documentation_files)

    return {
        "total_code_facts": len(all_facts),
        "mapped_facts": len(mappings),
        "unmapped_facts": len(all_facts) - len(mappings),
        "mappings": mappings,
    }
