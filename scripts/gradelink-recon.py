"""Reconnaissance pass over the Gradelink export CSVs.

Goal: figure out
  (1) which columns are actually populated (so we don't migrate empty cruft),
  (2) row counts per file,
  (3) overlap between the active and inactive rosters (any student showing up
      in both is a red flag),
  (4) a list of obvious duplicate-name candidates within each roster.

Read-only, prints to stdout, no DB calls. Run this from the repo root:
  python scripts/gradelink-recon.py
"""

from __future__ import annotations

import csv
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("hba gradelink migration")

# Files we want to profile, plus a friendly label.
FILES: list[tuple[str, str]] = [
    ("StudentRosterActive.csv", "Active students"),
    ("StudentRosterInactive.csv", "Inactive students"),
    ("StudentContactsActive.csv", "Active contacts"),
    ("StudentContactsInactive.csv", "Inactive contacts"),
    ("staff.csv", "Staff"),
    ("AllStudentGradesExport.csv", "Grades"),
    ("TranscriptExport.csv", "Transcript"),
    ("EnrollMeForms.csv", "Enroll-me forms"),
    ("StudentDocumentsActive.csv", "Active student documents"),
    ("StudentDocumentsInactive.csv", "Inactive student documents"),
    ("DailyAttendanceExport.csv", "Attendance"),
    ("MicrosoftExport/School.csv", "MS School"),
    ("MicrosoftExport/Section.csv", "MS Section"),
    ("MicrosoftExport/Student.csv", "MS Student"),
    ("MicrosoftExport/StudentEnrollment.csv", "MS StudentEnrollment"),
    ("MicrosoftExport/Teacher.csv", "MS Teacher"),
    ("MicrosoftExport/TeacherRoster.csv", "MS TeacherRoster"),
]


def profile(path: Path, label: str) -> None:
    """Print column population stats + a few sample values for one CSV."""
    print()
    print(f"=== {label} ({path.name}) ===")
    if not path.exists():
        print("  (missing)")
        return
    if path.stat().st_size == 0:
        print("  (empty)")
        return
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        cols = reader.fieldnames or []
        rows = list(reader)
    print(f"  Rows: {len(rows)}")
    print(f"  Columns: {len(cols)}")
    if not rows:
        return
    populated: list[tuple[str, int, str]] = []
    empty: list[str] = []
    for col in cols:
        filled = sum(1 for r in rows if (r.get(col) or "").strip())
        if filled == 0:
            empty.append(col)
            continue
        sample = next(
            ((r.get(col) or "").strip() for r in rows if (r.get(col) or "").strip()),
            "",
        )
        sample_short = sample.replace("\n", " | ")[:60]
        populated.append((col, filled, sample_short))
    print(f"  Populated columns ({len(populated)}):")
    for col, filled, sample in populated:
        print(f"    {col:32}  {filled:5}/{len(rows):5}  e.g. {sample!r}")
    if empty:
        print(f"  Empty columns ({len(empty)}): {', '.join(empty)}")


def roster_overlap() -> None:
    """Look for students appearing in both active and inactive rosters."""
    print()
    print("=== Active vs inactive roster overlap ===")
    active = _read_roster(ROOT / "StudentRosterActive.csv")
    inactive = _read_roster(ROOT / "StudentRosterInactive.csv")
    active_ids = {r["StudentID"] for r in active}
    inactive_ids = {r["StudentID"] for r in inactive}
    overlap_ids = active_ids & inactive_ids
    print(f"  Active count:   {len(active_ids)}")
    print(f"  Inactive count: {len(inactive_ids)}")
    print(f"  StudentID overlap: {len(overlap_ids)}")
    if overlap_ids:
        for sid in sorted(overlap_ids):
            a = next(r for r in active if r["StudentID"] == sid)
            print(f"    {sid}: {a['FullName']}")


def name_collisions() -> None:
    """Surface fuzzy-name collisions inside each roster.

    Quick heuristic: lowercase + strip; if two students share the same
    last name and at least one first-name token, print them.
    """
    print()
    print("=== Possible duplicate-name candidates ===")
    for fname in ("StudentRosterActive.csv", "StudentRosterInactive.csv"):
        rows = _read_roster(ROOT / fname)
        bucket: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
        for r in rows:
            last = (r.get("LName") or "").strip().lower()
            first = (r.get("FName") or "").strip().lower()
            if not last or not first:
                continue
            for token in first.replace("(", " ").replace(")", " ").split():
                bucket[(last, token)].append(r)
        print(f"  --- {fname} ---")
        for (last, first), group in sorted(bucket.items()):
            if len(group) > 1:
                tags = ", ".join(
                    f"{r.get('FullName','')!s} (id={r.get('StudentID')})" for r in group
                )
                print(f"    {first} {last}: {tags}")


def schoolemail_inventory() -> None:
    """Distribution of SchoolEmail values across the active roster."""
    print()
    print("=== SchoolEmail inventory (active roster) ===")
    rows = _read_roster(ROOT / "StudentRosterActive.csv")
    with_email = [r for r in rows if (r.get("SchoolEmail") or "").strip()]
    print(f"  Have SchoolEmail: {len(with_email)} / {len(rows)}")
    print("  First 20:")
    for r in with_email[:20]:
        print(
            f"    {r.get('SchoolEmail'):45}  {r.get('FullName'):30}  grade={r.get('GradeLevX')}"
        )
    domains = Counter(
        (r.get("SchoolEmail") or "").split("@", 1)[-1].lower() for r in with_email
    )
    print(f"  Domains: {dict(domains)}")
    missing = [
        r
        for r in rows
        if not (r.get("SchoolEmail") or "").strip()
        and (r.get("_Status") or "").strip().lower() not in {"graduated", "withdrawn"}
    ]
    print(f"  Active roster WITHOUT SchoolEmail: {len(missing)}")
    for r in missing[:10]:
        print(
            f"    {r.get('FullName'):30}  grade={r.get('GradeLevX'):5}  status={r.get('_Status')}"
        )


def _read_roster(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def main() -> int:
    if not ROOT.exists():
        print(f"folder not found: {ROOT}", file=sys.stderr)
        return 1
    for rel, label in FILES:
        profile(ROOT / rel, label)
    roster_overlap()
    name_collisions()
    schoolemail_inventory()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
