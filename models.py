from pydantic import BaseModel

class token (BaseModel):
    access_token : str
    token_type: str

class tokenData(BaseModel):
    username: str | None = None

class hostel(BaseModel):
    user_id :int
    username :str
    password_hash :str
    role :str
    created_at :str

class students(BaseModel):
    student_id :int
    name :str
    email :str
    password:str
    phone :str
    course :str
    year :int
    gender :str
    address :str
    emergency_contact :int

class admins(BaseModel):
    admin_id :int
    name :str
    email :str
    phone :int
    password:str
    designation :str

class rooms(BaseModel):
    room_id :int
    room_no :str
    room_type :str
    capacity :int
    occupied :int

class RoomCreate(BaseModel):
    room_no: str
    room_type: str
    capacity: int
    occupied: int = 0

class RoomUpdate(BaseModel):
    room_no: str
    room_type: str
    capacity: int
    occupied: int
    
class RoomAllocationCreate(BaseModel):
    student_id: int
    room_id: int

class RoomAllocationRelease(BaseModel):
    release_date: str | None = None

class room_allocation(BaseModel):
    allocation_id : int
    student_id : int
    room_id : int
    allocation_date : str
    release_date : str

class complaints(BaseModel):
    complaint_id :int 
    student_id :int
    complaint_desc :str
    status :str
    created_at :str

class ComplaintCreate(BaseModel):
    student_id: int
    complaint_desc: str
    status: str = "pending"

class ComplaintUpdate(BaseModel):
    complaint_desc: str
    status: str

class fees(BaseModel):

    fee_id :int
    student_id :int
    amount :float
    due_date :str
    status :str

class FeeCreate(BaseModel):
    student_id: int
    amount: float
    due_date: str
    status: str = "pending"

class FeeUpdate(BaseModel):
    amount: float
    due_date: str
    status: str

class documents(BaseModel):
    
    document_id :int
    student_id :int
    document_name :str
    #document_no :str
    upload_at :str
    file_path :str

class DocumentCreate(BaseModel):
    student_id: int
    document_name: str
    upload_at: str
    file_path: str

class DocumentUpdate(BaseModel):
    document_name: str
    upload_at: str
    file_path: str

class notices(BaseModel):
    notice_id :int
    title :str
    description :str
    created_at :str
    posted_by :int