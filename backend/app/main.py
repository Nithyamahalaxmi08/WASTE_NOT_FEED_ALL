from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.database import supabase

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
@app.get("/db-test")
def db_test():
    result = supabase.table("donors").select("*").execute()
    return result.data

@app.get("/")
def root():
    return {"message": "Waste Not Feed All API"}