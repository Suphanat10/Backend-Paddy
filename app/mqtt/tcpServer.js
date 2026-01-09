// import net from "net";
// import { saveSensorData } from "./saveSensorData.js";
// import { checkAlerts } from "./checkAlerts.js";
// import { setupCaptureSchedule } from "./takePhoto.js";
// import { prisma } from "../../lib/prisma.js";

// const clients = new Map(); // device_code => socket

// export function startTCPServer(io) {
//   const server = net.createServer((socket) => {
//     console.log("ESP32 connected:", socket.remoteAddress);

//     socket._buffer = ""; // buffer สำหรับ TCP

//     socket.on("data", async (raw) => {
//       socket._buffer += raw.toString();

//       let index;
//       while ((index = socket._buffer.indexOf("\n")) >= 0) {
//         const line = socket._buffer.substring(0, index).trim();
//         socket._buffer = socket._buffer.substring(index + 1);

//         if (!line) continue;

//         try {
//           const payload = JSON.parse(line);
//           await handlePayload(payload, socket, io);
//         } catch (e) {
//           console.error("TCP JSON parse error:", e.message, "| LINE:", line);
//         }
//       }
//     });

//     socket.on("close", () => {
//       console.log("ESP32 Disconnected");
//       for (const [d, s] of clients.entries()) {
//         if (s === socket) clients.delete(d);
//       }
//     });

//     socket.on("error", (err) => {
//       console.error("TCP Socket error:", err.message);
//     });
//   });

//   server.listen(5000, () => {
//     console.log("TCP Server running on port 5000");
//   });

//   // ส่ง command JSON กลับ ESP
//   function sendCommand(device_code, obj) {
//     const socket = clients.get(device_code);
//     if (!socket) {
//       console.log(`No socket found for ${device_code}`);
//       return false;
//     }
//     const msg = JSON.stringify(obj);
//     socket.write(msg + "\n");
//     console.log(`Sent to ${device_code}:`, msg);
//     return true;
//   }

//   // Export commands ให้ backend ใช้
//   return {
//     sendDeviceCommand_disconnect(device_code) {
//       return sendCommand(device_code, {
//         device_id: device_code,
//         type: "disconnect",
//       });
//     },

//     sendDeviceCommand_PUMP_OFF_ON(mac_address, cmd) {
//       return sendCommand(mac_address, {
//         type: cmd === "ON" ? "pump_on" : "pump_off",
//         pump: mac_address,
//       });
//     },

//     sendDeviceCommand_takePhoto(device_code) {
//       return sendCommand(device_code, {
//         device_id: device_code,
//         type: "takePhoto",
//       });
//     },
//   };
// }

// /* ====================================================
//    HANDLE PAYLOAD
// ==================================================== */
// async function handlePayload(payload, socket, io) {
//   const device_code = payload.device_id;
//   if (!device_code) return;

//   // Register client
//   if (!clients.has(device_code)) {
//     clients.set(device_code, socket);
//     console.log(`📡 Register ESP device: ${device_code}`);
//   }

//   /* ============ SENSOR DATA ============ */
//   if (payload.type === "sensor") {
//     const sensor = payload.data;

//     const sensorData = {
//       device_code,
//       measured_at: new Date()
//         .toISOString()
//         .substring(0, 16)
//         .replace("T", " "),
//       data: {
//         N: sensor.N?.val,
//         P: sensor.P?.val,
//         K: sensor.K?.val,
//         water_level: sensor.W?.val,
//         soil_moisture: sensor.S?.val,
//       },
//     };

//     io.to("all-devices").emit("sensorData", sensorData);
//     io.to(`device:${device_code}`).emit("sensorData", sensorData);

//     await saveSensorData(sensor, device_code);

//     await checkAlerts(sensor, device_code, (dc, cmdObj) => {
//       sendCommand(dc, cmdObj);
//     });

//     console.log(`Sensor saved from ${device_code}`);
//   }

//   /* ============ STATUS UPDATE ============ */
//   if (payload.type === "status") {
//     io.to(`device:${device_code}`).emit("deviceStatus", {
//       device_code,
//       status: payload.status,
//     });

//     io.to("all-devices").emit("deviceStatus", {
//       device_code,
//       status: payload.status,
//     });

//     console.log(`Status update from ${device_code}: ${payload.status}`);
//   }
// }


import net from "net";
import { saveSensorData } from "./saveSensorData.js";
import { checkAlerts } from "./checkAlerts.js";
import { prisma } from "../../lib/prisma.js";

/* ================= CONFIG ================= */
const PORT = 5000;
const GSM_TIMEOUT = 10 * 60 * 1000;     // 10 นาที
const HEARTBEAT_INTERVAL = 60 * 1000;   // 1 นาที
const MAX_BUFFER = 8192;

/* ================= CLIENT MAP ================= */
const clients = new Map(); // device_code => socket

/* ================= SAFE CLOSE ================= */
function safeClose(socket, reason = "") {
  if (!socket || socket._closing) return;

  socket._closing = true;
  console.log("🔌 Closing socket", socket.device_code || "", reason);

  try {
    socket.end();
  } catch {}

  setTimeout(() => {
    if (!socket.destroyed) socket.destroy();
  }, 5000);
}

/* ====================================================
   START TCP SERVER
==================================================== */
export function startTCPServer(io) {
  const server = net.createServer((socket) => {
    console.log("🔌 ESP32 connected:", socket.remoteAddress);

    socket.setKeepAlive(true, 15000);
    socket.setNoDelay(true);

    socket._buffer = "";
    socket.lastSeen = Date.now();
    socket.device_code = null;
    socket._closing = false;

    /* ================= DATA ================= */
    socket.on("data", async (raw) => {
      socket.lastSeen = Date.now();
      socket._buffer += raw.toString();

      if (socket._buffer.length > MAX_BUFFER) {
        console.log("🚨 TCP buffer overflow");
        safeClose(socket, "buffer overflow");
        return;
      }

      let index;
      while ((index = socket._buffer.indexOf("\n")) >= 0) {
        const line = socket._buffer.slice(0, index).trim();
        socket._buffer = socket._buffer.slice(index + 1);

        if (!line) continue;

        try {
          const payload = JSON.parse(line);
          await handlePayload(payload, socket, io);
        } catch (e) {
          console.error("❌ JSON parse error:", e.message);
        }
      }
    });

    /* ================= CLOSE ================= */
    socket.on("close", () => {
      if (
        socket.device_code &&
        clients.get(socket.device_code) === socket
      ) {
        clients.delete(socket.device_code);
      }

      console.log("❌ ESP32 disconnected", socket.device_code || "");
    });

    socket.on("error", (err) => {
      console.error("⚠ TCP Socket error:", err.message);
      safeClose(socket, "socket error");
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 TCP Server running on port ${PORT}`);
  });

  return {
    sendDeviceCommand_disconnect(device_code) {
      return sendCommand(device_code, {
        type: "disconnect",
        device_id: device_code,
      });
    },

    sendDeviceCommand_PUMP_OFF_ON(device_code, cmd) {
      return sendCommand(device_code, {
        type: cmd === "ON" ? "pump_on" : "pump_off",
        device_id: device_code,
      });
    },

    sendDeviceCommand_takePhoto(device_code) {
      return sendCommand(device_code, {
        type: "takePhoto",
        device_id: device_code,
      });
    },
  };
}

/* ================= SEND COMMAND ================= */
function sendCommand(device_code, obj) {
  const socket = clients.get(device_code);
  if (!socket || socket.destroyed) {
    console.log(`⚠ No active socket for ${device_code}`);
    return false;
  }

  try {
    socket.write(JSON.stringify(obj) + "\n");
    return true;
  } catch {
    safeClose(socket, "send error");
    clients.delete(device_code);
    return false;
  }
}

/* ====================================================
   HANDLE PAYLOAD
==================================================== */
async function handlePayload(payload, socket, io) {
  const device_code = payload.device_id;
  if (!device_code) return;

  socket.lastSeen = Date.now();

  /* ===== REGISTER ===== */
  if (payload.type === "register") {
    if (socket.device_code === device_code) return;

    socket.device_code = device_code;

    if (clients.has(device_code)) {
      const oldSocket = clients.get(device_code);
      if (oldSocket !== socket) {
        console.log(`♻ Replace old connection: ${device_code}`);
        safeClose(oldSocket, "replace");
      }
    }

    clients.set(device_code, socket);
    console.log(`📡 Registered ESP: ${device_code}`);
    return;
  }

  /* ===== IGNORE BEFORE REGISTER ===== */
  if (!socket.device_code) return;

  /* ===== HEARTBEAT ===== */
  if (payload.type === "ping" || payload.type === "pong") {
    return;
  }

  /* ===== SENSOR DATA ===== */
  if (payload.type === "sensor") {
    const sensor = payload.data;

    const sensorData = {
      device_code,
      measured_at: new Date()
        .toISOString()
        .substring(0, 16)
        .replace("T", " "),
      data: {
        N: sensor.N?.val,
        P: sensor.P?.val,
        K: sensor.K?.val,
        water_level: sensor.W?.val,
        soil_moisture: sensor.S?.val,
      },
    };

    io.to("all-devices").emit("sensorData", sensorData);
    io.to(`device:${device_code}`).emit("sensorData", sensorData);

    try {
      await saveSensorData(sensor, device_code);
    } catch (e) {
      console.error("DB save error:", e.message);
    }

    try {
      await checkAlerts(sensor, device_code, (dc, cmdObj) => {
        const s = clients.get(dc);
        if (s && !s.destroyed) {
          s.write(JSON.stringify(cmdObj) + "\n");
        }
      });
    } catch (e) {
      console.error("Alert error:", e.message);
    }

    console.log(`✅ Sensor saved from ${device_code}`);
  }

  /* ===== STATUS ===== */
  if (payload.type === "status") {
    io.to(`device:${device_code}`).emit("deviceStatus", payload);
    io.to("all-devices").emit("deviceStatus", payload);
  }
}

/* ====================================================
   SERVER HEARTBEAT
==================================================== */
setInterval(() => {
  for (const [device, socket] of clients.entries()) {
    if (!socket || socket.destroyed) continue;

    try {
      socket.write(JSON.stringify({ type: "ping" }) + "\n");
    } catch {
      safeClose(socket, "heartbeat error");
      clients.delete(device);
    }
  }
}, HEARTBEAT_INTERVAL);

/* ====================================================
   GSM TIMEOUT CHECK
==================================================== */
setInterval(() => {
  const now = Date.now();

  for (const [device, socket] of clients.entries()) {
    if (now - socket.lastSeen > GSM_TIMEOUT) {
      console.log(`⏱ GSM timeout → close ${device}`);
      safeClose(socket, "gsm timeout");
      clients.delete(device);
    }
  }
}, 60000);