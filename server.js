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

// import { initWebSocket } from "./app/websocket/socketHandler.js";

// const app = express();
// const PORT = process.env.PORT || 8000; // ใช้ Environment Variable ถ้ามี

// // ---------- Middleware & Security ----------

// app.set("trust proxy", true);

// app.use(cors({

//   origin: (origin, callback) => {
//   const allowedOrigins = [
//     "http://localhost:3001", 
//     "https://smart-paddy.space",
//   ];
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }

//     return callback(new Error("Not allowed by CORS"));
// },
//   methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
//   allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
//   credentials: true,
// }));

// // ปรับขนาดการรับข้อมูล (Payload) ป้องกันการโจมตีแบบ DOS
// app.use(express.json({ limit: "10mb" })); 
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(cookieParser());


// const registerRoutes = (app) => {
//   authRoutes(app);
//   profileRoutes(app);
//   FarmAreaRoutes(app);
//   settingRoutes(app);
//   dataRoutes(app);
//   adminRoutes(app);
//   esp32Routes(app);
// };

// registerRoutes(app);

// // Global Error Handler สำหรับ HTTP
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send({ message: "Something went wrong on the server!" });
// });

// // ---------- Server & WebSocket ----------

// // สร้าง HTTP Server
// const server = http.createServer(app);

// // เริ่ม WebSocket บน server เดียวกัน
// initWebSocket(server);

// // เริ่ม server ด้วย Error Handling
// server.listen(PORT, "0.0.0.0", () => {
//   console.log(`
//   Server is ready!
//   HTTP Server: http://localhost:${PORT}
//   WebSocket:  ws://localhost:${PORT}
//   `);
// }).on('error', (err) => {
//   if (err.code === 'EADDRINUSE') {
//     console.error(`Port ${PORT} is already in use.`);
//   } else {
//     console.error(`Server error:`, err);
//   }
// });





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

// ---------- Middleware ----------

app.set("trust proxy", true);

// CORS (รองรับ browser + ไม่พัง ESP32 + ไม่พัง WS)
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3001",
        "https://smart-paddy.space",
      ];

      // ไม่มี origin = ESP32 / Postman / Server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true); 
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ---------- Routes (ใช้ pattern เดิมของคุณ) ----------
authRoutes(app);
profileRoutes(app);
FarmAreaRoutes(app);
settingRoutes(app);
dataRoutes(app);
adminRoutes(app);
esp32Routes(app);

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ message: "Server error" });
});

// ---------- Server ----------
const server = http.createServer(app);

initWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
Server ready
HTTP : http://localhost:${PORT}
WS   : ws://localhost:${PORT}
`);
});
