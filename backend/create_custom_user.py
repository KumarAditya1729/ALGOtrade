import sys
from app import create_app
from app.services.user_service import get_user_service

app = create_app()

with app.app_context():
    service = get_user_service()
    try:
        user_id = service.create_user({'username': 'KumarAditya', 'password': 'Nicehome@1', 'role': 'admin'})
        if user_id:
            print("Created new user: KumarAditya")
        else:
            print("Failed to create user (already exists?)")
    except ValueError as e:
        if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
            # If it already exists, update password
            try:
                # We need to find the user id
                # But let's just let the user know if they exist
                print(f"User might already exist: {e}")
            except Exception as e2:
                print(f"Error updating: {e2}")
        else:
            print(f"ValueError: {e}")
    except Exception as e:
        print(f"Error: {e}")
