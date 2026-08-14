import sys
import os

from flask import Flask, g
from app.routes.dashboard import summary
from app.utils.db import get_db_connection

app = Flask(__name__)
app.config["TESTING"] = True

with app.test_request_context('/api/v1/dashboard/summary'):
    g.user_id = 1
    # See if it runs
    try:
        res = summary()
        print(res.get_json())
    except Exception as e:
        print("Error:", e)
