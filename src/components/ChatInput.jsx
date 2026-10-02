import React from "react";
import LodingIcon from "../assets/loading-spinner.gif";
import "./ChatInput.css";

function ChatInput({ chatMessages, setChatMessage, isLoading, setIsLoading }) {
  const [inputText, setInputText] = React.useState("");

  function saveInputText(event) {
    setInputText(event.target.value);
  }

  async function sendMessage() {
    if (isLoading || inputText.trim() === "") return;

    setIsLoading(true);
    setInputText("");

    const newChatMessages = [
      ...chatMessages,
      {
        message: inputText,
        sender: "user",
        id: crypto.randomUUID(),
      },
    ];

    setChatMessage([
      ...newChatMessages,
      {
        message: <img className="loading-img" src={LodingIcon} />,
        sender: "robot",
        id: crypto.randomUUID(),
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newChatMessages.map(({ message, sender }) => ({
            role: sender === "robot" ? "assistant" : "user",
            content: message,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر الحصول على رد من الخادم.");
      }

      setChatMessage([
        ...newChatMessages,
        {
          message: data.reply,
          sender: "robot",
          id: crypto.randomUUID(),
        },
      ]);
    } catch (error) {
      setChatMessage([
        ...newChatMessages,
        {
          message: error.message || "تعذر الاتصال بالخادم. حاول مرة أخرى.",
          sender: "robot",
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      sendMessage();
    } else if (event.key === "Escape") {
      setInputText("");
    }
  }

  return (
    <div className="chat-input-container">
      <input
        placeholder="اكتب رسالتك هنا..."
        size="30"
        onChange={saveInputText}
        onKeyDown={handleKeyDown}
        value={inputText}
        className="chat-input"
        dir="auto"
      />
      <button
        className="send-button"
        onClick={sendMessage}
        disabled={isLoading}
      >
        إرسال
      </button>
    </div>
  );
}

export default ChatInput;
