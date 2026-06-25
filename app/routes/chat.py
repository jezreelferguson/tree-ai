from fastapi import APIRouter

from app.schemas.chat import (
    ChatRequest,
    ChatResponse
)

from app.services.rag import ask_health_question

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):

    answer = ask_health_question(data.question)

    return {
        "answer": answer
    }