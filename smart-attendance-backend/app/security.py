import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from dotenv import load_dotenv
from app.db import users_collection

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-please-change-in-prod-1234")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use auth/login as tokenUrl explicitly mapping to standard OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
        
    return {
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "employee"),
        "branch": user.get("branch", "Main Office")
    }

ROLE_HIERARCHY = {
    "super_admin": 4,
    "admin": 3,
    "manager": 2,
    "employee": 1
}

def require_role(min_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "employee")
        user_level = ROLE_HIERARCHY.get(user_role, 1)
        required_level = ROLE_HIERARCHY.get(min_role, 1)
        
        if user_level < required_level:
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
        return current_user
    return role_checker
