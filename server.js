import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import authRoutes from "./app/routes/auth.routes.js";
import profileRoutes from "./app/routes/profile.routes.js";
import FarmAreaRoutes from "./app/routes/FarmArea.routes.js";
import settingRoutes from "./app/routes/setting.routes.js";
import dataRoutes from "./app/routes/data.routes.js";
import adminRoutes from "./app/routes/admin.routes.js";
import esp32Routes from "./app/routes/esp32.routes.js";

import connectMQTT, { lastSensorCache, lastStatusCache } from "./app/service/mqtt.js";
import initScheduler from "./app/service/scheduler.js"





const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);


app.use("/uploads", express.static("uploads"));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    // credentials: true,
    // methods: ["GET", "POST"],
  },
});


app.set("trust proxy", true);

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://smart-paddy.space",

  ],
  credentials: true,
}));



app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());


authRoutes(app);
profileRoutes(app);
FarmAreaRoutes(app);
settingRoutes(app);
dataRoutes(app);
adminRoutes(app);
esp32Routes(app);

connectMQTT(app, io);
initScheduler();


// ====== Memory Cache ======
// const lastSensorCache = new Map();
// const lastStatusCache = new Map();

// ====== SOCKET ======
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /* ================= JOIN SINGLE DEVICE ================= */
  socket.on("join-device", (device_code) => {
    try {
      if (!device_code || device_code === "N/A") return;

      device_code = device_code.trim().toUpperCase();

      const roomName = `device:${device_code}`;
      socket.join(roomName);

      console.log(`${socket.id} joined ${roomName}`);

      // ✅ ต้องประกาศก่อนใช้
      const lastSensor = lastSensorCache.get(device_code);
      const lastStatus = lastStatusCache.get(device_code);

      console.log("cached sensor:", lastSensor);
      console.log("cached status:", lastStatus);

      if (lastSensor) {
        socket.emit("sensorData", lastSensor);
      }

      if (lastStatus) {
        socket.emit("deviceStatus", lastStatus);
      }

    } catch (err) {
      console.error("join-device error:", err.message);
    }
  });

  /* ================= JOIN ALL DEVICES ================= */
  socket.on("join-all", () => {
    try {
      socket.join("all-devices");

      console.log(`${socket.id} joined all-devices`);

      for (const [device_code, sensorData] of lastSensorCache.entries()) {

        socket.emit("sensorData", sensorData);

        const statusData = lastStatusCache.get(device_code);
        if (statusData) {
          socket.emit("deviceStatus", statusData);
        }
      }

    } catch (err) {
      console.error("join-all error:", err.message);
    }
  });
  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


app.use((err, req, res, next) => {
  console.error("Express Error:", err);
  res.status(500).json({ message: "Internal server error" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on :" + PORT);
});
