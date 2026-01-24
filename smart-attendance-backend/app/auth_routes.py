from fastapi import APIRouter, Form, HTTPException
from app.db import users_collection
from app.security import verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/verify-password")
async def verify_user_password(
    email: str = Form(...),
    password: str = Form(...)
):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {"status": "verified"}
