from sqlalchemy import Column, Integer,String, Float, ForeignKey, DateTime
from datetime import datetime

created_at = Column(DateTime, default=datetime.utcnow)
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class users(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key = True, index = True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class students(Base):
    __tablename__ = "students"
    student_id = Column(Integer,ForeignKey("users.user_id"), primary_key=True, index = True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    course = Column(String)
    year = Column(Integer)
    gender = Column(String)
    address = Column(String)
    emergency_contact = Column(String)

class admins(Base):
    __tablename__ = "admins"
    admin_id = Column(Integer,ForeignKey ("users.user_id") , primary_key=True , index = True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    designation = Column(String, nullable=True)

class rooms(Base):
    __tablename__ = "rooms"
    room_id = Column(Integer, primary_key=True, index = True)
    room_no = Column(String)
    room_type = Column(String)
    capacity = Column(Integer)
    occupied = Column(Integer)

class room_allocation(Base):
    __tablename__ = "room_allocation"
    allocation_id = Column(Integer, primary_key=True, index = True)
    student_id = Column(Integer, ForeignKey('students.student_id'))
    room_id = Column(Integer,ForeignKey("rooms.room_id"))
    allocation_date = Column(DateTime, default=datetime.utcnow)
    release_date = Column(String)
   
class complaints(Base):
    __tablename__ = "complaints"
    complaint_id = Column(Integer, primary_key=True, index = True)
    student_id = Column(Integer, ForeignKey('students.student_id'))
    complaint_desc = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class fees(Base):
    __tablename__ = "fees"
    fee_id = Column(Integer, primary_key=True, index = True)
    student_id = Column(Integer, ForeignKey('students.student_id'))
    amount = Column(Float)
    due_date = Column(String)
    status = Column(String)

class documents(Base):
    __tablename__ = "documents"
    document_id = Column(Integer, primary_key=True, index = True)
    student_id = Column(Integer, ForeignKey('students.student_id'))
    document_name = Column(String)
    #document_no = Column(String)
    upload_at = Column(String)
    file_path = Column(String)

class notices(Base):
    __tablename__ = "notices"
    notice_id = Column(Integer, primary_key=True, index = True)
    title = Column(String)
    description = Column(String)
    created_at = Column(String)
    posted_by = Column(Integer, ForeignKey('admins.admin_id'))

class ask_log(Base):
    __tablename__ = "ask_log"
    log_id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.user_id"))
    question = Column(String)
    generated_sql = Column(String)
    outcome = Column(String)      # ok / cannot_answer / rejected / failed / llm_error
    row_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)