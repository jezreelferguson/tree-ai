from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., description="The health question to ask")
    chat_history: list[ChatMessage] = Field(
        default=[],
        description="Previous conversation messages for context",
    )


class SourceInfo(BaseModel):
    text: str
    page: int | str
    source: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceInfo] = []