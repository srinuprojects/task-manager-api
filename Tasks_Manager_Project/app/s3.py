import os
import uuid

import boto3
from fastapi import HTTPException, UploadFile, status

S3_BUCKET = os.getenv("S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

_s3_client = boto3.client("s3", region_name=AWS_REGION)


def upload_file_to_s3(file: UploadFile, key_prefix: str) -> str:
    if not S3_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="S3_BUCKET is not configured; set it in the environment to enable uploads",
        )

    key = f"{key_prefix}/{uuid.uuid4()}-{file.filename}"
    _s3_client.upload_fileobj(file.file, S3_BUCKET, key)
    return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}"
