import os
import re

src_files = [
    "ivchart.py", "custom_straddle.py", "gamma_density.py", 
    "ivsmile.py", "oiprofile.py", "oitracker.py", 
    "straddle_chart.py", "vol_surface.py"
]

out_content = """from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any

router = APIRouter()

"""

for f in src_files:
    path = f"../calculatedrisk/blueprints/{f}"
    if not os.path.exists(path):
        continue
    with open(path, 'r') as file:
        content = file.read()
        
    # very naive translation for demonstration
    content = re.sub(r'from flask import.*', '', content)
    content = re.sub(r'from flask_cors import.*', '', content)
    content = re.sub(r'@\w+_bp\.route\("([^"]+)", methods=\["([^"]+)"\]\)', r'@router.\2("\1")', content)
    content = re.sub(r'@cross_origin\(\)', '', content)
    content = re.sub(r'@check_session_validity', '', content)
    content = re.sub(r'def (\w+)\(\):', r'def \1(data: Dict[str, Any] = Body({})):', content)
    content = re.sub(r'request\.get_json\(silent=True\)', 'data', content)
    content = re.sub(r'return jsonify\((.*)\), (\d+)', r'return \1', content)
    content = re.sub(r'session\.get\("[^"]+"\)', '"dummy_user"', content)
    content = re.sub(r'session\["[^"]+"\]', '"dummy_user"', content)
    
    # fix HTTP methods being uppercase in route decorators
    content = content.replace('@router.POST', '@router.post')
    content = content.replace('@router.GET', '@router.get')
    
    out_content += content + "\n\n"

with open("app/routes/options_tools.py", "w") as out:
    out.write(out_content)

print("Migration script generated options_tools.py")
