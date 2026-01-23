"""Seed initial IAM and Group data

Revision ID: 9719d81a184a
Revises: ef87b0dd85db
Create Date: 2026-01-22 22:24:13.123456

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

# revision identifiers, used by Alembic.
revision = '9719d81a184a'
down_revision = 'ef87b0dd85db'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # ### Manually defined data seeding ###
    
    # Define table helpers
    groups_table = sa.table('groups',
        sa.column('id', UUID),
        sa.column('name', sa.String),
        sa.column('parent_id', UUID)
    )
    
    # --- Create Groups ---
    root_group_id = uuid.uuid4()
    op.bulk_insert(groups_table, [
        {'id': root_group_id, 'name': 'División Seguridad Informática', 'parent_id': None},
        {'id': uuid.uuid4(), 'name': 'Área Técnica', 'parent_id': root_group_id},
        {'id': uuid.uuid4(), 'name': 'Área SOC', 'parent_id': root_group_id},
        {'id': uuid.uuid4(), 'name': 'Área Administrativa', 'parent_id': root_group_id},
        {'id': uuid.uuid4(), 'name': 'Área Concientización', 'parent_id': root_group_id},
    ])
    
    # You can add seeding for Roles and Permissions here as well
    # For now, this establishes the core group hierarchy.

def downgrade() -> None:
    # ### Manually defined data removal ###
    # This is destructive, be careful in production.
    op.execute("DELETE FROM groups WHERE name IN ('División Seguridad Informática', 'Área Técnica', 'Área SOC', 'Área Administrativa', 'Área Concientización')")
