from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import get_db
import database_models
import models

router = APIRouter()


@router.get("/rooms")
def get_allrooms(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(database_models.rooms).all()


@router.post("/rooms")
def create_rooms(
    new_room: models.RoomCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    existing_room = (
        db.query(database_models.rooms)
        .filter(database_models.rooms.room_no == new_room.room_no)
        .first()
    )
    if existing_room:
        raise HTTPException(status_code=400, detail="Room already exists")

    if new_room.capacity < 1:
        raise HTTPException(status_code=400, detail="Capacity must be at least 1")

    if new_room.occupied < 0 or new_room.occupied > new_room.capacity:
        raise HTTPException(
            status_code=400,
            detail="Occupied count must be between 0 and capacity",
        )

    db_room = database_models.rooms(
        room_no=new_room.room_no,
        room_type=new_room.room_type,
        capacity=new_room.capacity,
        occupied=new_room.occupied,
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


@router.put("/rooms/{id}")
def update_rooms(
    id: int,
    updated_room: models.RoomUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    db_room = (
        db.query(database_models.rooms)
        .filter(database_models.rooms.room_id == id)
        .first()
    )
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    duplicate_room = (
        db.query(database_models.rooms)
        .filter(
            database_models.rooms.room_no == updated_room.room_no,
            database_models.rooms.room_id != id,
        )
        .first()
    )
    if duplicate_room:
        raise HTTPException(status_code=400, detail="Room number already exists")

    if updated_room.capacity < 1:
        raise HTTPException(status_code=400, detail="Capacity must be at least 1")

    if updated_room.occupied < 0 or updated_room.occupied > updated_room.capacity:
        raise HTTPException(
            status_code=400,
            detail="Occupied count must be between 0 and capacity",
        )

    db_room.room_no = updated_room.room_no
    db_room.room_type = updated_room.room_type
    db_room.capacity = updated_room.capacity
    db_room.occupied = updated_room.occupied
    db.commit()
    db.refresh(db_room)
    return db_room


@router.delete("/rooms/{id}")
def delete_rooms(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    db_room = (
        db.query(database_models.rooms)
        .filter(database_models.rooms.room_id == id)
        .first()
    )
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    active_allocation = (
        db.query(database_models.room_allocation)
        .filter(
            database_models.room_allocation.room_id == id,
            database_models.room_allocation.release_date.is_(None),
        )
        .first()
    )
    if active_allocation:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete room with active allocation",
        )

    db.delete(db_room)
    db.commit()
    return {"message": "Room deleted successfully"}
