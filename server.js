import express from "express";
import cors from "cors";
import http from "http";

import authRoutes from "./app/routes/auth.routes.js";
import profileRoutes from "./app/routes/profile.routes.js";
import FarmAreaRoutes from "./app/routes/FarmArea.routes.js";
import settingRoutes from "./app/routes/setting.routes.js";
import dataRoutes from "./app/routes/data.routes.js";
import adminRoutes from "./app/routes/admin.routes.js";
import esp32Routes from "./app/routes/esp32.routes.js";
import cookieParser from "cookie-parser";



import { initWebSocket } from "./app/websocket/socketHandler.js";

const app = express();
const PORT = 8000;


app.set("trust proxy", true);
app.use(cors({
  origin: "https://smart-paddy.space",
  methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

authRoutes(app);
profileRoutes(app);
FarmAreaRoutes(app);
settingRoutes(app);
dataRoutes(app);
adminRoutes(app);
esp32Routes(app);

// ---------- สร้าง HTTP Server แค่ครั้งเดียว ----------
const server = http.createServer(app);

// ---------- เริ่ม WebSocket บน server เดียว ----------
initWebSocket(server);

// ---------- เริ่ม server ----------
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP + WebSocket Server running on port ${PORT}`);
});
