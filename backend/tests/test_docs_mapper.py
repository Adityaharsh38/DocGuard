
from app.services.docs_mapper import (
    extract_code_facts,
    map_documentation,
    map_code_to_documentation
)


def test_extract_code_facts():
    analysis = {
        "filename": "app.py",
        "error": None,
        "functions": [
            {
                "name": "create_user",
                "line": 10,
                "parameters": [],
                "return_annotation": None
            }
        ],
        "classes": [],
        "cli_arguments": [],
        "configurations": []
    }

    facts = extract_code_facts(analysis)

    assert len(facts) == 1
    assert facts[0]["symbol"] == "create_user"


def test_map_documentation():
    facts = [
        {
            "kind": "function",
            "symbol": "create_user",
            "source_file": "app.py",
            "source_line": 10,
            "actual_value": {},
            "search_terms": ["create_user"]
        }
    ]

    docs = [
        {
            "filename": "README.md",
            "content": (
                "# API Reference\n"
                "The create_user function creates a new user.\n"
                "Other documentation."
            )
        }
    ]

    result = map_documentation(facts, docs)

    assert len(result) == 1
    assert result[0]["documentation_matches"][0]["docs_line"] == 2


def test_no_false_symbol_match():
    facts = [
        {
            "kind": "function",
            "symbol": "user",
            "source_file": "app.py",
            "source_line": 1,
            "actual_value": {},
            "search_terms": ["user"]
        }
    ]

    docs = [
        {
            "filename": "README.md",
            "content": "The username is required."
        }
    ]

    result = map_documentation(facts, docs)

    assert result == []


def test_complete_mapping():
    analyses = [
        {
            "filename": "config.py",
            "error": None,
            "functions": [],
            "classes": [],
            "cli_arguments": [],
            "configurations": [
                {
                    "name": "MAX_RETRIES",
                    "value": "5",
                    "line": 1
                }
            ]
        }
    ]

    docs = [
        {
            "filename": "README.md",
            "content": "MAX_RETRIES controls retry attempts."
        }
    ]

    result = map_code_to_documentation(analyses, docs)

    assert result["total_code_facts"] == 1
    assert result["mapped_facts"] == 1
    assert result["unmapped_facts"] == 0
