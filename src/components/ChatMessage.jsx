function BotAvatar() {
  return (
    <svg
      className="chat-message-profile"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" fill="#0d9488" />
      <path d="M17 10h6v7h7v6h-7v7h-6v-7h-7v-6h7z" fill="white" />
    </svg>
  );
}

function UserAvatar() {
  return (
    <svg
      className="chat-message-profile"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" fill="#ccfbf1" />
      <circle cx="20" cy="16" r="6" fill="#0f766e" />
      <path d="M8 34c1-6 6-9 12-9s11 3 12 9a20 20 0 0 1-24 0z" fill="#0f766e" />
    </svg>
  );
}

function ChatMessage({ message, sender }) {
  return (
    <div
      className={sender === "user" ? "chat-message-user" : "chat-message-robot"}
    >
      {sender === "robot" && <BotAvatar />}
      <div className="chat-message-text" dir="auto">
        {message}
      </div>
      {sender === "user" && <UserAvatar />}
    </div>
  );
}

export default ChatMessage;
