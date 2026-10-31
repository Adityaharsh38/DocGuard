
import ast
from typing import Any


def get_source_lines(source: str):
    """Return source code as individual lines."""
    return source.splitlines()

def get_default_value(node):
    """Convert an AST default value into readable source text."""
    if node is None:
        return None

    return ast.unparse(node)


def get_qualified_name(node, parent_map):
    """Build a function's qualified name from its enclosing scopes."""

    parts = []
    current = node

    while current in parent_map:
        current = parent_map[current]

        if isinstance(
            current,
            (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
        ):
            parts.append(current.name)

    parts.reverse()
    parts.append(node.name)

    return ".".join(parts)


def get_function_body(node):
    """Return normalized function implementation, excluding its docstring."""
    body_nodes = list(node.body)

    if (
        body_nodes
        and isinstance(body_nodes[0], ast.Expr)
        and isinstance(body_nodes[0].value, ast.Constant)
        and isinstance(body_nodes[0].value.value, str)
    ):
        body_nodes = body_nodes[1:]

    module = ast.Module(body=body_nodes, type_ignores=[])

    return {
        "source": ast.unparse(module).strip(),
        "fingerprint": ast.dump(module, include_attributes=False),
    }


def analyze_python_code(source: str, filename: str = "") -> dict[str, Any]:
    """
    Extract functions, classes, parameters, defaults,
    argparse flags and configuration assignments from Python code.
    """

    try:
        tree = ast.parse(source)
        parent_map = {
    child: parent
    for parent in ast.walk(tree)
    for child in ast.iter_child_nodes(parent)
}
    except SyntaxError as error:
        return {
            "filename": filename,
            "error": f"Syntax error at line {error.lineno}: {error.msg}",
            "functions": [],
            "classes": [],
            "cli_arguments": [],
            "configurations": []
        }

    lines = get_source_lines(source)

    functions = []
    classes = []
    cli_arguments = []
    configurations = []

    # Extract function definitions and their signatures.
    for node in ast.walk(tree):

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):

            args = node.args

            positional_args = (
                args.posonlyargs + args.args
            )

            defaults_start = len(positional_args) - len(args.defaults)

            parameters = []

            for index, argument in enumerate(positional_args):

                default = None

                if index >= defaults_start:
                    default = get_default_value(
                        args.defaults[index - defaults_start]
                    )

                parameters.append({
                    "name": argument.arg,
                    "default": default,
                    "has_default": default is not None,
                    "kind": (
                        "positional_only"
                        if index < len(args.posonlyargs)
                        else "positional_or_keyword"
                    )
                })

            for argument, default_node in zip(
                args.kwonlyargs,
                args.kw_defaults
            ):
                default = get_default_value(default_node)

                parameters.append({
                    "name": argument.arg,
                    "default": default,
                    "has_default": default is not None,
                    "kind": "keyword_only"
                })

            if args.vararg:
                parameters.append({
                    "name": args.vararg.arg,
                    "default": None,
                    "has_default": False,
                    "kind": "var_positional"
                })

            if args.kwarg:
                parameters.append({
                    "name": args.kwarg.arg,
                    "default": None,
                    "has_default": False,
                    "kind": "var_keyword"
                })

            body_info = get_function_body(node)

            functions.append({
                "name": node.name,
                "qualified_name": get_qualified_name(node, parent_map),
                "line": node.lineno,
                "end_line": node.end_lineno,
                "async": isinstance(node, ast.AsyncFunctionDef),
                "parameters": parameters,
                "return_annotation": (
                    ast.unparse(node.returns)
                    if node.returns else None
                ),
                "body": body_info["source"],
                "body_fingerprint": body_info["fingerprint"],
                "source": lines[node.lineno - 1:node.end_lineno]
            })

        elif isinstance(node, ast.ClassDef):

            classes.append({
                "name": node.name,
                "line": node.lineno,
                "end_line": node.end_lineno,
                "methods": [
                    child.name
                    for child in node.body
                    if isinstance(
                        child,
                        (ast.FunctionDef, ast.AsyncFunctionDef)
                    )
                ]
            })

        # Extract argparse declarations.
        elif isinstance(node, ast.Call):

            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "add_argument"
            ):
                flags = [
                    ast.literal_eval(arg)
                    for arg in node.args
                    if isinstance(arg, ast.Constant)
                    and isinstance(arg.value, str)
                ]

                if flags:
                    keywords = {
                        keyword.arg: ast.unparse(keyword.value)
                        for keyword in node.keywords
                        if keyword.arg
                    }

                    cli_arguments.append({
                        "flags": flags,
                        "line": node.lineno,
                        "options": keywords
                    })

        # Extract simple configuration assignments.
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):

            targets = (
                node.targets
                if isinstance(node, ast.Assign)
                else [node.target]
            )

            value = node.value

            if value is None:
                continue

            for target in targets:

                if isinstance(target, ast.Name):

                    configurations.append({
                        "name": target.id,
                        "value": ast.unparse(value),
                        "line": node.lineno
                    })

    return {
        "filename": filename,
        "error": None,
        "functions": functions,
        "classes": classes,
        "cli_arguments": cli_arguments,
        "configurations": configurations
    }

def compare_code_analyses(
    base_analysis: dict,
    head_analysis: dict
) -> list:
    """
    Compare Python code facts between the PR base and head versions.

    Returns only newly added or modified code facts.
    """

    if base_analysis.get("error") or head_analysis.get("error"):
        return []

    changed_facts = []

    def index_items(items, key):
        return {
            item[key]: item
            for item in items
        }

    # 1. Compare function signatures.
    base_functions = {
    item.get("qualified_name", item["name"]): item
    for item in base_analysis.get("functions", [])
}

    head_functions = {
    item.get("qualified_name", item["name"]): item
    for item in head_analysis.get("functions", [])
}

    for name, head in head_functions.items():
        base = base_functions.get(name)

        actual_value = {
            "parameters": head["parameters"],
            "return_annotation": head["return_annotation"]
        }

        previous_value = None

        if base:
            previous_value = {
                "parameters": base["parameters"],
                "return_annotation": base["return_annotation"]
            }

        if previous_value != actual_value:
            changed_facts.append({
                "kind": "function",
                "symbol": name,
                "source_file": head_analysis["filename"],
                "source_line": head["line"],
                "previous_value": previous_value,
                "actual_value": actual_value,
                "search_terms": [name]
            })
        # Detect implementation changes separately from signature changes.
        previous_fingerprint = (
            base.get("body_fingerprint") if base else None
        )
        actual_fingerprint = head.get("body_fingerprint")

        # Also report newly added functions: their initial behavior
        # must be compared with any documentation introduced in the PR.
        if (
            actual_fingerprint is not None
            and (
                base is None
                or previous_fingerprint != actual_fingerprint
            )
        ):
            changed_facts.append({
                "kind": "function_behavior",
                "symbol": name,
                "source_file": head_analysis["filename"],
                "source_line": head["line"],
                "previous_value": (
                    {"body": base.get("body", "")}
                    if base else None
                ),
                "actual_value": {
                    "body": head.get("body", "")
                },
                "search_terms": [head.get("name", name)],
            })

        # Detect removed functions.
    for name, base in base_functions.items():
        if name not in head_functions:
            changed_facts.append({
                "kind": "function",
                "symbol": base.get("qualified_name", base["name"]),
                "source_file": head_analysis["filename"],
                "source_line": base["line"],
                "previous_value": {
                    "parameters": base["parameters"],
                    "return_annotation": base["return_annotation"]
                },
                "actual_value": None,
                "search_terms": [base["name"]],
                "change_type": "removed"
            })
    # 2. Compare configuration values.
    base_configs = index_items(
        base_analysis.get("configurations", []), "name"
    )

    head_configs = index_items(
        head_analysis.get("configurations", []), "name"
    )

    for name, head in head_configs.items():
        base = base_configs.get(name)

        previous_value = base["value"] if base else None
        actual_value = head["value"]

        if previous_value != actual_value:
            changed_facts.append({
                "kind": "configuration",
                "symbol": name,
                "source_file": head_analysis["filename"],
                "source_line": head["line"],
                "previous_value": previous_value,
                "actual_value": actual_value,
                "search_terms": [name]
            })

    # 3. Compare CLI arguments.
    base_cli = {
        flag: argument
        for argument in base_analysis.get("cli_arguments", [])
        for flag in argument["flags"]
    }

    head_cli = {
        flag: argument
        for argument in head_analysis.get("cli_arguments", [])
        for flag in argument["flags"]
    }

    for flag, head in head_cli.items():
        base = base_cli.get(flag)

        previous_value = base["options"] if base else None
        actual_value = head["options"]

        if previous_value != actual_value:
            changed_facts.append({
                "kind": "cli_argument",
                "symbol": flag,
                "source_file": head_analysis["filename"],
                "source_line": head["line"],
                "previous_value": previous_value,
                "actual_value": actual_value,
                "search_terms": [flag]
            })

    # 4. Compare class methods.
    base_classes = index_items(
        base_analysis.get("classes", []), "name"
    )

    head_classes = index_items(
        head_analysis.get("classes", []), "name"
    )

    for name, head in head_classes.items():
        base = base_classes.get(name)

        previous_methods = base["methods"] if base else []
        actual_methods = head["methods"]

        if previous_methods != actual_methods:
            changed_facts.append({
                "kind": "class",
                "symbol": name,
                "source_file": head_analysis["filename"],
                "source_line": head["line"],
                "previous_value": {
                    "methods": previous_methods
                },
                "actual_value": {
                    "methods": actual_methods
                },
                "search_terms": [name]
            })

    return changed_facts
