from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import Token, POSLogin
from ..auth import verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login/admin", response_model=Token)
def login_admin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"user_id": str(user.id), "role": user.role, "branch_id": str(user.branch_id) if user.branch_id else None}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/pos", response_model=Token)
def login_pos(login_data: POSLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.pin_code == login_data.pin_code).first()
    
    if not user:
        users = db.query(User).filter(User.is_active == True).all()
        for u in users:
            if u.pin_code and len(u.pin_code) > 10:
                try:
                    if verify_password(login_data.pin_code, u.pin_code):
                        user = u
                        break
                except Exception:
                    pass
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect PIN")
        
    access_token = create_access_token(
        data={"user_id": str(user.id), "role": user.role, "branch_id": str(user.branch_id) if user.branch_id else None}
    )
    return {"access_token": access_token, "token_type": "bearer"}
