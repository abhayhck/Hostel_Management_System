from fastapi import APIRouter, Depends, HTTPException
from database import get_db
import database_models
from sqlalchemy.orm import Session
from auth import get_current_user, get_password_hash
from models import admins

router  = APIRouter()
@router.get("/admins")
def get_admins(db:Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(database_models.admins).all()

@router.get("/admins/{id}")
def get_admin_by_id(id:int, db:Session=Depends(get_db),
                    current_user=Depends(get_current_user)):
    return db.query(database_models.admins).filter(database_models.admins.admin_id == id).first()



@router.post("/admins")
def add_admin(new_admin:admins,
               db:Session = Depends(get_db), 
               current_user=Depends(get_current_user)):
    user = database_models.users(
        role="admin",
        password_hash = get_password_hash(new_admin.password),
        username = new_admin.phone
    )
    db.add(user)
    db.flush()
    db_admin = database_models.admins(
        admin_id=user.user_id,
        email=new_admin.email,
        name=new_admin.name,
        phone=new_admin.phone,
        designation=new_admin.designation,
    )
    db.add(db_admin)
    db.commit()
    return {
        "msg" : "Admin Added Successfully",
        "admin_id" : user.user_id
    }


@router.put("/admins")
def update_admin(updated_admin:admins, db:Session =Depends(get_db), current_user=Depends(get_current_user)):
    db_admin = db.query(database_models.admins).filter(database_models.admins.admin_id == updated_admin.admin_id).first()
    if db_admin:
        db_admin.name = updated_admin.name
        db_admin.email = updated_admin.email
        db_admin.phone = updated_admin.phone
        db_admin.designation = updated_admin.designation
        db.commit()
        return "Admin Updated Successfully"
    raise HTTPException(status_code=404, detail="Admin not found")

@router.delete("/admins/{id}")
def delete_admin(id:int, db:Session=Depends(get_db), current_user = Depends(get_current_user)):
    db_admin = db.query(database_models.admins).filter(database_models.admins.admin_id == id).first()
    if db_admin:
        db.delete(db_admin)
        db.commit()
        return "Admin Deleted"
    else:
        return "Admin not found"

