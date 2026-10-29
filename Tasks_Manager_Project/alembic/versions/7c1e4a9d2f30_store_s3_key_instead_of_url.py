"""store s3 key instead of public url

Revision ID: 7c1e4a9d2f30
Revises: 25bc68f6b557
Create Date: 2026-10-29 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7c1e4a9d2f30'
down_revision: Union[str, None] = '25bc68f6b557'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('tasks', 'file_url', new_column_name='file_key')
    # Old rows stored https://<bucket>.s3.<region>.amazonaws.com/<key>; keep just <key>
    op.execute(
        "UPDATE tasks SET file_key = regexp_replace(file_key, '^https?://[^/]+/', '') "
        "WHERE file_key LIKE 'http%'"
    )


def downgrade() -> None:
    op.alter_column('tasks', 'file_key', new_column_name='file_url')
