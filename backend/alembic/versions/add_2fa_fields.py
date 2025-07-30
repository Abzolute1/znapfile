"""Add 2FA fields to users table

Revision ID: add_2fa_fields
Revises: 
Create Date: 2025-01-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_2fa_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add 2FA fields to users table
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('backup_codes', sa.JSON(), nullable=True))


def downgrade():
    # Remove 2FA fields from users table
    op.drop_column('users', 'backup_codes')
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')