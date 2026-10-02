import React from "react";
import "./Admin.css";

const STATUS_LABELS = {
  new: "جديد",
  contacted: "تم التواصل",
  confirmed: "مؤكد",
  cancelled: "ملغي",
};

function Admin() {
  const [key, setKey] = React.useState("");
  const [bookings, setBookings] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function load(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) throw new Error("كلمة السر غير صحيحة.");
      if (!res.ok) throw new Error("تعذر تحميل الحجوزات.");
      const data = await res.json();
      setBookings(data.bookings);
    } catch (err) {
      setBookings(null);
      setError(err.message || "تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    setError("");
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("تعذر تحديث الحالة.");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      );
    } catch (err) {
      setError(err.message || "تعذر الاتصال بالخادم.");
    }
  }

  if (bookings === null) {
    return (
      <div className="admin-page">
        <form className="admin-login" onSubmit={load}>
          <h1>لوحة الحجوزات</h1>
          <p>أدخل كلمة السر للدخول</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="كلمة السر"
            className="admin-input"
          />
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-btn" disabled={loading || !key}>
            {loading ? "جاري التحميل..." : "دخول"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-top">
          <h1>طلبات الحجز ({bookings.length})</h1>
          <button className="admin-btn" onClick={load} disabled={loading}>
            {loading ? "..." : "تحديث"}
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        {bookings.length === 0 && (
          <p className="admin-empty">لا توجد طلبات حجز حتى الآن.</p>
        )}

        {bookings.map((b) => (
          <div className="booking-card" key={b.id}>
            <div className="booking-name">{b.full_name}</div>

            <div className="booking-status-row">
              <span className={`status-badge status-${b.status || "new"}`}>
                {STATUS_LABELS[b.status || "new"]}
              </span>
              <select
                className="status-select"
                value={b.status || "new"}
                onChange={(e) => setStatus(b.id, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="booking-row">
              <span>الهاتف</span>
              <a href={`tel:${b.phone}`} dir="ltr">
                {b.phone}
              </a>
            </div>
            <div className="booking-row">
              <span>الموعد المطلوب</span>
              <strong>{b.preferred_time}</strong>
            </div>
            <div className="booking-row">
              <span>سبب الزيارة</span>
              <strong>{b.reason}</strong>
            </div>
            <div className="booking-time">
              وصل في{" "}
              {new Date(b.createdAt).toLocaleString("ar-EG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;