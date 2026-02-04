"""Correct user table schema and seed initial data

Revision ID: 8cb177b16662
Revises: 601ed2a3a16c
Create Date: 2026-01-31 18:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from app.core.security import get_password_hash
from app.schemas.user import UserRole

# revision identifiers, used by Alembic.
revision: str = '8cb177b16662'
down_revision: Union[str, None] = '601ed2a3a16c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # --- Seeding Initial Data ---
    
    # Define table helpers for seeding
    groups_table = sa.table(
        "groups",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("parent_id", sa.UUID),
        sa.column("description", sa.String),
        sa.column("dashboard_layout", JSONB)
    )

    users_table = sa.table(
        "users",
        sa.column("id", sa.UUID),
        sa.column("username", sa.String),
        sa.column("email", sa.String),
        sa.column("hashed_password", sa.String),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
        sa.column("full_name", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("is_superuser", sa.Boolean),
        sa.column("group_id", sa.UUID),
        sa.column("preferred_language", sa.String),
        sa.column("is_2fa_enabled", sa.Boolean),
        sa.column("failed_login_attempts", sa.Integer),
        sa.column("force_password_change", sa.Boolean),
        sa.column("reset_2fa_next_login", sa.Boolean),
        sa.column("enroll_2fa_mandatory", sa.Boolean),
        sa.column("policy_exempt", sa.Boolean),
        sa.column("dashboard_layout", JSONB),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime)
    )

    admin_group_id = uuid.uuid4()
    admin_user_id = uuid.uuid4()
    now = datetime.now()

    # Bulk Insert Group
    op.bulk_insert(groups_table, [
        {
            'id': admin_group_id, 
            'name': 'Administradores', 
            'parent_id': None, 
            'description': 'Root group for administrators',
            'dashboard_layout': []
        },
    ])

    # Bulk Insert User
    op.bulk_insert(users_table, [
        {
            "id": admin_user_id,
            "username": "admin",
            "email": "admin@example.com",
            "hashed_password": get_password_hash("admin123"),
            "first_name": "Admin",
            "last_name": "User",
            "full_name": "Admin User",
            "is_active": True,
            "is_superuser": True,
            "group_id": admin_group_id,
            "preferred_language": "es",
            "is_2fa_enabled": False,
            "failed_login_attempts": 0,
            "force_password_change": False,
            "reset_2fa_next_login": False,
            "enroll_2fa_mandatory": False,
            "policy_exempt": False,
            "dashboard_layout": [],
            "created_at": now,
            "updated_at": now
        }
    ])

def downgrade() -> None:
    op.execute("DELETE FROM users WHERE username = 'admin'")
    op.execute("DELETE FROM groups WHERE name = 'Administradores'")