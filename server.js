import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";

// Routes
import authRoutes from "./app/routes/auth.routes.js";
import profileRoutes from "./app/routes/profile.routes.js";
import FarmAreaRoutes from "./app/routes/FarmArea.routes.js";
import settingRoutes from "./app/routes/setting.routes.js";
import dataRoutes from "./app/routes/data.routes.js";
import adminRoutes from "./app/routes/admin.routes.js";
import esp32Routes from "./app/routes/esp32.routes.js";

import { initWebSocket } from "./app/websocket/socketHandler.js";

const app = express();
const PORT = process.env.PORT || 8000;

// ---------- Middleware & Security ----------

app.set("trust proxy", true);

/**
 * ✅ CORS ใช้เฉพาะ HTTP API เท่านั้น
 * ❌ ไม่ใช้ app.use(cors()) แบบ global
 */
const corsOptions = {
  origin: [
    "http://localhost:3001",
    "https://smart-paddy.space",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

// apply CORS เฉพาะ route ที่เป็น API
app.use("/api", cors(corsOptions));

// ---------- Body & Cookie ----------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ---------- Routes ----------
const registerRoutes = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/farm-area", FarmAreaRoutes);
  app.use("/api/setting", settingRoutes);
  app.use("/api/data", dataRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/esp32", esp32Routes);
};

registerRoutes(app);

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    message: "Something went wrong on the server!",
  });
});

// ---------- Server & WebSocket ----------

const server = http.createServer(app);

// ✅ WebSocket ไม่ผ่าน CORS middleware
initWebSocket(server);

server
  .listen(PORT, "0.0.0.0", () => {
    console.log(`
Server is ready!
HTTP API   : http://localhost:${PORT}/api
WebSocket  : ws://localhost:${PORT}
`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error("Server error:", err);
    }
  });
