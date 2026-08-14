from app import create_app
app = create_app()
app.config["TESTING"] = True
with app.app_context():
    for rule in app.url_map.iter_rules():
        print(rule)
