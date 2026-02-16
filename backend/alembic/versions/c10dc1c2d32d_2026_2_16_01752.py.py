"""Add is_folder to WikiPage

Revision ID: c10dc1c2d32d
Revises: 2b9c754b4dfc
Create Date: 2026-02-16 00:17:52

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c10dc1c2d32d'
down_revision: Union[str, None] = '2b9c754b4dfc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('wiki_pages', sa.Column('is_folder', sa.Boolean(), nullable=True))
    op.execute("UPDATE wiki_pages SET is_folder = false")
    op.alter_column('wiki_pages', 'is_folder', nullable=False, server_default=sa.text('false'))

def downgrade() -> None:
    op.drop_column('wiki_pages', 'is_folder')
