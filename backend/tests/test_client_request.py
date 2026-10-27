import pytest
from tests.conftest import login
from app.db import SessionLocal
from app import models


def test_small_groups_suppression_and_other_teams_grouping(client):
    """Departments with fewer than 5 respondents must be grouped under 'Other teams'."""
    headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
    r = client.get("/dashboard", headers=headers)
    assert r.status_code == 200
    data = r.json()
    
    dept_names = [d["department"] for d in data["departments"]]
    # In Northwind seed data, no department has 5 or more respondents (Sales has 1, Support has 1, Eng has 0, HR has 0)
    # Therefore, all departments with < 5 respondents must NOT be exposed as individual scorecards
    assert "Other teams" in dept_names or any("Other teams" in name for name in dept_names)
    
    # Confirm no department with < 5 respondents is shown on its own
    for dept in data["departments"]:
        if "Other teams" not in dept["department"]:
            assert dept["responded"] >= 5, f"Department '{dept['department']}' exposed with {dept['responded']} < 5 respondents!"


def test_employee_right_to_delete_cascades_immediately(client):
    """An employee can delete all their answers; their report and dashboard contributions disappear immediately."""
    # 1. Vikram is in Sales and has answered questions in seed data
    headers, _ = login(client, "vikram@northwind.test", "Northwind Logistics")
    
    # Check report before deletion
    r_before = client.get("/reports/me", headers=headers)
    assert r_before.status_code == 200
    assert r_before.json()["answered"] > 0
    assert r_before.json()["average_score"] is not None

    # 2. Vikram requests deletion
    r_del = client.delete("/reports/me", headers=headers)
    assert r_del.status_code == 200
    assert r_del.json()["deleted"] is True
    assert r_del.json()["count"] > 0

    # 3. Report is immediately cleared
    r_after = client.get("/reports/me", headers=headers)
    assert r_after.status_code == 200
    assert r_after.json()["answered"] == 0
    assert r_after.json()["average_score"] is None
    assert r_after.json()["level"] == "Not assessed"
    assert r_after.json()["risks"] == []

    # 4. Check dashboard from admin perspective: Vikram's answers are gone from responded count
    admin_headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
    r_dash = client.get("/dashboard", headers=admin_headers)
    assert r_dash.status_code == 200
    # Sales had 1 response (Vikram); now it should have 0 responses
    other_team = next(d for d in r_dash.json()["departments"] if "Other teams" in d["department"])
    # Total responses across other teams must be decreased
