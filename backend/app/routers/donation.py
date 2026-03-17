import math
import re
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from app.database import supabase

router = APIRouter(
    prefix="/donations",
    tags=["Donations"],
)

# ══════════════════════════════════════════════════════════
#  ROUTE ORDER MATTERS: Fixed-segment paths must come BEFORE
#  path-param routes. e.g. /available, /claims/{ngo_id}
#  BEFORE /{donation_id}
# ══════════════════════════════════════════════════════════


# ── Schemas ────────────────────────────────────────────────
class DonationCreate(BaseModel):
    name: str
    type: Optional[str] = None
    pickup_location: Optional[str] = None
    contact_no: Optional[str] = None
    expiry: Optional[str] = None
    quantity: Optional[int] = None
    description: Optional[str] = None
    donor_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "available"
    claimed_by: Optional[str] = None


class ClaimRequest(BaseModel):
    ngo_id: str


class DonorProfileUpdate(BaseModel):
    name:    Optional[str] = None
    phone:   Optional[str] = None
    address: Optional[str] = None


# ── Known districts ────────────────────────────────────────
KNOWN_DISTRICTS = [
    "Coimbatore", "Erode", "Tiruppur", "Nilgiris",
    "Salem", "Dindigul", "Namakkal", "Karur",
]


# ── Extract district from address text ────────────────────
def extract_district(text: str) -> Optional[str]:
    """
    Scans the address/pickup_location string for a known district name.
    Case-insensitive. Returns the matched district or None.
    """
    if not text:
        return None
    for district in KNOWN_DISTRICTS:
        if re.search(rf"\b{district}\b", text, re.IGNORECASE):
            return district
    return None


# ── Haversine distance (km) ────────────────────────────────
def haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── TYPE label map ─────────────────────────────────────────
TYPE_LABELS = {
    "homeless_shelter":   "Homeless Shelter",
    "orphanage":          "Orphanage",
    "old_age_home":       "Old Age Home",
    "community_kitchen":  "Community Kitchen",
    "slum_settlement":    "Slum Settlement",
    "ngo_distribution":   "NGO / Community Hall",
    "govt_welfare":       "Govt Welfare Centre",
    "low_income_housing": "Low Income Housing",
}


# ── Core recommendation logic ──────────────────────────────
def get_recommended_spot(donation: dict) -> Optional[dict]:
    """
    1. Try to extract a district from pickup_location or address.
    2. If found → return the first red spot in that same city/district.
    3. If not found but donation has lat/lng → nearest red spot by distance.
    4. Fallback → first red spot in table.
    """
    try:
        res = supabase.table("red_spots").select("*").execute()
        spots = res.data or []

        if not spots:
            return None

        # ── Step 1: district match from address text ───────
        address_text = (
            str(donation.get("pickup_location") or "")
            + " "
            + str(donation.get("address") or "")
        )

        district = extract_district(address_text)

        if district:
            district_spots = [
                s for s in spots
                if s.get("city", "").strip().lower() == district.lower()
            ]
            if district_spots:
                spot = district_spots[0]
                spot["distance_km"] = None
                return spot

        # ── Step 2: fallback — nearest by lat/lng ──────────
        don_lat = donation.get("latitude")
        don_lng = donation.get("longitude")

        if don_lat and don_lng:
            nearest = min(
                spots,
                key=lambda s: haversine(
                    float(don_lat), float(don_lng),
                    float(s["latitude"]), float(s["longitude"]),
                ),
            )
            nearest["distance_km"] = round(
                haversine(
                    float(don_lat), float(don_lng),
                    float(nearest["latitude"]), float(nearest["longitude"]),
                ),
                1,
            )
            return nearest

        # ── Step 3: last resort — first spot in table ──────
        return spots[0]

    except Exception:
        return None


# ══════════════════════════════════════════════════════════
# GET /donations/donor/profile/{donor_id}
# ══════════════════════════════════════════════════════════
@router.get("/donor/profile/{donor_id}")
def get_donor_profile(donor_id: str):
    if not donor_id or donor_id in ("null", "undefined", ""):
        raise HTTPException(status_code=400, detail="Valid donor_id is required")

    result = (
        supabase.table("donors")
        .select("id, name, email, phone, address, created_at")
        .eq("id", donor_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Donor not found")

    return result.data[0]


# ══════════════════════════════════════════════════════════
# PUT /donations/donor/profile/{donor_id}
# ══════════════════════════════════════════════════════════
@router.put("/donor/profile/{donor_id}")
def update_donor_profile(donor_id: str, body: DonorProfileUpdate):
    if not donor_id or donor_id in ("null", "undefined", ""):
        raise HTTPException(status_code=400, detail="Valid donor_id is required")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("donors")
        .update(updates)
        .eq("id", donor_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    return result.data[0]


# ══════════════════════════════════════════════════════════
# GET /donations/available — unclaimed donations for NGO browse
# ══════════════════════════════════════════════════════════
@router.get("/available")
def get_available_donations():
    """
    Returns donations that have NOT been claimed by any NGO yet.
    Filters by: claimed_by IS NULL and status='available'.
    Used by AvailableDonationsScreen (NGO) and Volunteer dashboard.
    """
    result = (
        supabase.table("donations")
        .select("*")
        .eq("status", "available")
        .is_("claimed_by", "null")
        .execute()
    )
    return result.data or []


# ══════════════════════════════════════════════════════════
# GET /donations/claims/{ngo_id} — all claims for this NGO
# ══════════════════════════════════════════════════════════
@router.get("/claims/{ngo_id}")
def get_my_claims(ngo_id: str):
    """
    Returns all donations claimed by this NGO.
    Shown in MyClaimsScreen.
    """
    result = (
        supabase.table("donations")
        .select("*")
        .eq("claimed_by", ngo_id)
        .execute()
    )
    return result.data or []


# ══════════════════════════════════════════════════════════
# GET /donations — all donations (admin / donor view)
# ══════════════════════════════════════════════════════════
@router.get("/")
def get_all_donations():
    result = (
        supabase.table("donations")
        .select("*")
        .order("id", desc=True)
        .execute()
    )
    return result.data or []


# ══════════════════════════════════════════════════════════
# POST /donations — donor creates a new donation
# ══════════════════════════════════════════════════════════
@router.post("/")
def create_donation(donation: DonationCreate):
    result = (
        supabase.table("donations")
        .insert(donation.model_dump(exclude_none=True))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create donation")
    return result.data[0]


# ══════════════════════════════════════════════════════════
# PUT /donations/{donation_id}/claim — NGO claims a donation
# ══════════════════════════════════════════════════════════
@router.put("/{donation_id}/claim")
def claim_donation(donation_id: int, body: ClaimRequest):
    check = (
        supabase.table("donations")
        .select("*")
        .eq("id", donation_id)
        .execute()
    )

    if not check.data:
        raise HTTPException(status_code=404, detail="Donation not found")

    if check.data[0].get("claimed_by"):
        raise HTTPException(status_code=400, detail="Donation has already been claimed")

    current_status = str(check.data[0].get("status", "")).lower()
    if current_status != "available":
        raise HTTPException(status_code=400, detail="Donation is no longer available")

    result = (
        supabase.table("donations")
        .update({
            "status": "claimed",
            "claimed_by": body.ngo_id,
            "updated_at": "now()"
        })
        .eq("id", donation_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to claim donation")

    donation = result.data[0]

    # ── Recommendation ─────────────────────────────────────
    spot        = get_recommended_spot(donation)
    rec_message = None

    if spot:
        type_label = TYPE_LABELS.get(spot.get("type", ""), "Need Point")

        if spot.get("distance_km") is not None:
            rec_message = (
                f"📍 Deliver to {spot['place_name']} "
                f"({type_label}) — "
                f"{spot['city']} | "
                f"~{spot['distance_km']} km from pickup"
            )
        else:
            rec_message = (
                f"📍 Deliver to {spot['place_name']} "
                f"({type_label}) — "
                f"{spot['city']}. Deliver food here!"
            )

    return {
        "message":        "Donation claimed successfully",
        "donation":       donation,
        "recommendation": spot,
        "rec_message":    rec_message,
    }


# ══════════════════════════════════════════════════════════
# PUT /donations/{donation_id}/assign-volunteer
# ══════════════════════════════════════════════════════════
@router.put("/{donation_id}/assign-volunteer")
def assign_donation_to_volunteer(donation_id: int, data: dict = Body(...)):
    volunteer_id = data.get("volunteer_id")
    if not volunteer_id:
        raise HTTPException(status_code=400, detail="Missing volunteer_id")

    donation = (
        supabase.table("donations")
        .select("id, claimed_by, volunteer_id")
        .eq("id", donation_id)
        .execute()
    )
    if not donation.data:
        raise HTTPException(status_code=404, detail="Donation not found")

    if not donation.data[0].get("claimed_by"):
        raise HTTPException(
            status_code=400,
            detail="Donation must be claimed by an NGO before assigning a volunteer"
        )

    vol_check = (
        supabase.table("volunteers")
        .select("id")
        .eq("id", volunteer_id)
        .execute()
    )
    if not vol_check.data:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    result = (
        supabase.table("donations")
        .update({
            "volunteer_id": volunteer_id,
            "status": "assigned",
            "updated_at": "now()"
        })
        .eq("id", donation_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to assign volunteer")

    return {"message": "Volunteer assigned successfully", "data": result.data[0]}


# ══════════════════════════════════════════════════════════
# PUT /donations/{donation_id} — generic update
# ══════════════════════════════════════════════════════════
@router.put("/{donation_id}")
def update_donation(donation_id: int, donation: dict):
    result = (
        supabase.table("donations")
        .update(donation)
        .eq("id", donation_id)
        .execute()
    )
    return result.data


# ══════════════════════════════════════════════════════════
# DELETE /donations/{donation_id}
# ══════════════════════════════════════════════════════════
@router.delete("/{donation_id}")
def delete_donation(donation_id: int):
    check = (
        supabase.table("donations")
        .select("id")
        .eq("id", donation_id)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Donation not found")

    result = (
        supabase.table("donations")
        .delete()
        .eq("id", donation_id)
        .execute()
    )
    return {"message": "Donation deleted successfully"}