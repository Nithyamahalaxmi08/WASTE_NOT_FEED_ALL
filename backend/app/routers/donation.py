import math
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase

router = APIRouter(
    prefix="/donations",
    tags=["Donations"],
)

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

# GET /donor/profile/{donor_id}
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


# PUT /donor/profile/{donor_id}
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
        # Fetch all red spots once
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
            # Filter spots whose city matches the district
            district_spots = [
                s for s in spots
                if s.get("city", "").strip().lower() == district.lower()
            ]

            if district_spots:
                # Pick the first one (you could randomise or pick by type priority)
                spot = district_spots[0]
                spot["distance_km"] = None   # same district, distance not computed
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
# POST /donations  –  Create donation
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
# GET /donations  –  Get all donations
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
# GET /donations/available
# ══════════════════════════════════════════════════════════
@router.get("/available")
def get_available_donations():
    result = (
        supabase.table("donations")
        .select("*")
        .eq("status", "available")
        .is_("claimed_by", "null")
        .execute()
    )
    return result.data or []


# ══════════════════════════════════════════════════════════
# GET /donations/claims/{ngo_id}
# ══════════════════════════════════════════════════════════
@router.get("/claims/{ngo_id}")
def get_my_claims(ngo_id: str):
    result = (
        supabase.table("donations")
        .select("*")
        .eq("claimed_by", ngo_id)
        .execute()
    )
    return result.data or []


# ══════════════════════════════════════════════════════════
# PUT /donations/{id}/claim  –  Claim + recommend red spot
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

    current_status = str(check.data[0].get("status", "")).lower()
    if current_status != "available":
        raise HTTPException(status_code=400, detail="Donation is no longer available")

    result = (
        supabase.table("donations")
        .update({"status": "claimed", "claimed_by": body.ngo_id})
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
            # came via lat/lng fallback
            rec_message = (
                f"📍 Deliver to {spot['place_name']} "
                f"({type_label}) — "
                f"{spot['city']} | "
                f"~{spot['distance_km']} km from pickup"
            )
        else:
            # came via district match
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
# PUT /donations/{id}  –  Generic update
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
# DELETE /donations/{id}  –  Delete donation
# ══════════════════════════════════════════════════════════
@router.delete("/{donation_id}")
def delete_donation(donation_id: int):
    result = (
        supabase.table("donations")
        .delete()
        .eq("id", donation_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Donation not found")
    return {"message": "Donation deleted successfully"}
