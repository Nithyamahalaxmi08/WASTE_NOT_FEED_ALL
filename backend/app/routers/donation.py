from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.schemas.donation_schema import DonationCreate

router = APIRouter(
    prefix="/donations",
    tags=["Donations"]
)

# CREATE donation
@router.post("/")
def create_donation(donation: DonationCreate):

    donation_data = donation.model_dump(mode="json")

    response = supabase.table("donations").insert(donation_data).execute()

    return response.data


# GET all donations
@router.get("/")
def get_donations():
    response = supabase.table("donations").select("*").execute()
    return response.data


# UPDATE donation
@router.put("/{donation_id}")
def update_donation(donation_id: int, donation: dict):
    response = supabase.table("donations").update(donation).eq("id", donation_id).execute()
    return response.data


# DELETE donation
@router.delete("/{donation_id}")
def delete_donation(donation_id: int):
    response = supabase.table("donations").delete().eq("id", donation_id).execute()
    return {"message": "Donation deleted"}