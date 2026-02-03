import AuthFetch from "./AuthFetch";

const AI_BASE_URL = "/ai/chat";

const AiFetch = async (messages) => {
  const response = await AuthFetch(AI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),

    // AI is public
    skip401Handler: true,
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  return response.json();
};

export default AiFetch;
