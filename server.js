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

import multer from "multer";
import path from "path";
import fs from "fs";



const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);


app.use("/uploads", express.static("uploads"));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://smart-paddy.space"],
    credentials: true,
    methods: ["GET", "POST"],
  },
});


app.set("trust proxy", true);

app.use(cors({
  origin: ["http://localhost:3000", "https://smart-paddy.space"],
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

io.on("connection", (socket) => {
  socket.on("join-device", (device_code) => {
    socket.join(`device:${device_code}`);

    const lastSensor = lastSensorCache.get(device_code);
    if (lastSensor) {
      socket.emit("sensorData", lastSensor);
    }

    const lastStatus = lastStatusCache.get(device_code);
    if (lastStatus) {
      socket.emit("deviceStatus", lastStatus);
    }
  });

  socket.on("join-all", () => {
    socket.join("all-devices");

    for (const data of lastSensorCache.values()) {
      socket.emit("sensorData", data);
    }

    for (const status of lastStatusCache.values()) {
      socket.emit("deviceStatus", status);
    }
  });
});


app.use((err, req, res, next) => {
  console.error("Express Error:", err);
  res.status(500).json({ message: "Internal server error" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:" + PORT);
});
