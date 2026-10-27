from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import current_membership
from ..utils import maturity_level

router = APIRouter(prefix="/reports", tags=["reports"])

NEXT_STEPS = {
    "support": ["Use AI to draft first replies, then edit", "Summarise long ticket threads before escalating", "Never paste customer details into public chatbots"],
    "engineering": ["Use a code assistant for tests and refactors", "Review every AI suggestion before merging", "Keep secrets and customer data out of prompts"],
    "sales": ["Draft outreach emails with AI and personalise them", "Summarise call notes into CRM updates", "Check AI-written claims before sending"],
    "manager": ["Agree an AI usage policy with your team", "Pick one workflow per quarter to improve with AI", "Track time saved, not tool licences"],
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
    db.commit()
    return {"deleted": True, "count": count}
