import pytest
from tests.conftest import login
from app.db import SessionLocal
from app import models


def test_diagnostic_retake_replaces_old_responses_and_computes_progress(client):
    """Submitting a diagnostic multiple times replaces previous answers and computes progress delta."""
    headers, _ = login(client, "priya@northwind.test", "Northwind Logistics")
    
    # 1. Check Priya's initial seeded report (seeded with customer_data_shared)
    r1 = client.get("/reports/me", headers=headers)
    assert r1.status_code == 200
    initial_score = r1.json()["average_score"]
    initial_risks = r1.json()["risks"]
    assert "customer_data_shared" in initial_risks

    # 2. Priya retakes the diagnostic with improved safe answers
    improved_answers = [
        {"question_id": "common-freq", "answer": "Many times a day, it's part of how I work"}, # 5 pts
        {"question_id": "common-policy", "answer": "Yes, and I follow it"},                     # 4 pts
        {"question_id": "common-data", "answer": "Always, and I know which tools are approved"}, # 5 pts
        {"question_id": "common-review", "answer": "Check facts and edit it"},                   # 4 pts
        {"question_id": "common-open", "answer": "I use an approved internal AI tool with no customer PII to draft templates."},
        {"question_id": "sup-drafts", "answer": "To draft replies and summarise ticket history"} # 4 pts
    ]
    r_sub = client.post("/diagnostic/submit", json={"answers": improved_answers}, headers=headers)
    assert r_sub.status_code == 200

    # 3. Check Priya's report after retake
    r2 = client.get("/reports/me", headers=headers)
    assert r2.status_code == 200
    new_data = r2.json()
    
    # Answer count must be exactly 6 (not 6 + initial 2 = 8)
    assert new_data["answered"] == 6, f"Expected 6 answers, got {new_data['answered']} (duplicate responses accumulated!)"
    
    # Progress tracking verification
    progress = new_data.get("progress")
    assert progress is not None, "Expected progress tracking comparison in report"
    assert progress["previous_score"] == initial_score
    assert progress["score_delta"] > 0, "Score delta should show improvement"
    assert "customer_data_shared" in progress["resolved_risks"], "Resolved risks should list customer_data_shared"
    assert "customer_data_shared" not in new_data["risks"]
