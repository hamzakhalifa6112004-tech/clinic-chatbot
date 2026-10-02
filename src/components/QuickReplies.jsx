import { CLINIC } from "../clinicInfo";
import "./QuickReplies.css";

const ltr = (text) => `\u2066${text}\u2069`;

const ACTIONS = [
  {
    label: "حجز كشف",
    question: "عايز احجز كشف",
    answer: "تمام، هساعدك في حجز الكشف.\nمن فضلك، ما هو اسمك بالكامل؟",
  },
  {
    label: "ساعات العمل",
    question: "ما هي ساعات العمل؟",
    answer: `مواعيد العيادة: ${CLINIC.hours}.`,
  },
  {
    label: "العنوان",
    question: "فين العيادة؟",
    answer: `العنوان: ${ltr(CLINIC.address)}\nللتواصل: ${ltr(CLINIC.phone)}`,
  },
  {
    label: "الخدمات والأسعار",
    question: "إيه الخدمات والأسعار؟",
    answer: CLINIC.services.map((s) => `• ${s.name}: ${s.price}`).join("\n"),
  },
];

function QuickReplies({ setChatMessage, isLoading }) {
  function handleClick(action) {
    if (isLoading) return;
    setChatMessage((prev) => [
      ...prev,
      { message: action.question, sender: "user", id: crypto.randomUUID() },
      { message: action.answer, sender: "robot", id: crypto.randomUUID() },
    ]);
  }

  return (
    <div className="quick-replies">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          className="quick-reply-btn"
          onClick={() => handleClick(action)}
          disabled={isLoading}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default QuickReplies;
