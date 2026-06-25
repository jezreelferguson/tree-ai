from app.services.llm_service import llm

def ask_health_question(question: str):
    # CDC = "https://www.cdc.gov/health-topics.html"
    # WHO = "https://www.who.int/"
    prompt = f"""
    You are a health education assistant.

    User Question:
    {question}

    Give educational information only.
    Do not diagnose diseases.
    
    Your response should be accurate or precise and short. But make sure is very useful for the user
    """

    response = llm.invoke(prompt)

    return response.content