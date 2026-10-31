
from app.services.code_analyzer import (
    analyze_python_code,
    compare_code_analyses,
)


def test_deleted_function_is_detected():
    """A removed function should be reported as a changed code fact."""

    base = analyze_python_code(
        """
def calculate_tax(amount):
    return amount * 0.18
""",
        "tax.py",
    )

    head = analyze_python_code(
        """
def calculate_total(amount):
    return amount
""",
        "tax.py",
    )

    changes = compare_code_analyses(base, head)

    removed = [
        fact for fact in changes
        if fact["symbol"] == "calculate_tax"
    ]

    assert len(removed) == 1
    assert removed[0]["change_type"] == "removed"


def test_nested_functions_have_unique_qualified_names():
    """Same-named functions in different scopes must remain distinct."""

    result = analyze_python_code(
        """
def outer():
    def calculate():
        return 10

class Calculator:
    def calculate(self):
        return 20
""",
        "calculator.py",
    )

    function_names = {
        function["qualified_name"]
        for function in result["functions"]
    }

    assert "outer.calculate" in function_names
    assert "Calculator.calculate" in function_names
