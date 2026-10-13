from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import get_db
import database_models
from models import RoomAllocationCreate, RoomAllocationRelease

router = APIRouter()


@router.get("/room_allocations")
def get_roomallocation_details(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(database_models.room_allocation)
    if current_user.role == "student":
        query = query.filter(
            database_models.room_allocation.student_id == current_user.user_id
        )
    return query.all()


@router.post("/room_allocations")
def allocate_room(
    allocation: RoomAllocationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    student_id = allocation.student_id
    room_id = allocation.room_id

    active_allocation = (
        db.query(database_models.room_allocation)
        .filter(
            database_models.room_allocation.student_id == student_id,
            database_models.room_allocation.release_date.is_(None),
        )
        .first()
    )
    db_room = (
        db.query(database_models.rooms)
        .filter(database_models.rooms.room_id == room_id)
        .first()
    )
    db_student = (
        db.query(database_models.students)
        .filter(database_models.students.student_id == student_id)
        .first()
    )

    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    if active_allocation:
        raise HTTPException(
            status_code=400,
            detail="Student is already allocated a room",
        )
    if db_room.capacity <= db_room.occupied:
        raise HTTPException(status_code=400, detail="Room is full")

    db_room_allocation = database_models.room_allocation(
        student_id=student_id,
        room_id=room_id,
    )
    db.add(db_room_allocation)
    db_room.occupied += 1

    db.commit()
    db.refresh(db_room_allocation)
    return db_room_allocation


@router.put("/room_allocations/{id}/release")
def release_student(
    id: int,
    release_data: RoomAllocationRelease,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    db_allocation = (
        db.query(database_models.room_allocation)
        .filter(database_models.room_allocation.allocation_id == id)
        .first()
    )
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if db_allocation.release_date is not None:
        raise HTTPException(status_code=400, detail="Room already released")

    db_room = (
        db.query(database_models.rooms)
        .filter(database_models.rooms.room_id == db_allocation.room_id)
        .first()
    )
    if not db_room:
        raise HTTPException(status_code=404, detail="Allocated room not found")

    db_allocation.release_date = release_data.release_date or "released"
    if db_room.occupied > 0:
        db_room.occupied -= 1

    db.commit()
    db.refresh(db_allocation)
    return db_allocation
