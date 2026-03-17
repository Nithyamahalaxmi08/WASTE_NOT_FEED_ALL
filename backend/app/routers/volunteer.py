from fastapi import APIRouter, HTTPException
from app.database import supabase
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()  # prefix="/volunteer" is set in main.py


# ══════════════════════════════════════════════════════════
#  ROUTE ORDER MATTERS IN FASTAPI:
#  Fixed-segment routes must come BEFORE path-param routes.
#  e.g.  /profile/email/{email}  BEFORE  /profile/{volunteer_id}
#        /donations/available     BEFORE  /donations/{donation_id}
# ══════════════════════════════════════════════════════════


# ---------- REQUEST MODELS ----------

class AssignRequest(BaseModel):
    volunteer_id: str


class StatusUpdate(BaseModel):
    status: str
    volunteer_id: str


# ══════════════════════════════════════════════════════════
# GET /volunteer/profile/email/{email}
# Must be declared BEFORE /profile/{volunteer_id}
# ══════════════════════════════════════════════════════════
@router.get("/profile/email/{email}")
def get_volunteer_profile_by_email(email: str):
    """Get volunteer profile by email."""
    try:
        result = (
            supabase.table("volunteers")
            .select("*")
            .eq("email", email)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# GET /volunteer/profile/{volunteer_id}
# ══════════════════════════════════════════════════════════
@router.get("/profile/{volunteer_id}")
def get_volunteer_profile_by_id(volunteer_id: str):
    """Get volunteer profile by ID."""
    try:
        result = (
            supabase.table("volunteers")
            .select("*")
            .eq("id", volunteer_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# GET /volunteer/donations/available
# Donations with status='available' — unclaimed, unassigned.
# Used for the self-assign flow on the volunteer dashboard.
# Must be declared BEFORE /donations/{donation_id}
# ══════════════════════════════════════════════════════════
@router.get("/donations/available")
def get_available_donations():
    """
    Returns all donations with status='available' for volunteer self-assign.
    Full path is /volunteer/donations/available (no conflict with donations router).
    """
    try:
        result = (
            supabase.table("donations")
            .select("*")
            .eq("status", "available")
            .execute()
        )
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ---------- UPDATE VOLUNTEER PROFILE ----------

@router.put("/profile/{volunteer_id}")
def update_volunteer_profile(volunteer_id: str, data: dict):
    """Update volunteer profile fields: name, phone, city."""
    allowed = {"name", "phone", "city"}
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        result = supabase.table("volunteers") \
            .update(update_data) \
            .eq("id", volunteer_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════
# GET /volunteer/donations/ngo-assigned/{volunteer_id}
# Donations the NGO has assigned to this volunteer.
# Must be declared BEFORE /donations/{donation_id}
# ══════════════════════════════════════════════════════════
@router.get("/donations/ngo-assigned/{volunteer_id}")
def get_ngo_assigned_donations(volunteer_id: str):
    """
    Donations where status='assigned' and volunteer_id was set by an NGO.
    Shown as 'Assigned to You by NGO' on the volunteer dashboard.
    """
    try:
        result = (
            supabase.table("donations")
            .select("*")
            .eq("volunteer_id", volunteer_id)
            .eq("status", "assigned")
            .execute()
        )
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# GET /volunteer/donations/assigned/{volunteer_id}
# All donations linked to this volunteer regardless of status.
# Must be declared BEFORE /donations/{donation_id}
# ══════════════════════════════════════════════════════════
@router.get("/donations/assigned/{volunteer_id}")
def get_assigned_donations(volunteer_id: str):
    """
    All donations linked to this volunteer.
    Frontend separates active (assigned/picked_up) vs completed (delivered).
    """
    try:
        result = (
            supabase.table("donations")
            .select("*")
            .eq("volunteer_id", volunteer_id)
            .execute()
        )
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# GET /volunteer/stats/{volunteer_id}
# ══════════════════════════════════════════════════════════
@router.get("/stats/{volunteer_id}")
def get_volunteer_stats(volunteer_id: str):
    """Get delivery statistics for a volunteer."""
    try:
        result = (
            supabase.table("donations")
            .select("*")
            .eq("volunteer_id", volunteer_id)
            .execute()
        )
        donations = result.data or []

        total_tasks     = len(donations)
        completed_tasks = len([d for d in donations if d.get("status") == "delivered"])
        active_tasks    = len([d for d in donations if d.get("status") in ["assigned", "picked_up"]])

        return {
            "total_tasks":     total_tasks,
            "completed_tasks": completed_tasks,
            "active_tasks":    active_tasks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# POST /volunteer/donations/{donation_id}/assign
# Volunteer self-assigns an available donation.
# ══════════════════════════════════════════════════════════
@router.post("/donations/{donation_id}/assign")
def assign_donation(donation_id: int, request: AssignRequest):
    """
    Volunteer self-assigns an Available donation.
    Checks the donation is still available before assigning.
    """
    try:
        check = (
            supabase.table("donations")
            .select("id, status")
            .eq("id", donation_id)
            .execute()
        )

        if not check.data:
            raise HTTPException(status_code=404, detail="Donation not found")

        current_status = check.data[0].get("status", "")
        if current_status.lower() != "available":
            raise HTTPException(
                status_code=400,
                detail=f"Donation is no longer available (current status: {current_status})"
            )

        result = (
            supabase.table("donations")
            .update({
                "status":       "assigned",
                "volunteer_id": request.volunteer_id,
                "updated_at":   datetime.utcnow().isoformat()
            })
            .eq("id", donation_id)
            .execute()
        )

        return {
            "message": "Donation assigned successfully",
            "data":    result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# PUT /volunteer/donations/{donation_id}/status
# Volunteer updates pickup/delivery status.
# ══════════════════════════════════════════════════════════
@router.put("/donations/{donation_id}/status")
def update_donation_status(donation_id: int, data: StatusUpdate):
    """
    Volunteer advances status: assigned → picked_up → delivered.
    Timestamps picked_up_at / delivered_at are set automatically.
    """
    VALID_STATUSES = {"picked_up", "delivered"}

    if data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{data.status}'. Must be one of: {VALID_STATUSES}"
        )

    try:
        check = (
            supabase.table("donations")
            .select("id, volunteer_id, status")
            .eq("id", donation_id)
            .execute()
        )

        if not check.data:
            raise HTTPException(status_code=404, detail="Donation not found")

        update_data = {
            "status":     data.status,
            "updated_at": datetime.utcnow().isoformat()
        }

        if data.status == "picked_up":
            update_data["picked_up_at"] = datetime.utcnow().isoformat()
        elif data.status == "delivered":
            update_data["delivered_at"] = datetime.utcnow().isoformat()

        supabase.table("donations") \
            .update(update_data) \
            .eq("id", donation_id) \
            .execute()

        # Re-fetch so frontend gets the latest row with all timestamps
        updated = (
            supabase.table("donations")
            .select("*")
            .eq("id", donation_id)
            .execute()
        )

        return {
            "message":  f"Status updated to '{data.status}' successfully",
            "donation": updated.data[0] if updated.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════
# GET /volunteer/donations/{donation_id}
# Single donation details — path param, must be LAST
# ══════════════════════════════════════════════════════════
@router.get("/donations/{donation_id}")
def get_donation_details(donation_id: int):
    """Get full details for a single donation by ID."""
    try:
        result = (
            supabase.table("donations")
            .select("*")
            .eq("id", donation_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Donation not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))