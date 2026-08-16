from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI

from app.routers import auth, tasks

app = FastAPI(title="Task Manager API", version="1.0.0")

app.include_router(auth.router)
app.include_router(tasks.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
