
from app.services.code_analyzer import (
    analyze_python_code,
    compare_code_analyses
)


def test_detect_changed_function_default():
    base = analyze_python_code(
        "def connect(timeout=10):\n    pass",
        "app.py"
    )

    head = analyze_python_code(
        "def connect(timeout=30):\n    pass",
        "app.py"
    )

    changes = compare_code_analyses(base, head)

    assert len(changes) == 1
    assert changes[0]["symbol"] == "connect"
    assert changes[0]["previous_value"]["parameters"][0]["default"] == "10"
    assert changes[0]["actual_value"]["parameters"][0]["default"] == "30"


def test_detect_changed_configuration():
    base = analyze_python_code(
        "MAX_RETRIES = 3",
        "config.py"
    )

    head = analyze_python_code(
        "MAX_RETRIES = 5",
        "config.py"
    )

    changes = compare_code_analyses(base, head)

    assert len(changes) == 1
    assert changes[0]["previous_value"] == "3"
    assert changes[0]["actual_value"] == "5"


def test_ignore_unchanged_code():
    base = analyze_python_code(
        "TIMEOUT = 30",
        "config.py"
    )

    head = analyze_python_code(
        "TIMEOUT = 30",
        "config.py"
    )

    changes = compare_code_analyses(base, head)

    assert changes == []
