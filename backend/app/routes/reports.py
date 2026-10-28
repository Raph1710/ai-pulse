from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import current_membership
from ..utils import maturity_level

router = APIRouter(prefix="/reports", tags=["reports"])

NEXT_STEPS = {
    "support": [
        "Create an approved prompt library for customer emails to avoid pasting raw ticket text.",
        "Set up an automated redaction step so customer names and account numbers never reach external AI tools.",
        "Track resolution times on AI-assisted vs unassisted tickets to measure actual lift.",
    ],
    "engineering": [
        "Add an internal code-review rule that any AI-generated function must have test coverage.",
        "Run an AI pair-programming lunch-and-learn on prompt caching and context window limits.",
        "Set up a lightweight eval harness for any model outputs embedded in production services.",
    ],
    "sales": [
        "Agree on standard prompts for account research so reps get consistent briefing sheets.",
        "Do not paste non-public client financial info into consumer-tier AI tools.",
        "Share the top 3 prompt templates that actually won meetings this quarter with the rest of the team.",
    ],
    "manager": [
        "Publish an explicit AI policy: what data is allowed, which tools are sanctioned, who approves new ones.",
        "Audit team tooling for unsanctioned consumer AI subscriptions on company cards.",
        "Identify the 2 highest-friction workflows in the department and run a 2-week AI pilot on one of them.",
    ],
}


@router.get("/me")
def my_report(m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    rows = db.query(models.Response).filter_by(membership_id=m.id).all()
    scores = [r.score for r in rows if r.score is not None]
    avg = sum(scores) / len(scores) if scores else None
    flags = sorted({f for r in rows for f in (r.flags or [])})
    progress = None
    if m.last_assessment_summary and m.last_assessment_summary.get("previous_score") is not None and avg is not None:
        prev_score = m.last_assessment_summary["previous_score"]
        prev_flags = m.last_assessment_summary.get("previous_flags", [])
        delta = round(avg - prev_score, 2)
        resolved_risks = [f for f in prev_flags if f not in flags]
        new_risks = [f for f in flags if f not in prev_flags]
        progress = {
            "previous_score": prev_score,
            "score_delta": delta,
            "resolved_risks": resolved_risks,
            "new_risks": new_risks,
        }

    return {
        "name": m.user.name,
        "organization": m.org.name,
        "answered": len(rows),
        "average_score": round(avg, 2) if avg is not None else None,
        "level": maturity_level(avg),
        "risks": flags,
        "next_steps": NEXT_STEPS.get(m.job_role, NEXT_STEPS["manager"]),
        "progress": progress,
    }


@router.delete("/me")
def delete_my_data(m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    """Right to delete: permanently purge employee's diagnostic responses."""
    count = db.query(models.Response).filter_by(membership_id=m.id).delete()
    m.last_assessment_summary = None
    db.commit()
    return {"deleted": True, "count": count}
