
import re
from pathlib import PurePosixPath


def normalize_text(value: str) -> str:
    """Normalize text for matching."""
    return value.lower().replace("-", "_").strip()


def contains_term(text: str, term: str) -> bool:
    """Check whether a term occurs as a meaningful token."""
    if term.startswith("--"):
        return term.lower() in text.lower()

    pattern = (
        r"(?<![a-zA-Z0-9_])"
        + re.escape(term)
        + r"(?![a-zA-Z0-9_])"
    )

    return bool(re.search(pattern, text, re.IGNORECASE))


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
                "parameters": function["parameters"],
                "return_annotation": function["return_annotation"]
            },
            "search_terms": [function["name"]]
        })

    for config in code_analysis.get("configurations", []):
        facts.append({
            "kind": "configuration",
            "symbol": config["name"],
            "source_file": filename,
            "source_line": config["line"],
            "actual_value": config["value"],
            "search_terms": [config["name"]]
        })

    for argument in code_analysis.get("cli_arguments", []):
        for flag in argument["flags"]:
            facts.append({
                "kind": "cli_argument",
                "symbol": flag,
                "source_file": filename,
                "source_line": argument["line"],
                "actual_value": argument["options"],
                "search_terms": [flag]
            })

    for class_info in code_analysis.get("classes", []):
        facts.append({
            "kind": "class",
            "symbol": class_info["name"],
            "source_file": filename,
            "source_line": class_info["line"],
            "actual_value": {
                "methods": class_info["methods"]
            },
            "search_terms": [class_info["name"]]
        })

    return facts


def map_documentation(code_facts: list, documentation_files: list) -> list:
    """
    Find documentation lines that refer to extracted code facts.

    documentation_files format:
    [
        {
            "filename": "README.md",
            "content": "# Usage\\n..."
        }
    ]
    """

    mappings = []

    for fact in code_facts:

        terms = fact.get("search_terms", [])
        matches = []

        for doc in documentation_files:

            filename = doc.get("filename", "")

            if PurePosixPath(filename).suffix.lower() not in (
                ".md", ".mdx", ".rst"
            ):
                continue

            content = doc.get("content", "")

            if not content:
                continue

            for line_number, line in enumerate(
                content.splitlines(), start=1
            ):

                matched_terms = [
                    term for term in terms
                    if contains_term(line, term)
                ]

                if not matched_terms:
                    continue

                matches.append({
                    "docs_file": filename,
                    "docs_line": line_number,
                    "text": line.strip(),
                    "matched_terms": matched_terms
                })

        if matches:
            mappings.append({
    "kind": fact["kind"],
    "symbol": fact["symbol"],
    "source_file": fact["source_file"],
    "source_line": fact["source_line"],
    "previous_value": fact.get("previous_value"),
    "actual_value": fact["actual_value"],
    "documentation_matches": matches
})

    return mappings


def map_code_to_documentation(
    code_analyses: list,
    documentation_files: list
) -> dict:
    """Run the complete fact extraction and documentation mapping."""

    all_facts = []

    for analysis in code_analyses:
        if analysis.get("error"):
            continue

        all_facts.extend(extract_code_facts(analysis))

    mappings = map_documentation(
        all_facts,
        documentation_files
    )

    return {
        "total_code_facts": len(all_facts),
        "mapped_facts": len(mappings),
        "unmapped_facts": len(all_facts) - len(mappings),
        "mappings": mappings
    }
