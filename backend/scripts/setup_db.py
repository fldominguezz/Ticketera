import os
import uuid
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Text, ARRAY, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr, ConfigDict, model_validator # For UserRole definition
import enum # For UserRole definition

# --- UserRole Enum Definition ---
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"
    ANALYST = "analyst"
    MANAGER = "manager"

# --- SQLAlchemy Base and Model Definitions ---
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Group(Base):
    __tablename__ = "groups"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    parent_id = Column(PG_UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    users = relationship("User", back_populates="group")

class Role(Base):
    __tablename__ = "roles"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

class UserRoleAssociation(Base): # Association table for many-to-many between User and Role
    __tablename__ = "user_roles"
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(PG_UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    user = relationship("User", back_populates="roles")
    role = relationship("Role")

class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    group_id = Column(PG_UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    preferred_language = Column(String(5), default="es") # es, en, fr, it
    
    # 2FA and Security
    is_2fa_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String(255), nullable=True)
    recovery_codes = Column(ARRAY(Text), nullable=True)
    
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    force_password_change = Column(Boolean, default=False, nullable=False)
    reset_2fa_next_login = Column(Boolean, default=False, nullable=False)
    enroll_2fa_mandatory = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    group = relationship("Group", back_populates="users")
    roles = relationship("UserRoleAssociation", back_populates="user", cascade="all, delete-orphan") # Use the association class
    # ... other relationships would be defined here ...

# --- Security Helper ---
# Minimal implementation for password hashing
class SecurityHelper:
    def get_password_hash(self, password: str) -> str:
        # In a real app, use a proper hashing library like passlib with argon2-cffi
        # For demonstration, a placeholder. THIS IS NOT SECURE FOR PRODUCTION.
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
            return pwd_context.hash(password)
        except ImportError:
            print("WARNING: passlib not installed. Using insecure placeholder for password hashing.")
            return f"hashed_{password}" # Insecure placeholder

security_helper = SecurityHelper()

# --- Database Connection and Script Logic ---
# Use the database URL from environment variables or default
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/ticketera")
engine = create_engine(DATABASE_URL)

# Create tables if they don't exist
print("Creating tables if they don't exist...")
Base.metadata.create_all(bind=engine)
print("Tables creation/check complete.")

# --- Seeding Data ---
def seed_initial_data():
    db = SessionLocal()
    try:
        # --- Seed Root Group 'Administradores' ---
        existing_group = db.query(Group).filter(Group.name == 'Administradores').first()
        if not existing_group:
            admin_group_id = uuid.uuid4()
            admin_group = Group(id=admin_group_id, name='Administradores', description='Root group for administrators', parent_id=None)
            db.add(admin_group)
            db.flush() # Flush to get the ID for user assignment
            print(f"Created group: Administradores ({admin_group_id})")
        else:
            admin_group_id = existing_group.id
            print(f"Group 'Administradores' already exists with ID: {admin_group_id}")

        # --- Seed Role 'superadmin' (mapping to ADMIN) ---
        # Check if 'admin' role exists, create if not.
        admin_role_name = UserRole.ADMIN.value # Map 'superadmin' request to 'admin'
        admin_role = db.query(Role).filter(Role.name == admin_role_name).first()
        if not admin_role:
            admin_role_id = uuid.uuid4()
            admin_role = Role(id=admin_role_id, name=admin_role_name, description='Super administrator role')
            db.add(admin_role)
            db.flush() # Flush to get the ID for user_roles assignment
            print(f"Created role: {admin_role_name} ({admin_role_id})")
        else:
            admin_role_id = admin_role.id
            print(f"Role '{admin_role_name}' already exists with ID: {admin_role_id}")

        # --- Seed Admin User ---
        admin_user_email = "admin@example.com"
        existing_user = db.query(User).filter(User.email == admin_user_email).first()
        if not existing_user:
            admin_user_id = uuid.uuid4()
            admin_username = "admin"
            admin_password_plain = "adminpassword" # User specified password
            hashed_password = security_helper.get_password_hash(admin_password_plain)

            admin_user = User(
                id=admin_user_id,
                username=admin_username,
                email=admin_user_email,
                hashed_password=hashed_password,
                first_name="Admin",
                last_name="User",
                full_name="Admin User",
                is_active=True,
                is_superuser=True, # Keep as True for initial admin
                group_id=admin_group_id, # Link to the created group
                preferred_language="es",
                is_2fa_enabled=False, # As requested
                totp_secret=None,
                recovery_codes=None,
                failed_login_attempts=0,
                locked_until=None,
                force_password_change=False, # As requested
                reset_2fa_next_login=False, # As requested
                enroll_2fa_mandatory=False, # As requested
                # created_at and updated_at will be set by server_default/onupdate
            )
            db.add(admin_user)
            db.flush() # Flush to get the user ID for role assignment

            # --- Assign Role to Admin User ---
            user_role = UserRoleAssociation(user_id=admin_user_id, role_id=admin_role_id) # Use association class
            db.add(user_role)
            
            print(f"Created admin user: {admin_username} ({admin_user_id})")
        else:
            print(f"Admin user with email {admin_user_email} already exists. Skipping creation.")
            # If user exists, ensure they have the admin role and are in the correct group.
            # For now, we skip if user exists to avoid potential issues.

        db.commit()
        print("Initial data seeding complete.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting database setup script...")
    # Ensure tables are created before seeding
    # This assumes the schema migrations are handled separately or this script is run first
    # on an empty DB. If using Alembic, you'd typically run 'alembic upgrade head' first.
    # For this script-based approach, we'll create tables here.
    
    print("Ensuring tables exist...")
    # Base.metadata.create_all(bind=engine) # This would create tables, but Alembic is still preferred for schema management.
    # For direct SQL script, we assume the tables are created by a prior Alembic step or are present.
    # If running this script standalone on a truly empty DB, create_all would be needed.
    # Given the prior issues, we'll rely on the manual migration creation for schema.
    # This script will focus SOLELY on seeding data into potentially existing tables.
    
    print("Seeding initial data...")
    seed_initial_data()
    print("Database setup script finished.")