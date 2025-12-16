import { WebSocketServer } from 'ws';
import { prisma } from "../../lib/prisma.js";

let wss;

// เก็บ Client ของ ESP32 และ Dashboard
const esp32Clients = new Map();       // { deviceId → ws }
const dashboardClients = new Map();   // { deviceId → Set(ws) }

// เวลา timeout (ms) ถ้า ESP32 ไม่ส่งข้อมูล → ถือว่า offline
const DEVICE_TIMEOUT = 15000;

// ===================================================
//  ฟังก์ชันส่งสถานะ ONLINE/OFFLINE ไปยัง Dashboard
// ===================================================
const broadcastStatus = (deviceId, status) => {
  const payload = {
    type: "DEVICE_STATUS",
    deviceId,
    status,
    lastSeen: Date.now(),
  };

  if (dashboardClients.has(deviceId)) {
    dashboardClients.get(deviceId).forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(payload));
      }
    });
  }

};


export const saveSensorData = async (deviceId, data) => {

  if (!deviceId || !data) {
    console.log("Invalid saveSensorData payload");
    return;
  }

  try {
    // 1. หา Device
    const device = await prisma.Device.findUnique({
      where: { device_code: deviceId },
    });
    if (!device) return console.log(`Device not found: ${deviceId}`);

    // 2. หา Registration
    const reg = await prisma.Register.findUnique({
      where: { device_id: device.device_id },
    });
    if (!reg) return console.log(`Device not registered: ${deviceId}`);

    // 3. หา User Settings (เพื่อเอา interval)
    const user_Settings = await prisma.User_Settings.findUnique({
      where: { device_registrations_ID: reg.device_registrations_ID },
    });

    if (!user_Settings) return console.log("User settings not found");

    // =========================================================
    // 🔥 ส่วนที่เขียนต่อ: ตรวจสอบเวลาและการบันทึกข้อมูล
    // =========================================================

    // 4. แปลง Interval จาก "วัน" เป็น "มิลลิวินาที"
    // สมมติใน DB เก็บเป็น String หรือ Int (เช่น "1" วัน, "0.04" วัน)
    const intervalDays = parseFloat(user_Settings.data_send_interval_days || "0");
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    // 5. ดึงข้อมูลล่าสุดที่เคยบันทึกไว้ของ Device นี้
    // (สมมติชื่อ Table คือ Sensor_Logs ให้แก้ตาม schema.prisma ของคุณ)
    const lastLog = await prisma.Sensor_Logs.findFirst({
      where: {
        device_registrations_ID: reg.device_registrations_ID
      },
      orderBy: {
        measured_at: 'desc' 
      }
    });

    const now = new Date();

    // 6. เช็คเงื่อนไขเวลา: ถ้ามี Log เก่า และ เวลายังไม่ถึงกำหนด -> ไม่บันทึก
    if (lastLog && intervalMs > 0) {
      const lastTime = new Date(lastLog.measured_at).getTime();
      const nextSaveTime = lastTime + intervalMs;

      if (now.getTime() < nextSaveTime) {
        console.log(`⏳ Skip Save: รอเวลาถัดไป ${new Date(nextSaveTime).toLocaleTimeString()}`);
        return; // ❌ จบฟังก์ชัน ไม่บันทึก
      }
    }

    // 7. บันทึกข้อมูลลง Database
    // (ปรับ field ให้ตรงกับ Prisma Schema ของคุณ)
    await prisma.Sensor_Logs.create({
      data: {
        device_registrations_ID: reg.device_registrations_ID,
        
        // ข้อมูลเซนเซอร์
        nitrogen: parseFloat(data.N || 0),
        phosphorus: parseFloat(data.P || 0),
        potassium: parseFloat(data.K || 0),
        water_level: parseFloat(data.water_level || 0),
        soil_moisture: parseFloat(data.soil_moisture || 0),
        battery: parseFloat(data.battery || 0),
        
        // เวลาที่บันทึก
        measured_at: now,
      },
    });

    console.log(`✅ Database Saved: ${deviceId} at ${now.toLocaleTimeString()}`);

  } catch (error) {
    console.error("Save Sensor Data Error:", error);
  }
}



// ===================================================
//          INITIALIZE WEBSOCKET SERVER
// ===================================================
export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });

  console.log("🚀 WebSocket Server Started");

  function heartbeat() { this.isAlive = true; }

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.subscribedDevices = [];
    ws.receiveSensors = true; 

    ws.on("pong", heartbeat);

    console.log("🟢 New WebSocket Connection");

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw);

        // ===========================================
        // 📌 0) Dashboard → SUBSCRIBE_STATUS (สถานะอย่างเดียว)
        // ===========================================
        if (data.action === "SUBSCRIBE_STATUS") {

          const deviceList = data.deviceIds || [];

          if (!Array.isArray(deviceList)) return;

          console.log("📌 Dashboard SUBSCRIBE_STATUS →", deviceList);

          ws.subscribedDevices = deviceList;
          ws.receiveSensors = false; // ❌ ไม่รับ SENSOR_UPDATE

          deviceList.forEach(id => {
            if (!dashboardClients.has(id)) {
              dashboardClients.set(id, new Set());
            }
            dashboardClients.get(id).add(ws);

            // ส่งสถานะล่าสุดทันที
            if (esp32Clients.has(id)) {
              broadcastStatus(id, "online");
            } else {
              broadcastStatus(id, "offline");
            }
          });

          return;
        }

        // ===========================================
        // 📌 1) Dashboard → SUBSCRIBE (เต็มรูปแบบ)
        // ===========================================
        if (data.action === "SUBSCRIBE") {
          const deviceList =
            data.deviceIds ||
            data.device_ids ||
            data.device_id ||
            [];

          if (!Array.isArray(deviceList)) {
            console.log("❌ Invalid SUBSCRIBE payload:", data);
            return;
          }

          console.log("📌 Dashboard SUBSCRIBE →", deviceList);

          ws.subscribedDevices = deviceList;
          ws.receiveSensors = true;

          deviceList.forEach(id => {
            if (!dashboardClients.has(id)) {
              dashboardClients.set(id, new Set());
            }
            dashboardClients.get(id).add(ws);

            // ส่งสถานะล่าสุด
            if (esp32Clients.has(id)) {
              broadcastStatus(id, "online");
            } else {
              broadcastStatus(id, "offline");
            }
          });

          return;
        }

        // ===========================================
        // 📌 2) ESP32 → SENSOR_UPDATE
        // ===========================================
        if (data.device_id && data.data) {
          const deviceId = data.device_id;

          esp32Clients.set(deviceId, ws);

          ws.deviceId = deviceId;
          ws.lastUpdate = Date.now();

          broadcastStatus(deviceId, "online");

          const payload = {
            type: "SENSOR_UPDATE",
            deviceId,
            npk: {
              N: data.data.N,
              P: data.data.P,
              K: data.data.K,
            },
            water_level: data.data.water_level,
            soil_moisture: data.data.soil_moisture,
            battery: data.data.battery,
            config: data.config,
            timestamp: data.timestamp,
          };

          // ส่งเฉพาะ Dashboard ที่ต้องการ sensor
          if (dashboardClients.has(deviceId)) {
            dashboardClients.get(deviceId).forEach(client => {
              if (client.readyState === 1 && client.receiveSensors !== false) {
                client.send(JSON.stringify(payload));
              }
            });
          }

          return;
        }

      } catch (err) {
        console.error("❌ WS JSON Error:", err);
      }
    });

    // ===========================================
    // 🔌 Client Disconnect
    // ===========================================
    ws.on("close", () => {
      console.log("🔻 Client Disconnected");

      // ถอด ESP32
      if (ws.deviceId && esp32Clients.get(ws.deviceId) === ws) {
        esp32Clients.delete(ws.deviceId);
        broadcastStatus(ws.deviceId, "offline");
      }

      // ถอด Dashboard
      ws.subscribedDevices.forEach(id => {
        if (dashboardClients.has(id)) {
          dashboardClients.get(id).delete(ws);
          if (dashboardClients.get(id).size === 0) {
            dashboardClients.delete(id);
          }
        }
      });
    });
  });

  // =============================================================
  // 🔥 HEARTBEAT (ปิด connection ที่ค้าง + ตรวจจับ OFFLINE)
  // =============================================================
  const interval = setInterval(() => {

    // 1) ตรวจ WebSocket ว่ายัง alive ไหม
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        console.log("⚠️ Dead WS → terminate");
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });

    // 2) ตรวจ timeout ของ ESP32 (offline)
    const now = Date.now();

    esp32Clients.forEach((client, deviceId) => {
      if (now - client.lastUpdate > DEVICE_TIMEOUT) {
        console.log(`🔴 DEVICE OFFLINE → ${deviceId}`);

        broadcastStatus(deviceId, "offline");

        esp32Clients.delete(deviceId);
      }
    });

  }, 5000);

  wss.on("close", () => clearInterval(interval));
};


export const sendSettingsToDevice = (deviceId, settings) => {
  const ws = esp32Clients.get(deviceId);

  if (!ws || ws.readyState !== 1) {
    console.log("❌ Cannot send settings → Device offline:", deviceId);
    return false;
  }

  ws.send(
    JSON.stringify({
      type: "SETTINGS_UPDATE",
      settings
    })
  );

  console.log(`⚙️ Sent settings → ${deviceId}`, settings);

  return true;
};



// export const sendSettingsToDevice = (deviceId, settings) => {
//   const ws = esp32Clients.get(deviceId);

//   if (!ws || ws.readyState !== 1) {
//     console.log("❌ Device offline →", deviceId);
//     return false;
//   }

//   ws.send(JSON.stringify({
//     type: "SETTINGS_UPDATE",
//     settings
//   }));

//   return true;
// };



// import { WebSocketServer } from 'ws';

// let wss;

// // เก็บ client ของ ESP32 และ Dashboard
// const esp32Clients = new Map();       
// const dashboardClients = new Map();   

// export const initWebSocket = (server) => {
//   wss = new WebSocketServer({ server });

//   console.log("🚀 WebSocket Server Started");

//   // ===============================
//   // 🟢 HEARTBEAT (ป้องกันค้าง)
//   // ===============================
//   function heartbeat() {
//     this.isAlive = true;
//   }

//   wss.on("connection", (ws) => {
//     ws.isAlive = true;
//     ws.subscribedDevices = [];

//     ws.on("pong", heartbeat);

//     console.log("🔌 New WebSocket Connection");

//     ws.on("message", (message) => {
//       try {
//         const data = JSON.parse(message);

//         // =======================================
//         // 1) Frontend SUBSCRIBE (รองรับทุกแบบ)
//         // =======================================
//         if (data.action === "SUBSCRIBE") {
//           const deviceList =
//             data.deviceIds ||
//             data.device_ids ||
//             data.device_id ||
//             [];

//           if (!Array.isArray(deviceList)) {
//             console.log("❌ Invalid SUBSCRIBE payload:", data);
//             return;
//           }

//           console.log("📌 Frontend SUBSCRIBE →", deviceList);

//           ws.subscribedDevices = deviceList;

//           deviceList.forEach(id => {
//             if (!dashboardClients.has(id)) {
//               dashboardClients.set(id, new Set());
//             }
//             dashboardClients.get(id).add(ws);
//           });

//           return;
//         }

//         // =======================================
//         // 2) ESP32 ส่งข้อมูล sensor
//         // =======================================
//         if (data.device_id && data.data) {
//           const deviceId = data.device_id;

//           esp32Clients.set(deviceId, ws);
//           ws.deviceId = deviceId;
//           ws.lastUpdate = Date.now();

//           console.log(`📥 SENSOR FROM ${deviceId}`, data.data);

//           const payload = {
//             type: "SENSOR_UPDATE",
//             deviceId,
//             npk: {
//               N: data.data.N,
//               P: data.data.P,
//               K: data.data.K,
//             },
//             water_level: data.data.water_level,
//             soil_moisture: data.data.soil_moisture,
//             battery: data.data.battery,
//             config: data.config,
//             timestamp: data.timestamp,
//           };

//           if (dashboardClients.has(deviceId)) {
//             dashboardClients.get(deviceId).forEach(client => {
//               if (client.readyState === 1) {
//                 client.send(JSON.stringify(payload));
//               }
//             });
//           }

//           return;
//         }

//       } catch (err) {
//         console.error("❌ WS JSON Error:", err);
//       }
//     });

//     // =======================================
//     // 🔌 เมื่อ Client หลุดการเชื่อมต่อ
//     // =======================================
//     ws.on("close", () => {
//       console.log("🔌 Client Disconnected");

//       // ถอด ESP32 ออก
//       if (ws.deviceId && esp32Clients.get(ws.deviceId) === ws) {
//         esp32Clients.delete(ws.deviceId);
//       }

//       // ถอด Dashboard client ออกจากทุกห้อง
//       ws.subscribedDevices.forEach(id => {
//         if (dashboardClients.has(id)) {
//           dashboardClients.get(id).delete(ws);
//           if (dashboardClients.get(id).size === 0) {
//             dashboardClients.delete(id);
//           }
//         }
//       });
//     });
//   });

//   // ======================================================
//   // 🔥 HEARTBEAT CHECK — ปิด connection ที่ไม่ตอบ PONG
//   // ======================================================
//   const interval = setInterval(() => {
//     wss.clients.forEach(ws => {
//       if (ws.isAlive === false) {
//         console.log("⚠️ WS Timeout → terminating dead connection");
//         return ws.terminate();
//       }

//       ws.isAlive = false;
//       ws.ping();
//     });
//   }, 15000);

//   wss.on("close", () => clearInterval(interval));
// };


// // ====================================================================
// // 📌 ฟังก์ชันส่งคำสั่งกลับไปยัง ESP32 ( เช่น เปิดปั๊ม / ตั้งค่าใหม่ )
// // ====================================================================
// export const sendSettingsToDevice = (deviceId, settings) => {
//   const ws = esp32Clients.get(deviceId);

//   if (!ws || ws.readyState !== 1) {
//     console.log("❌ Device offline →", deviceId);
//     return false;
//   }

//   ws.send(
//     JSON.stringify({
//       type: "SETTINGS_UPDATE",
//       settings
//     })
//   );

//   console.log(`⚙️ Sent settings → ${deviceId}`, settings);

//   return true;
// };
