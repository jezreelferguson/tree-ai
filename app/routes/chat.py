from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag import ask_health_question

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    """Ask Tree AI a health-related question."""

    # Convert chat history from Pydantic models to plain dicts
    history = [msg.model_dump() for msg in data.chat_history] if data.chat_history else None

    result = ask_health_question(data.question, chat_history=history)

    return result