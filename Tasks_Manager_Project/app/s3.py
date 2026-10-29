import os
import re
import uuid
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import HTTPException, UploadFile, status

S3_BUCKET = os.getenv("S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
DOWNLOAD_URL_EXPIRE_SECONDS = int(os.getenv("DOWNLOAD_URL_EXPIRE_SECONDS", "3600"))

# Credentials come from boto3's default chain (the EC2 instance role in production).
# Regional endpoint so signed URLs don't redirect for buckets outside us-east-1.
_s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)


def _safe_filename(filename: Optional[str]) -> str:
    name = os.path.basename(filename or "file")
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return name[-100:] or "file"


def _file_size(file: UploadFile) -> int:
    if file.size is not None:
        return file.size
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    return size


def upload_file_to_s3(file: UploadFile, key_prefix: str) -> str:
    """Upload the file and return its S3 object key (not a URL)."""
    if not S3_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="S3_BUCKET is not configured; set it in the environment to enable uploads",
        )

    if _file_size(file) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    key = f"{key_prefix}/{uuid.uuid4()}-{_safe_filename(file.filename)}"
    _s3_client.upload_fileobj(
        file.file,
        S3_BUCKET,
        key,
        ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
    )
    return key


def generate_download_url(key: Optional[str]) -> Optional[str]:
    """Return a short-lived signed URL so the bucket can stay private."""
    if not key or not S3_BUCKET:
        return None
    return _s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=DOWNLOAD_URL_EXPIRE_SECONDS,
    )
