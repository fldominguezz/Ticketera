"""Initial Master Migration

Revision ID: 0001_master
Revises: 
Create Date: 2026-02-04 03:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision: str = '0001_master'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Independent Tables
    op.create_table('groups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('parent_id', sa.UUID(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('dashboard_layout', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['groups.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('permissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('module', sa.String(length=50), nullable=True),
        sa.Column('scope_type', sa.String(length=20), server_default='none', nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
        sa.UniqueConstraint('name')
    )

    op.create_table('roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('hidden_nav_items', sa.JSON(), server_default='[]', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('workflows',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('password_policies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('min_length', sa.Integer(), nullable=False),
        sa.Column('requires_uppercase', sa.Boolean(), nullable=False),
        sa.Column('requires_lowercase', sa.Boolean(), nullable=False),
        sa.Column('requires_number', sa.Boolean(), nullable=False),
        sa.Column('requires_special_char', sa.Boolean(), nullable=False),
        sa.Column('expire_days', sa.Integer(), nullable=True),
        sa.Column('enforce_2fa_all', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('expedientes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('number', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('number')
    )

    # 2. Level 1 Dependent Tables
    op.create_table('users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=200), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('is_superuser', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('group_id', sa.UUID(), nullable=True),
        sa.Column('preferred_language', sa.String(length=5), server_default='es', nullable=True),
        sa.Column('is_2fa_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('totp_secret', sa.String(length=255), nullable=True),
        sa.Column('recovery_codes', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('force_password_change', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('reset_2fa_next_login', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('enroll_2fa_mandatory', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('policy_exempt', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('dashboard_layout', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )

    op.create_table('workflow_states',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workflow_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('status_key', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('is_initial', sa.Boolean(), default=False),
        sa.Column('is_final', sa.Boolean(), default=False),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('ticket_types',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('requires_sla', sa.Boolean(), default=True),
        sa.Column('has_severity', sa.Boolean(), default=True),
        sa.Column('workflow_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 3. Level 2 Dependent Tables
    op.create_table('role_permissions',
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('permission_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    op.create_table('user_roles',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    op.create_table('workflow_transitions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workflow_id', sa.UUID(), nullable=True),
        sa.Column('from_state_id', sa.UUID(), nullable=True),
        sa.Column('to_state_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('required_role_id', sa.UUID(), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['from_state_id'], ['workflow_states.id'], ),
        sa.ForeignKeyConstraint(['required_role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['to_state_id'], ['workflow_states.id'], ),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('sla_policies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('group_id', sa.UUID(), nullable=True),
        sa.Column('ticket_type_id', sa.UUID(), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('response_time_goal', sa.Integer(), nullable=False),
        sa.Column('resolution_time_goal', sa.Integer(), nullable=False),
        sa.Column('business_hours', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['ticket_type_id'], ['ticket_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('endpoints',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hostname', sa.String(length=255), nullable=False),
        sa.Column('group_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('location_nodes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('dependency_code', sa.String(length=50), nullable=True),
        sa.Column('path', sa.Text(), nullable=False),
        sa.Column('parent_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['location_nodes.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dependency_code'),
        sa.UniqueConstraint('path')
    )

    op.create_table('assets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hostname', sa.String(length=255), nullable=False),
        sa.Column('location_node_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['location_node_id'], ['location_nodes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Final Tickets Table
    op.create_table('tickets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='open', nullable=True),
        sa.Column('priority', sa.String(length=50), server_default='medium', nullable=True),
        sa.Column('ticket_type_id', sa.UUID(), nullable=False),
        sa.Column('group_id', sa.UUID(), nullable=True),
        sa.Column('owner_group_id', sa.UUID(), nullable=False),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('assigned_to_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['owner_group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['ticket_type_id'], ['ticket_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('ticket_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('ticket_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    pass
