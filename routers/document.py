from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import database_models
import models

router = APIRouter()


@router.get("/documents")
def get_documents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "student":
        return (
            db.query(database_models.documents)
            .filter(database_models.documents.student_id == current_user.user_id)
            .all()
        )
    return db.query(database_models.documents).all()


@router.post("/documents")
def create_document(
    new_document: models.DocumentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_student = (
        db.query(database_models.students)
        .filter(database_models.students.student_id == new_document.student_id)
        .first()
    )
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    db_document = database_models.documents(
        student_id=new_document.student_id,
        document_name=new_document.document_name,
        upload_at=new_document.upload_at,
        file_path=new_document.file_path,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


@router.put("/documents/{id}")
def update_document(
    id: int,
    updated_document: models.DocumentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_document = (
        db.query(database_models.documents)
        .filter(database_models.documents.document_id == id)
        .first()
    )
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    db_document.document_name = updated_document.document_name
    db_document.upload_at = updated_document.upload_at
    db_document.file_path = updated_document.file_path
    db.commit()
    db.refresh(db_document)
    return db_document


@router.delete("/documents/{id}")
def delete_document(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_document = (
        db.query(database_models.documents)
        .filter(database_models.documents.document_id == id)
        .first()
    )
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(db_document)
    db.commit()
    return {"message": "Document deleted successfully"}
