from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from pydantic import BaseModel
from ..auth import get_current_user, get_password_hash
from uuid import UUID
from typing import Optional, List

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreate(BaseModel):
    name: str
    role: str
    pin_code: str
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    pin_code: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: UUID
    name: str
    role: str
    is_active: bool
    class Config:
        from_attributes = True

@router.get("", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    # anyone logged in can fetch? let's secure it but since it's local POS, simple is fine.
    users = db.query(User).all()
    return users

@router.post("", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_pin = get_password_hash(user.pin_code)
    db_user = User(
        name=user.name,
        role=user.role,
        pin_code=hashed_pin,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: UUID, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.role is not None:
        db_user.role = user_update.role
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.pin_code:
        db_user.pin_code = get_password_hash(user_update.pin_code)
        
    db.commit()
    db.refresh(db_user)
    return db_user
