import database_models
from database import engine
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import models, auth
from routers import students, admins, rooms, room_allocations, complaints, fees, document, ask

database_models.Base.metadata.create_all(bind=engine)

app =FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(students.router)
app.include_router(auth.router)
app.include_router(admins.router)
app.include_router(rooms.router)
app.include_router(room_allocations.router)
app.include_router(complaints.router)
app.include_router(fees.router)
app.include_router(document.router)
app.include_router(ask.router)

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")


@app.get("/admin")
def serve_admin():
    return FileResponse("static/admin.html")


@app.get("/student")
def serve_student():
    return FileResponse("static/student.html")

