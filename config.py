from dotenv import load_dotenv
import os

load_dotenv()

db_url = os.getenv("db_url")
secret_key = os.getenv("secret_key")
algorithm = "HS256"
access_token_expire_minutes = 30
