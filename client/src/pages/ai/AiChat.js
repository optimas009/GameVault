import { useState } from "react";
import AiFetch from "../../services/AiFetch";
import "../../css/AiChat.css";

const AiChat = ({ open, onClose }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to **GameVault** 👋 How can I help you today? Are you looking for a new game to play or have any questions about our catalog?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const updatedMessages = [...messages, { role: "user", content: input }];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await AiFetch(updatedMessages);
      setMessages([...updatedMessages, data.reply]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "⚠️ AI is unavailable right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ai-overlay" onClick={onClose}>
      <div className="ai-popup" onClick={(e) => e.stopPropagation()}>
        <div className="ai-popup-header">
          <h3 className="ai-title">AI Assistant</h3>
          <button className="ai-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ai-chat-box">
          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="ai-msg assistant">Thinking…</div>}
        </div>

        <div className="ai-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something…"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
