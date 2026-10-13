from fastapi import APIRouter, Depends, HTTPException
from database import get_db
import database_models
import models
from auth import get_current_user, get_password_hash, require_admin
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/students/me")
def get_my_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this profile")
    student = (
        db.query(database_models.students)
        .filter(database_models.students.student_id == current_user.user_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.get("/students")
def get_students(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    db_students = db.query(database_models.students).all()
    return db_students
'''
@router.get("/students/{id}")
def get_studentbyid(id:int, db:Session = Depends(get_db)):
    db_student = db.query(database_models.students).filter(database_models.students.student_id == id).first()
    if db_student:    
        return db_student
    else:
        return "Student not found"
'''
    
@router.post("/students")
def create_student(new_student:models.students, db:Session = Depends(get_db), current_user=Depends(require_admin)):
    #creating user in users table
    user = database_models.users( 
        username = new_student.phone,
        password_hash = get_password_hash(new_student.password),
        role = "student"
    )
    db.add(user)
    db.flush() #postgresql will generate user_id

    #creating student
    student = database_models.students(
        student_id = user.user_id,
        name = new_student.name,
        email = new_student.email,
        phone = new_student.phone, 
        course = new_student.course,
        year = new_student.year,
        gender = new_student.gender,
        address = new_student.address ,
        emergency_contact = new_student.emergency_contact
    )

    db.add(student)
    db.commit()
    return {
        "msg" : "Student Added Successfully",
        "student_id" : user.user_id
    }

@router.put("/students/{id}")
def update_student(id:int, updated_student:models.students, db:Session = Depends(get_db), current_user = Depends(require_admin) ):

    db_student = db.query(database_models.students).filter(database_models.students.student_id == id).first()
    if db_student:
        db_student.address = updated_student.address
        db_student.course = updated_student.course
        db_student.email = updated_student.email
        db_student.emergency_contact = updated_student.emergency_contact
        db_student.name = updated_student.name
        db_student.gender = updated_student.gender
        db_student.phone = updated_student.phone
        db_student.year = updated_student.year
        db.commit()
        return "Student Updated Successfully"
    else:
        return "student not found"

@router.delete("/students/{id}")
def delete_student(id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    db_student = db.query(database_models.students).filter(database_models.students.student_id == id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    db_user = db.query(database_models.users).filter(database_models.users.user_id == id).first()
    db.delete(db_student)
    db.flush()          # delete the student row first, since it references users
    if db_user:
        db.delete(db_user)
    db.commit()
    return "Student Deleted"

