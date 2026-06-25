"""
RAG (Retrieval-Augmented Generation) service.
Retrieves relevant WHO health data from Pinecone, then generates an
informed answer using the Groq LLM.
"""

from app.services.llm_service import llm
from app.services.pinecone_service import similarity_search

# ── System prompt ────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are **Tree AI**, a professional AI Health Consultant, Advisor, and Assistant.

Your knowledge is grounded in the **WHO World Health Statistics** and established medical literature.

## Your Capabilities
- Provide evidence-based health education and wellness advice
- Explain medical conditions, symptoms, and risk factors in clear language
- Share global and regional health statistics from WHO data
- Offer lifestyle, nutrition, and preventive health recommendations
- Guide users on when to seek professional medical attention
- Explain medications, treatments, and medical procedures at a general level

## Rules You MUST Follow
1. **Never diagnose.** You are an educational advisor, not a doctor. Always remind users to consult a healthcare professional for diagnosis and treatment.
2. **Cite your sources.** When using the provided WHO data context, reference it (e.g., "According to WHO statistics…").
3. **Be empathetic and supportive.** Health questions can be stressful. Use a warm, reassuring tone.
4. **Be concise but thorough.** Give actionable, well-structured answers. Use bullet points and clear headings when helpful.
5. **Flag emergencies.** If the user describes symptoms of a medical emergency (chest pain, difficulty breathing, stroke symptoms, severe bleeding), immediately advise them to call emergency services.
6. **Stay in scope.** If asked about non-health topics, politely redirect. You are a health-focused assistant only.
7. **Use the provided context.** Always prioritize the WHO data context when answering. If the context doesn't cover the question, use your general knowledge but state that clearly.
"""


def ask_health_question(question: str, chat_history: list[dict] | None = None) -> dict:
    """
    Answer a health question using RAG.

    Returns a dict with:
      - answer: the AI response text
      - sources: list of source snippets used
    """
    # ── 1. Retrieve relevant context from Pinecone ───────────────────
    retrieved_docs = similarity_search(question, k=5)

    context_parts = []
    sources = []
    for doc in retrieved_docs:
        context_parts.append(doc.page_content)
        page = doc.metadata.get("page", "N/A")
        sources.append({
            "text": doc.page_content[:200] + "…" if len(doc.page_content) > 200 else doc.page_content,
            "page": page,
            "source": doc.metadata.get("source", "WHO Health Statistics"),
        })

    context_block = "\n\n---\n\n".join(context_parts) if context_parts else "No specific WHO data available for this query."

    # ── 2. Build conversation messages ───────────────────────────────
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include recent chat history for conversational context
    if chat_history:
        for msg in chat_history[-6:]:  # last 3 exchanges
            messages.append(msg)

    # Build the user message with retrieved context
    user_message = f"""## WHO Data Context (Retrieved)
{context_block}

## User Question
{question}

Provide a helpful, evidence-based answer using the WHO data above where relevant."""

    messages.append({"role": "user", "content": user_message})

    # ── 3. Generate response ─────────────────────────────────────────
    response = llm.invoke(messages)

    return {
        "answer": response.content,
        "sources": sources,
    }