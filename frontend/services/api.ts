const API_URL = "http://127.0.0.1:8000";

export async function askTreeAI(question, chatHistory = []) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      chat_history: chatHistory.slice(-6),
    }),
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.status}`);
  }

  return response.json();
}