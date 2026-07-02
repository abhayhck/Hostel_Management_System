#pip install python-multipart
#pip install python-jose[cryptography]
#pip install passlib[bcrypt]

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
import database_models
import models


secret_key = "4d885d12399d25c58023a759313571b385515356607c97b7d73bd203f9ae2f9f"
algorithm = "HS256"
access_token_expire_minutes = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth_2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(tags=["Authentication"])


# added by cursor
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# added by cursor
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# added by cursor
def get_user(username: str, db: Session):
    return (
        db.query(database_models.users)
        .filter(database_models.users.username == username)
        .first()
    )


# added by cursor
def authenticate_user(username: str, password: str, db: Session):
    user = get_user(username, db)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user


# added by cursor
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


# added by cursor
def get_current_user(
    token: str = Depends(oauth_2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user(username, db)
    if user is None:
        raise credentials_exception
    return user


# added by cursor
@router.post("/token", response_model=models.token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.user_id},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


# added by cursor
@router.get("/users/me")
def read_users_me(current_user=Depends(get_current_user)):
    return current_user


# added by cursor
@router.post("/logout")
def logout_user():
    return {
        "message": "Logout successful on client side. Remove the bearer token from storage.",
    }