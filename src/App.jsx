import React from "react";
import "./App.css";
import Admin from "./components/Admin";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import QuickReplies from "./components/QuickReplies";

function ChatApp() {
  const [chatMessages, setChatMessage] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="clinic-logo">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="white"
            aria-hidden="true"
          >
            <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
          </svg>
        </div>
        <div>
          <h1>عيادة النور</h1>
          <p>المساعد الافتراضي</p>
        </div>
      </header>

      <div className="emergency-bar" role="note">
        للحالات الطارئة اتصل بالإسعاف 123 أو توجه لأقرب مستشفى فوراً
      </div>

      <QuickReplies setChatMessage={setChatMessage} isLoading={isLoading} />

      {chatMessages.length === 0 && (
        <p className="welcome-message">
          أهلاً بك في عيادة النور. اختر من الأعلى أو اكتب رسالتك.
        </p>
      )}

      <ChatMessages chatMessages={chatMessages} />
      <ChatInput
        chatMessages={chatMessages}
        setChatMessage={setChatMessage}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  );
}

function App() {
  return window.location.pathname === "/admin" ? <Admin /> : <ChatApp />;
}

export default App;
