import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

// Routes
import authRoutes from "./app/routes/auth.routes.js";
import profileRoutes from "./app/routes/profile.routes.js";
import FarmAreaRoutes from "./app/routes/FarmArea.routes.js";
import settingRoutes from "./app/routes/setting.routes.js";
import dataRoutes from "./app/routes/data.routes.js";
import adminRoutes from "./app/routes/admin.routes.js";
import esp32Routes from "./app/routes/esp32.routes.js";

import { mqttClient } from "./app/mqtt/mqtt.js"; 

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.set("trust proxy", true);

/* ---------- Middleware ---------- */
app.use(cors({
  origin: [
    "http://localhost:3001",
    "https://smart-paddy.space",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ---------- Routes ---------- */
authRoutes(app);
profileRoutes(app);
FarmAreaRoutes(app);
settingRoutes(app);
dataRoutes(app);
adminRoutes(app);
esp32Routes(app);

/* ---------- Socket.IO ---------- */
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-device", (deviceId) => {
    socket.join(`device:${deviceId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

/* ---------- Error Middleware ---------- */
app.use((err, req, res, next) => {
  console.error("Express Error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ---------- Server ---------- */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});




// import express from "express";
// import cors from "cors";
// import http from "http";
// import cookieParser from "cookie-parser";

// // Routes
// import authRoutes from "./app/routes/auth.routes.js";
// import profileRoutes from "./app/routes/profile.routes.js";
// import FarmAreaRoutes from "./app/routes/FarmArea.routes.js";
// import settingRoutes from "./app/routes/setting.routes.js";
// import dataRoutes from "./app/routes/data.routes.js";
// import adminRoutes from "./app/routes/admin.routes.js";
// import esp32Routes from "./app/routes/esp32.routes.js";
// import mqttRoutes from "./app/websocket/mqtt.js";

// const app = express();
// const PORT = process.env.PORT || 8000;



// app.set("trust proxy", true);

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       const allowedOrigins = [
//         "http://localhost:3001",
//         "https://smart-paddy.space",
//       ];
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(null, true); 
//     },
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(cookieParser());

// authRoutes(app);
// profileRoutes(app);
// FarmAreaRoutes(app);
// settingRoutes(app);
// dataRoutes(app);
// adminRoutes(app);
// esp32Routes(app);
// mqttRoutes(app);

// app.use((err, req, res, next) => {
//   console.error("Error:", err.message);
//   res.status(500).json({ message: "Server error" });
// });



// server.listen(PORT, "0.0.0.0", () => {
//  console.log(`Server is running on port ${PORT}`);
// });
