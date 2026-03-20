#!/usr/bin/env python
import os
import re
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MANAGE = [sys.executable, "manage.py"]
SETTINGS = "--settings=plane.settings.local"

PATTERN_DUPLICATE_TABLE = re.compile(r'psycopg\.errors\.DuplicateTable: relation "([^"]+)" already exists')
PATTERN_DUPLICATE_COLUMN = re.compile(r'psycopg\.errors\.DuplicateColumn: column "([^"]+)" of relation "([^"]+)" already exists')
PATTERN_UNDEFINED_TABLE = re.compile(r'psycopg\.errors\.UndefinedTable: relation "([^"]+)" does not exist')
PATTERN_INCONSISTENT_HISTORY = re.compile(
    r"InconsistentMigrationHistory: Migration (\w+\.\d+_[^\s]+) is applied before its dependency (\w+\.\d+_[^\s]+)"
)
PATTERN_WRONG_CONSTRAINT_COUNT = re.compile(r"Found wrong number .* of constraints for ([\w_]+\([^)]+\))")
PATTERN_UNDEFINED_COLUMN = re.compile(r'psycopg\.errors\.UndefinedColumn: column "([^"]+)" of relation "([^"]+)" does not exist')
PATTERN_APPLYING_MIGRATION = re.compile(r"  Applying (\w+\.\d+_[^\.\s]+)")


def run_migrate(args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        MANAGE + ["migrate"] + args + [SETTINGS],
        cwd=BASE_DIR,
        text=True,
        capture_output=True,
    )
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    return proc.returncode, proc.stdout + proc.stderr


def run_dbshell(sql: str) -> bool:
    cmd = MANAGE + ["dbshell", SETTINGS]
    proc = subprocess.run(cmd, cwd=BASE_DIR, input=sql, text=True, capture_output=True)
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    return proc.returncode == 0


def auto_fix_once(output: str) -> bool:
    m_applying = PATTERN_APPLYING_MIGRATION.search(output)
    current_migration = m_applying.group(1) if m_applying else None

    m_hist = PATTERN_INCONSISTENT_HISTORY.search(output)
    if m_hist:
        applied, dep = m_hist.groups()
        app_applied, name_applied = applied.split(".", 1)
        print(f"[auto-fix] inconsistent history, delete {applied} from django_migrations and retry")
        sql = f"DELETE FROM django_migrations WHERE app = '{app_applied}' AND name = '{name_applied}';\n"
        return run_dbshell(sql)

    if (PATTERN_DUPLICATE_TABLE.search(output) or PATTERN_DUPLICATE_COLUMN.search(output)) and current_migration:
        app, name = current_migration.split(".", 1)
        print(f"[auto-fix] duplicate table/column, fake {current_migration}")
        code, _ = run_migrate([app, name, "--fake"])
        return code == 0

    if (PATTERN_UNDEFINED_TABLE.search(output) or PATTERN_WRONG_CONSTRAINT_COUNT.search(output) or PATTERN_UNDEFINED_COLUMN.search(output)) and current_migration:
        app, name = current_migration.split(".", 1)
        print(f"[auto-fix] missing table/column/constraint, fake {current_migration}")
        code, _ = run_migrate([app, name, "--fake"])
        return code == 0

    return False


def main() -> int:
    if not os.environ.get("DJANGO_SETTINGS_MODULE"):
        os.environ["DJANGO_SETTINGS_MODULE"] = "plane.settings.local"

    max_rounds = 50
    for i in range(max_rounds):
        print(f"\n=== migrate round {i + 1} ===")
        code, output = run_migrate([])
        if code == 0:
            print("[auto-migrate] all migrations applied successfully")
            return 0

        print("[auto-migrate] migrate failed, trying one auto-fix...")
        if not auto_fix_once(output):
            print("[auto-migrate] cannot auto-fix this error, please inspect above logs")
            return code

    print("[auto-migrate] exceeded max rounds, aborting")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

