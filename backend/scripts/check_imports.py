print("Starting import check...")
try:
    print("Importing app.main...")
    from app.main import app
    print("Successfully imported app.main")
except Exception as e:
    import traceback
    print(f"Import failed: {e}")
    traceback.print_exc()
