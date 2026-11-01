
from app.services.code_analyzer import analyze_python_code


def test_function_signature():
    source = """
def greet(name, age=18):
    return name
"""

    result = analyze_python_code(source, "example.py")

    function = result["functions"][0]

    assert function["name"] == "greet"
    assert function["line"] == 2
    assert function["parameters"][0]["name"] == "name"
    assert function["parameters"][1]["default"] == "18"


def test_cli_arguments():
    source = """
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--port", default=8000, type=int)
"""

    result = analyze_python_code(source, "cli.py")

    assert len(result["cli_arguments"]) == 1
    assert "--port" in result["cli_arguments"][0]["flags"]
    assert result["cli_arguments"][0]["options"]["default"] == "8000"


def test_configuration():
    source = """
MAX_RETRIES = 5
TIMEOUT = 30
"""

    result = analyze_python_code(source, "config.py")

    assert len(result["configurations"]) == 2
    assert result["configurations"][0]["name"] == "MAX_RETRIES"
    assert result["configurations"][0]["value"] == "5"


def test_invalid_python():
    source = "def broken(:"

    result = analyze_python_code(source, "broken.py")

    assert result["error"] is not None
    assert result["functions"] == []

