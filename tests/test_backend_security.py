import asyncio
import importlib.util
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient
import pytest


REPO_ROOT = Path("/home/runner/work/chess-club/chess-club")
SERVER_PATH = REPO_ROOT / "backend" / "server.py"


def load_server_module(module_name: str = "server_under_test"):
    spec = importlib.util.spec_from_file_location(module_name, SERVER_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def set_required_env():
    os.environ["MONGO_URL"] = "mongodb://localhost:27017"
    os.environ["DB_NAME"] = "test_db"
    os.environ["JWT_SECRET"] = "a" * 40
    os.environ["CORS_ORIGINS"] = "https://example.com"
    os.environ.pop("REDIS_URL", None)
    os.environ["ALLOW_ADMIN_BOOTSTRAP"] = "false"
    os.environ.pop("ADMIN_BOOTSTRAP_TOKEN", None)


def test_rejects_missing_jwt_secret():
    set_required_env()
    os.environ.pop("JWT_SECRET", None)
    with pytest.raises(RuntimeError, match="JWT_SECRET is required"):
        load_server_module("server_test_missing_jwt")


def test_rejects_wildcard_cors():
    set_required_env()
    os.environ["CORS_ORIGINS"] = "*"
    with pytest.raises(RuntimeError, match="CORS wildcard"):
        load_server_module("server_test_wildcard_cors")


def test_admin_register_disabled_without_bootstrap():
    set_required_env()
    module = load_server_module("server_test_admin_register")
    client = TestClient(module.app)
    res = client.post("/api/admin/register", json={
        "username": "admin1",
        "password": "strongpass",
        "email": "admin1@example.com"
    })
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()


def test_password_reset_response_has_no_token():
    set_required_env()
    module = load_server_module("server_test_password_reset")
    client = TestClient(module.app)
    res = client.post("/api/admin/password-reset-request", json={"email": "nobody@example.com"})
    assert res.status_code == 200
    payload = res.json()
    assert "dev_token" not in payload
    assert "token" not in payload


def test_members_pagination_and_sort_validation():
    set_required_env()
    module = load_server_module("server_test_members_validation")
    client = TestClient(module.app)

    bad_page = client.get("/api/members?page=0&limit=10")
    assert bad_page.status_code == 400
    assert "page must be" in bad_page.json()["detail"]

    bad_limit = client.get("/api/members?page=1&limit=101")
    assert bad_limit.status_code == 400
    assert "limit must be between" in bad_limit.json()["detail"]

    bad_sort = client.get("/api/members?page=1&limit=10&sort_by=__proto__")
    assert bad_sort.status_code == 400
    assert "Invalid sort_by" in bad_sort.json()["detail"]


def test_safe_regex_escapes_untrusted_input():
    set_required_env()
    module = load_server_module("server_test_regex_escape")
    query = module.build_safe_regex_query("a.*(b)?[x]")
    assert query["$options"] == "i"
    assert query["$regex"] == r"a\.\*\(b\)\?\[x\]"


def test_redact_sensitive_masks_values():
    set_required_env()
    module = load_server_module("server_test_redaction")
    text = "token: abc123 password=supersecret authorization:BearerX"
    redacted = module.redact_sensitive(text)
    assert "[REDACTED]" in redacted
    assert "supersecret" not in redacted
    assert "abc123" not in redacted


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return self.rows


class FakeCollection:
    def __init__(self, find_one_result=None, find_rows=None):
        self.find_one_result = find_one_result
        self.find_rows = find_rows or []
        self.delete_many_called = 0
        self.update_many_called = 0
        self.delete_one_called = 0

    async def find_one(self, *_args, **_kwargs):
        return self.find_one_result

    def find(self, *_args, **_kwargs):
        return FakeCursor(self.find_rows)

    async def delete_many(self, *_args, **_kwargs):
        self.delete_many_called += 1
        return type("R", (), {"deleted_count": 1})()

    async def update_many(self, *_args, **_kwargs):
        self.update_many_called += 1
        return type("R", (), {"modified_count": 1})()

    async def update_one(self, *_args, **_kwargs):
        return type("R", (), {"modified_count": 1})()

    async def delete_one(self, *_args, **_kwargs):
        self.delete_one_called += 1
        return type("R", (), {"deleted_count": 1})()

    async def insert_one(self, *_args, **_kwargs):
        return type("R", (), {"inserted_id": "1"})()


def test_delete_member_cleans_dependent_data():
    set_required_env()
    module = load_server_module("server_test_delete_member_consistency")

    members = FakeCollection(find_one_result={"id": "m1", "name": "A"})
    matches = FakeCollection(find_rows=[{
        "id": "x1",
        "player1_id": "m1",
        "player2_id": "m2",
        "result": "1-0",
    }])
    tournaments = FakeCollection()
    audit_logs = FakeCollection()
    module.db = type("DB", (), {
        "members": members,
        "matches": matches,
        "tournaments": tournaments,
        "audit_logs": audit_logs,
    })()

    async def _noop(*_args, **_kwargs):
        return None

    module.log_admin_action = _noop
    asyncio.run(module.delete_member("m1", {"sub": "a1", "username": "admin"}))
    assert matches.delete_many_called == 1
    assert tournaments.update_many_called == 1
    assert members.delete_one_called == 1


def test_delete_tournament_cleans_related_matches():
    set_required_env()
    module = load_server_module("server_test_delete_tournament_consistency")

    tournaments = FakeCollection(find_one_result={"id": "t1", "name": "Open Cup"})
    matches = FakeCollection(find_rows=[{
        "id": "mx1",
        "player1_id": "m1",
        "player2_id": "m2",
        "result": "0-1",
        "tournament_name": "Open Cup"
    }])
    members = FakeCollection()
    audit_logs = FakeCollection()
    module.db = type("DB", (), {
        "members": members,
        "matches": matches,
        "tournaments": tournaments,
        "audit_logs": audit_logs,
    })()

    async def _noop(*_args, **_kwargs):
        return None

    module.log_admin_action = _noop
    asyncio.run(module.delete_tournament("t1", {"sub": "a1", "username": "admin"}))
    assert matches.delete_many_called == 1
    assert tournaments.delete_one_called == 1
