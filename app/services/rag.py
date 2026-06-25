from app.services.llm_service import llm

def ask_health_question(question: str):

    prompt = f"""
    You are a health education assistant.

    User Question:
    {question}

    Give educational information only.
    Do not diagnose diseases.
    """

    response = llm.invoke(prompt)

    return response.content