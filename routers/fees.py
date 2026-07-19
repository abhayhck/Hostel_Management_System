from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import database_models
import models

router = APIRouter()


@router.get("/fees")
def get_fees(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "student":
        return (
            db.query(database_models.fees)
            .filter(database_models.fees.student_id == current_user.user_id)
            .all()
        )
    return db.query(database_models.fees).all()


@router.post("/fees")
def create_fee(
    new_fee: models.FeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail = "Only administrator can update fees record")
    
    db_student = (
        db.query(database_models.students)
        .filter(database_models.students.student_id == new_fee.student_id)
        .first()
    )
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    db_fee = database_models.fees(
        student_id=new_fee.student_id,
        amount=new_fee.amount,
        due_date=new_fee.due_date,
        status=new_fee.status,
    )
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return db_fee


@router.put("/fees/{id}")
def update_fee(
    id: int,
    updated_fee: models.FeeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail = "Only administrator can update fees record")
    
    db_fee = db.query(database_models.fees).filter(database_models.fees.fee_id == id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    db_fee.amount = updated_fee.amount
    db_fee.due_date = updated_fee.due_date
    db_fee.status = updated_fee.status
    db.commit()
    db.refresh(db_fee)
    return db_fee


@router.delete("/fees/{id}")
def delete_fee(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail = "Only administrator can update fees record")
    
    db_fee = db.query(database_models.fees).filter(database_models.fees.fee_id == id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    db.delete(db_fee)
    db.commit()
    return {"message": "Fee record deleted successfully"}
