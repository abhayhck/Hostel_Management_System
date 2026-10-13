from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import db_url, readonly_db_url

engine = create_engine(db_url)
sessionlocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = sessionlocal()
    try:
        yield db
    finally:
        db.close()


readonly_engine = create_engine(readonly_db_url)
readonly_sessionlocal = sessionmaker(autocommit=False, autoflush=False, bind=readonly_engine)

def get_readonly_db():
    db = readonly_sessionlocal()
    try:
        yield db
    finally:
        db.close()