import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return
        
    if "CalculatedRisk" in content or "calculatedrisk" in content or "CalculatedRisk" in content or "calculatedrisk" in content:
        # Replace CalculatedRisk and CalculatedRisk with CalculatedRisk
        new_content = content.replace("CalculatedRisk", "CalculatedRisk")
        new_content = new_content.replace("calculatedrisk", "calculatedrisk")
        new_content = new_content.replace("CalculatedRisk", "CalculatedRisk")
        new_content = new_content.replace("calculatedrisk", "calculatedrisk")
        
        # Openalgo variables like calculatedrisk_compat shouldn't strictly be renamed in filenames automatically by this script, 
        # but content mentions are fine.
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Rebranded {filepath}")

for root, dirs, files in os.walk("/Users/aditya/Desktop/calculatedrisk/backend"):
    if ".venv" in root or "__pycache__" in root or ".git" in root or "node_modules" in root:
        continue
    for file in files:
        if file.endswith((".py", ".md", ".yml", ".yaml", ".json", ".txt", ".env.example", ".sh")):
            # Don't rename the compat file itself yet just in case.
            if "calculatedrisk_compat" not in file:
                replace_in_file(os.path.join(root, file))
