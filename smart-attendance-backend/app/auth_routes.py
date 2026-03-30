from fastapi import APIRouter, Depends, HTTPException, status, Form, Response, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from app.db import users_collection
from app.security import (
    verify_password, create_access_token, get_current_user, hash_password,
    validate_password_strength, validate_username, create_refresh_token
)
from app.email_utils import send_otp_email
from app.face_utils import get_face_embedding
from pydantic import BaseModel, EmailStr
import random
import uuid
import base64
import asyncio
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Auth"])

# Rate limit tracking (In-memory for simplicity as per plan)
# format: {"email_or_username": {"attempts": int, "lockout_until": datetime}}
LOGIN_ATTEMPTS = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

@router.post("/register")
async def register(
    username: str = Form(...),
    email: EmailStr = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    image: UploadFile = File(None)
):
    try:
        username = validate_username(username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not validate_password_strength(password):
        raise HTTPException(status_code=400, detail="Password does not meet security requirements")
        
    if users_collection.find_one({"$or": [{"email": email.lower()}, {"username": username}]}):
        raise HTTPException(status_code=400, detail="Username or email already exists")
        
    hashed_password = hash_password(password)
    
    # Process image if needed (e.g. generate face embeddings)
    face_embedding = []
    profile_image = None
    
    if image:
        image_bytes = await image.read()
        emb = await asyncio.to_thread(get_face_embedding, image_bytes)
        if emb is None:
            raise HTTPException(status_code=400, detail="No face detected. Please try capturing your face again.")
        face_embedding = emb.tolist()
        profile_image = base64.b64encode(image_bytes).decode()
        
    user_dict = {
        "username": username,
        "email": email.lower(),
        "password_hash": hashed_password,
        "name": name,
        "role": "employee",
        "active": True,
        "mfa_enabled": False,
        "failed_login_attempts": 0,
        "lockout_until": None,
        "active_sessions": [],
        "embedding": face_embedding,
        "profile_image": profile_image,
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(user_dict)
    return {"message": "User registered successfully"}

@router.post("/login")
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username.lower() # OAuth2 form calls it username but we expect email or username
    
    # Check rate limit
    attempt_info = LOGIN_ATTEMPTS.get(email, {"attempts": 0, "lockout_until": None})
    if attempt_info["lockout_until"] and datetime.utcnow() < attempt_info["lockout_until"]:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        
    user = users_collection.find_one({"$or": [{"email": email}, {"username": email}]})
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        # Increment failed attempts
        attempt_info["attempts"] += 1
        if attempt_info["attempts"] >= MAX_LOGIN_ATTEMPTS:
            attempt_info["lockout_until"] = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        LOGIN_ATTEMPTS[email] = attempt_info
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
        
    # Reset attempts on success
    if email in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[email]
        
    # Generate Tokens
    token_data = {"sub": user["email"], "role": user.get("role", "employee")}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "refresh_token": refresh_token,
        "created_at": datetime.utcnow()
    }
    
    users_collection.update_one(
        {"email": user["email"]},
        {
            "$push": {"active_sessions": session_data},
            "$set": {"last_login": datetime.utcnow()}
        }
    )
    
    # Set HttpOnly Cookie for Refresh Token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,     # True for production (HTTPS)
        samesite="lax",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "employee")
    }

@router.post("/refresh-token")
async def refresh_token(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    # Try finding user with this active session
    user = users_collection.find_one({"active_sessions.refresh_token": refresh_token})
    
    if not user:
        # Invalid refresh token
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    token_data = {"sub": user["email"], "role": user.get("role", "employee")}
    access_token = create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        # We need to remove this session from DB
        users_collection.update_one(
            {"active_sessions.refresh_token": refresh_token},
            {"$pull": {"active_sessions": {"refresh_token": refresh_token}}}
        )
    # Also delete the cookie
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

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
        # We still return success to prevent user enumeration
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
        
    if not validate_password_strength(req.new_password):
        raise HTTPException(status_code=400, detail="Password does not meet security requirements")
        
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
