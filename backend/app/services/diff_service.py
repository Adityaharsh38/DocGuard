
import re


HUNK_PATTERN = re.compile(
    r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@"
)


def parse_patch(patch: str):
    """
    Parse a unified diff patch and extract added/deleted lines
    with their respective line numbers.
    """

    if not patch:
        return {
            "added_lines": [],
            "deleted_lines": [],
            "hunks": 0
        }

    added_lines = []
    deleted_lines = []
    old_line = 0
    new_line = 0
    hunk_count = 0

    for line in patch.splitlines():

        # Detect the beginning of a diff hunk.
        match = HUNK_PATTERN.match(line)

        if match:
            old_line = int(match.group(1))
            new_line = int(match.group(3))
            hunk_count += 1
            continue

        # Ignore diff metadata.
        if line.startswith(("+++", "---", "diff ", "index ")):
            continue

        if line.startswith("+"):
            added_lines.append({
                "line_number": new_line,
                "content": line[1:]
            })
            new_line += 1

        elif line.startswith("-"):
            deleted_lines.append({
                "line_number": old_line,
                "content": line[1:]
            })
            old_line += 1

        elif line.startswith("\\"):
            # Ignore "No newline at end of file" markers.
            continue

        else:
            # Context line exists in both versions.
            old_line += 1
            new_line += 1

    return {
        "added_lines": added_lines,
        "deleted_lines": deleted_lines,
        "hunks": hunk_count
    }


def analyze_changed_files(changed_files: list):
    """
    Categorize PR files and parse their patches.
    """

    results = {
        "source_files": [],
        "documentation_files": [],
        "other_files": [],
        "total_added_lines": 0,
        "total_deleted_lines": 0
    }

    for file in changed_files:

        filename = file.get("filename", "")
        extension = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        patch_data = parse_patch(file.get("patch"))

        file_result = {
            "filename": filename,
            "status": file.get("status"),
            "additions": file.get("additions", 0),
            "deletions": file.get("deletions", 0),
            "added_lines": patch_data["added_lines"],
            "deleted_lines": patch_data["deleted_lines"],
            "hunks": patch_data["hunks"],
            "patch_available": bool(file.get("patch"))
        }

        results["total_added_lines"] += len(patch_data["added_lines"])
        results["total_deleted_lines"] += len(patch_data["deleted_lines"])

        if extension == "py":
            results["source_files"].append(file_result)

        elif extension in ("md", "mdx", "rst"):
            results["documentation_files"].append(file_result)

        else:
            results["other_files"].append(file_result)

    return results
