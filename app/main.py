from fastapi import FastAPI

from app.routes.chat import router

app = FastAPI(
    title="Tree AI Health Advisor"
)

app.include_router(
    router,
    prefix="/api"
)

@app.get("/")
def root():
    return {
        "message": "Tree AI Server Running"
    }