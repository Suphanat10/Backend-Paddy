import net from "net";
import { saveSensorData } from "./saveSensorData.js";
import { checkAlerts } from "./checkAlerts.js";
import { setupCaptureSchedule } from "./takePhoto.js";
import { prisma } from "../../lib/prisma.js";

const clients = new Map(); // device_code => socket

export function startTCPServer(io) {
  const server = net.createServer((socket) => {
    console.log("ESP32 connected:", socket.remoteAddress);

    socket._buffer = ""; // buffer สำหรับ TCP

    socket.on("data", async (raw) => {
      socket._buffer += raw.toString();

      let index;
      while ((index = socket._buffer.indexOf("\n")) >= 0) {
        const line = socket._buffer.substring(0, index).trim();
        socket._buffer = socket._buffer.substring(index + 1);

        if (!line) continue;

        try {
          const payload = JSON.parse(line);
          await handlePayload(payload, socket, io);
        } catch (e) {
          console.error("TCP JSON parse error:", e.message, "| LINE:", line);
        }
      }
    });

    socket.on("close", () => {
      console.log("ESP32 Disconnected");
      for (const [d, s] of clients.entries()) {
        if (s === socket) clients.delete(d);
      }
    });

    socket.on("error", (err) => {
      console.error("TCP Socket error:", err.message);
    });
  });

  server.listen(5000, () => {
    console.log("TCP Server running on port 5000");
  });

  // ส่ง command JSON กลับ ESP
  function sendCommand(device_code, obj) {
    const socket = clients.get(device_code);
    if (!socket) {
      console.log(`No socket found for ${device_code}`);
      return false;
    }
    const msg = JSON.stringify(obj);
    socket.write(msg + "\n");
    console.log(`Sent to ${device_code}:`, msg);
    return true;
  }

  // Export commands ให้ backend ใช้
  return {
    sendDeviceCommand_disconnect(device_code) {
      return sendCommand(device_code, {
        device_id: device_code,
        type: "disconnect",
      });
    },

    sendDeviceCommand_PUMP_OFF_ON(mac_address, cmd) {
      return sendCommand(mac_address, {
        type: cmd === "ON" ? "pump_on" : "pump_off",
        pump: mac_address,
      });
    },

    sendDeviceCommand_takePhoto(device_code) {
      return sendCommand(device_code, {
        device_id: device_code,
        type: "takePhoto",
      });
    },
  };
}

/* ====================================================
   HANDLE PAYLOAD
==================================================== */
async function handlePayload(payload, socket, io) {
  const device_code = payload.device_id;
  if (!device_code) return;

  // Register client
  if (!clients.has(device_code)) {
    clients.set(device_code, socket);
    console.log(`📡 Register ESP device: ${device_code}`);
  }

  /* ============ SENSOR DATA ============ */
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

    await saveSensorData(sensor, device_code);

    await checkAlerts(sensor, device_code, (dc, cmdObj) => {
      sendCommand(dc, cmdObj);
    });

    console.log(`Sensor saved from ${device_code}`);
  }

  /* ============ STATUS UPDATE ============ */
  if (payload.type === "status") {
    io.to(`device:${device_code}`).emit("deviceStatus", {
      device_code,
      status: payload.status,
    });

    io.to("all-devices").emit("deviceStatus", {
      device_code,
      status: payload.status,
    });

    console.log(`Status update from ${device_code}: ${payload.status}`);
  }
}
