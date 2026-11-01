
from app.services.diff_service import (
    parse_patch,
    analyze_changed_files
)


def test_parse_patch():
    patch = """@@ -1,3 +1,4 @@
 import os
-def greet():
+def greet(name):
+    print(name)
     return True
"""

    result = parse_patch(patch)

    assert result["hunks"] == 1
    assert len(result["added_lines"]) == 2
    assert len(result["deleted_lines"]) == 1

    assert result["added_lines"][0]["line_number"] == 2
    assert result["deleted_lines"][0]["line_number"] == 2


def test_analyze_changed_files():
    files = [
        {
            "filename": "app.py",
            "status": "modified",
            "additions": 2,
            "deletions": 1,
            "patch": "@@ -1 +1,2 @@\n-old\n+new\n+another"
        },
        {
            "filename": "README.md",
            "status": "modified",
            "additions": 1,
            "deletions": 0,
            "patch": "@@ -1 +1,2 @@\n+Updated docs"
        }
    ]

    result = analyze_changed_files(files)

    assert len(result["source_files"]) == 1
    assert len(result["documentation_files"]) == 1
