const aiService = require("../services/ai.service");

exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const data = await aiService.chat({ messages });
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "AI chat failed" });
  }
};
