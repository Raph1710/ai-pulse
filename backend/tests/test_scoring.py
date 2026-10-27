from app.utils import maturity_level
from tests.conftest import login


def test_maturity_level_thresholds():
    assert maturity_level(None) == "Not assessed"
    assert maturity_level(1.0) == "Beginner"
    assert maturity_level(1.9) == "Beginner"
    assert maturity_level(2.0) == "Exploring"
    assert maturity_level(2.9) == "Exploring"
    assert maturity_level(3.0) == "Practitioner"
    assert maturity_level(3.9) == "Practitioner"
    assert maturity_level(4.0) == "Leader"
    assert maturity_level(5.0) == "Leader"


def test_department_average_score_range(client):
    """Department averages must be within the 1-5 scale and not inflated by headcount or total questions."""
    headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
    r = client.get("/dashboard", headers=headers)
    assert r.status_code == 200
    data = r.json()
    for dept in data["departments"]:
        if dept["average_score"] is not None:
            assert 1.0 <= dept["average_score"] <= 5.0, f"Average {dept['average_score']} out of range 1-5 for {dept['department']}"
