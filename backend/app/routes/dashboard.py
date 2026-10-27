from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import current_membership

from ..utils import maturity_level

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def org_dashboard(org_id: int | None = None, m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    if m.role != "admin":
        raise HTTPException(403, "Admins only")

    # Prevent cross-tenant IDOR: if client passes an org_id, it must match active token org
    if org_id is not None and org_id != m.org_id:
        raise HTTPException(403, "Cannot view another organization's dashboard")

    target_org_id = m.org_id
    org = db.get(models.Organization, target_org_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    members = db.query(models.Membership).filter_by(org_id=target_org_id).all()
    departments = []
    all_flags = {}

    ANONYMITY_THRESHOLD = 5
    other_employees = 0
    other_responded = 0
    other_averages = []
    other_count = 0

    for dept in org.departments:
        dept_members = [x for x in members if x.department_id == dept.id]
        responded = 0
        member_averages = []
        for dm in dept_members:
            rows = db.query(models.Response).filter_by(membership_id=dm.id).all()
            dm_scores = [r.score for r in rows if r.score is not None]
            if dm_scores:
                responded += 1
                member_averages.append(sum(dm_scores) / len(dm_scores))
            for r in rows:
                for f in r.flags or []:
                    all_flags[f] = all_flags.get(f, 0) + 1

        if responded >= ANONYMITY_THRESHOLD:
            avg = (sum(member_averages) / len(member_averages)) if member_averages else None
            departments.append({
                "department": dept.name,
                "employees": len(dept_members),
                "responded": responded,
                "average_score": round(avg, 2) if avg is not None else None,
                "level": maturity_level(avg),
                "anonymized": False,
            })
        else:
            other_employees += len(dept_members)
            other_responded += responded
            other_averages.extend(member_averages)
            other_count += 1

    if other_count > 0:
        if other_responded >= ANONYMITY_THRESHOLD:
            other_avg = (sum(other_averages) / len(other_averages)) if other_averages else None
            other_level = maturity_level(other_avg)
            score_val = round(other_avg, 2) if other_avg is not None else None
        else:
            other_avg = None
            other_level = "Insufficient responses for anonymity (<5)"
            score_val = None

        departments.append({
            "department": "Other teams (anonymized)",
            "employees": other_employees,
            "responded": other_responded,
            "average_score": score_val,
            "level": other_level,
            "anonymized": True,
        })

    return {
        "organization": org.name,
        "departments": departments,
        "top_risks": sorted(all_flags.items(), key=lambda kv: -kv[1])[:5],
    }
