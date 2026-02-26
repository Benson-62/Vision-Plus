from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from app.db import users_collection
from app.security import verify_password, create_access_token, get_current_user, hash_password
from app.email_utils import send_otp_email
from pydantic import BaseModel
import random
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 login endpoint. 
    Expects 'username' (which is the user's email) and 'password' as form data.
    """
    user = users_collection.find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    # Generate JWT
    access_token = create_access_token(
        data={"sub": user["email"], "role": user.get("role", "employee")}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "employee")
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    """
    return current_user

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Generates a 6-digit OTP and saves it to the user's document for password reset.
    """
    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    users_collection.update_one(
        {"email": req.email},
        {"$set": {"reset_otp": otp, "reset_otp_expires": expires_at}}
    )
    
    # Send the email
    email_sent = send_otp_email(req.email, otp)
    
    if not email_sent:
        # We still return success to prevent user enumeration, but you could raise an error here if preferred
        pass
        
    return {"message": "OTP sent to your email"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Verifies the OTP and resets the user's password.
    """
    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    stored_otp = user.get("reset_otp")
    expires_at = user.get("reset_otp_expires")
    
    if not stored_otp or stored_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if not expires_at or datetime.utcnow() > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
        
    hashed_password = hash_password(req.new_password)
    
    users_collection.update_one(
        {"email": req.email},
        {
            "$set": {"password_hash": hashed_password},
            "$unset": {"reset_otp": "", "reset_otp_expires": ""}
        }
    )
    
    return {"message": "Password reset successfully"}

@router.post("/verify-password")
async def verify_user_password(
    email: str = Form(...),
    password: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies user password for sensitive actions (e.g., editing profile).
    """
    if current_user["email"] != email:
        raise HTTPException(status_code=403, detail="Email mismatch")
        
    user = users_collection.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    return {"status": "success"}
