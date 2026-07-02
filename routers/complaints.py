from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import database_models
import models

router = APIRouter()


@router.get("/complaints")
def get_complaints(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "student":
        return (
            db.query(database_models.complaints)
            .filter(database_models.complaints.student_id == current_user.user_id)
            .all()
        )
    return db.query(database_models.complaints).all()


@router.post("/complaints")
def create_complaint(
    new_complaint: models.ComplaintCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_student = (
        db.query(database_models.students)
        .filter(database_models.students.student_id == new_complaint.student_id)
        .first()
    )
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    db_complaint = database_models.complaints(
        student_id=new_complaint.student_id,
        complaint_desc=new_complaint.complaint_desc,
        status=new_complaint.status,
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint


@router.put("/complaints/{id}")
def update_complaint(
    id: int,
    updated_complaint: models.ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_complaint = (
        db.query(database_models.complaints)
        .filter(database_models.complaints.complaint_id == id)
        .first()
    )
    if not db_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    db_complaint.complaint_desc = updated_complaint.complaint_desc
    db_complaint.status = updated_complaint.status
    db.commit()
    db.refresh(db_complaint)
    return db_complaint


@router.delete("/complaints/{id}")
def delete_complaint(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_complaint = (
        db.query(database_models.complaints)
        .filter(database_models.complaints.complaint_id == id)
        .first()
    )
    if not db_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    db.delete(db_complaint)
    db.commit()
    return {"message": "Complaint deleted successfully"}
