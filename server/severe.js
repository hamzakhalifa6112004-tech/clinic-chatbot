import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import OpenAI from "openai";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "50kb" }));

app.use(
  "/api/chat",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "طلبات كثيرة، حاول بعد قليل." },
  }),
);

app.use(
  "/api/bookings",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
  }),
);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});
pool.on("error", (err) => console.error("Idle DB client error:", err.message));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `You are the virtual assistant for Al-Noor Clinic.
Your jobs: answer questions about the clinic, and collect appointment requests.

Clinic information:
- Hours: Sat-Thu, 4pm-10pm
- Address: 12 Example Street, Minya
- Phone: 000-000-0000
- Services: General checkup (200 EGP), Follow-up visit (100 EGP)

Rules:
1. Reply in the same language the user writes in.
2. Never diagnose, never suggest medications or doses. For medical questions, say you cannot give medical advice and offer to book a visit.
3. If the user describes an emergency, tell them to call emergency services or go to the nearest hospital immediately.
4. If you don't have the information, say so and give the clinic phone number. Never guess.
5. To book, collect: full name, phone number, preferred day and time, reason for visit. Ask for ONE missing item at a time. When you have all four, show a short summary and ask the user to confirm.
6. After the user confirms the summary, call the create_booking function immediately. Do not write any confirmation text yourself. Never say the appointment is confirmed and never promise a specific time.
7. Write plain text only. Never use markdown: no asterisks, no bold, no headings, no tables.`;

async function saveBooking(booking) {
  const fields = ["full_name", "phone", "preferred_time", "reason"];
  const clean = {};
  for (const f of fields) {
    const value = booking?.[f];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Missing field: ${f}`);
    }
    clean[f] = value.trim().slice(0, 200);
  }

  await pool.query(
    `INSERT INTO bookings (id, full_name, phone, preferred_time, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      clean.full_name,
      clean.phone,
      clean.preferred_time,
      clean.reason,
    ],
  );
}

const tools = [
  {
    type: "function",
    function: {
      name: "create_booking",
      description:
        "Save an appointment request. Call ONLY after the user has confirmed the summary of all four details.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          phone: { type: "string" },
          preferred_time: { type: "string" },
          reason: { type: "string" },
        },
        required: ["full_name", "phone", "preferred_time", "reason"],
      },
    },
  },
];

const BOOKING_REPLY =
  "تم استلام طلب الحجز.\n" +
  "سيتصل بك فريق العيادة لتأكيد الموعد.\n" +
  "الحجز لا يكون مؤكداً إلا بعد مكالمة العيادة.";

app.post("/api/chat", async (req, res) => {
  try {
    const { messages: incoming } = req.body;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res
        .status(400)
        .json({ error: "messages must be a non-empty array" });
    }

    const history = incoming
      .slice(-20)
      .filter(
        (m) =>
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string",
      );

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      tools,
    });
    const msg = completion.choices[0].message;

    if (msg.tool_calls?.length) {
      let bookingSaved = false;

      for (const call of msg.tool_calls) {
        if (call.function.name === "create_booking") {
          try {
            await saveBooking(JSON.parse(call.function.arguments));
            bookingSaved = true;
          } catch (e) {
            console.error("Booking save failed:", e);
          }
        }
      }

      return res.json({
        reply: bookingSaved
          ? BOOKING_REPLY
          : "حدث خطأ أثناء تسجيل الطلب. من فضلك اتصل بالعيادة مباشرة.",
      });
    }

    res.json({
      reply: msg.content || "عذراً، لم أتمكن من الرد. حاول مرة أخرى.",
    });
  } catch (err) {
    console.error(err);
    if (err.status === 429) {
      return res.status(429).json({
        error: "الخدمة مشغولة حالياً، حاول بعد قليل أو اتصل بالعيادة.",
      });
    }
    res.status(500).json({ error: "Something went wrong" });
  }
});

const STATUSES = ["new", "contacted", "confirmed", "cancelled"];

function isAdmin(req) {
  return (
    Boolean(process.env.ADMIN_KEY) &&
    req.get("x-admin-key") === process.env.ADMIN_KEY
  );
}

app.get("/api/bookings", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { rows } = await pool.query(
      `SELECT id, created_at AS "createdAt", status,
              full_name, phone, preferred_time, reason
       FROM bookings
       ORDER BY created_at DESC`,
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch("/api/bookings/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const result = await pool.query(
      "UPDATE bookings SET status = $1 WHERE id = $2",
      [status, req.params.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  app.listen(port, () =>
    console.log(`Server running on http://localhost:${port}`),
  );
}

export default app;
