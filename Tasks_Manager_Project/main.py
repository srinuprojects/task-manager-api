import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI

from app.routers import auth, tasks

# In production Caddy serves the API under /api and strips the prefix;
# ROOT_PATH tells FastAPI so the /docs page links resolve correctly.
app = FastAPI(title="Task Manager API", version="1.0.0", root_path=os.getenv("ROOT_PATH", ""))

app.include_router(auth.router)
app.include_router(tasks.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
