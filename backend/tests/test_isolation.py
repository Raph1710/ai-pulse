import pytest
from tests.conftest import login


def test_admin_cannot_access_other_org_dashboard(client):
    """Meera is an admin of Bluepeak Retail (org 2).
    She must NOT be able to view Northwind Logistics (org 1) dashboard."""
    headers, data = login(client, "meera@bluepeak.test", "Bluepeak Retail")
    
    # Attempting to access Northwind (org_id 1)
    r = client.get("/dashboard?org_id=1", headers=headers)
    assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}: {r.text}"


def test_cannot_select_unauthorized_org(client):
    """Dev Malhotra belongs only to Northwind Logistics.
    He must NOT be able to mint a token for Bluepeak Retail."""
    # Login without selecting org yet
    r = client.post("/auth/login", json={"email": "dev@malhotra.test" if False else "dev@northwind.test", "password": "pulse123"})
    assert r.status_code == 200
    token = r.json()["token"]
    
    # Find Bluepeak's org_id (which is 2)
    # Dev tries to select org_id 2
    r_select = client.post(
        "/auth/select-org",
        json={"org_id": 2},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r_select.status_code == 403, f"Expected 403 Forbidden, got {r_select.status_code}: {r_select.text}"


def test_multicompany_user_role_scoping(client):
    """Ravi belongs to both Northwind (employee) and Bluepeak (admin).
    When active in Northwind, he is an employee and cannot view dashboard.
    When active in Bluepeak, he is an admin and can view only Bluepeak."""
    # Context 1: Northwind (role = employee)
    nw_headers, _ = login(client, "ravi@consult.test", "Northwind Logistics")
    r_nw = client.get("/dashboard", headers=nw_headers)
    assert r_nw.status_code == 403, "Employee role in active org must not access dashboard"

    # Context 2: Bluepeak (role = admin)
    bp_headers, _ = login(client, "ravi@consult.test", "Bluepeak Retail")
    r_bp = client.get("/dashboard", headers=bp_headers)
    assert r_bp.status_code == 200
    data = r_bp.json()
    assert data["organization"] == "Bluepeak Retail"
    assert "Northwind" not in data["organization"]

    # Ravi in Bluepeak cannot query Northwind
    r_tamper = client.get("/dashboard?org_id=1", headers=bp_headers)
    assert r_tamper.status_code == 403


def test_employee_cannot_access_dashboard(client):
    """Employees cannot view executive dashboard."""
    headers, _ = login(client, "priya@northwind.test", "Northwind Logistics")
    r = client.get("/dashboard", headers=headers)
    assert r.status_code == 403


def test_dashboard_defaults_to_active_membership_org(client):
    """Calling /dashboard without org_id query param uses active token org."""
    headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
    r = client.get("/dashboard", headers=headers)
    assert r.status_code == 200
    assert r.json()["organization"] == "Northwind Logistics"
