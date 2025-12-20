import { WebSocketServer } from 'ws';
import { prisma } from "../../lib/prisma.js";

let wss;

const esp32Clients = new Map();       
const dashboardClients = new Map();  

const DEVICE_TIMEOUT = 150000;


const broadcastStatus = (deviceId, status) => {
  
  const payload = {
    type: "DEVICE_STATUS",
    deviceId,
    status,
    lastSeen: Date.now(),
  };

  if (dashboardClients.has(deviceId)) {
    dashboardClients.get(deviceId).forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify(payload));
    });
  }
};

// ===========================
// บันทึก Sensor ลง DB
// ===========================
 
export const saveSensorData = async (deviceId, data) => {
  if (!deviceId || !data) return console.log("Invalid payload");

  try {
    // 1. ดึงข้อมูล Device
    const Device = await prisma.Device.findFirst({
      include: { device_registrations: true },
      where: { device_code: deviceId },
    });

   
    if (!Device) return console.log(`❌ ไม่พบ Device: ${deviceId}`);

    // เก็บ ID ไว้ใช้ (ต้องมั่นใจว่าเป็น Int ตามที่ DB ต้องการ)
    const id = Device.device_ID; 

    const registration = Device.device_registrations[0];
    if (!registration) return console.log(`❌ ไม่พบ Device registration: ${deviceId}`);

    // 2. ดึง User Settings
    const user_settings = await prisma.User_Settings.findFirst({
      where: { device_registrations_ID: registration.device_registrations_ID }
    });
    if (!user_settings) return console.log(`❌ ไม่พบ User settings: ${deviceId}`);

    // ... (ส่วน Logic คำนวณเวลา Interval ของคุณ เหมือนเดิม) ...
    const intervalDays = Number(user_settings.data_send_interval_days);
    const now = new Date();
    const defaultHour = Number(user_settings.default_save_hour);
    const todayReference = new Date(now.getFullYear(), now.getMonth(), now.getDate(), defaultHour, 0, 0);

    const lastLog = await prisma.Permanent_Data.findFirst({
      where: { device_registrations_ID: registration.device_registrations_ID },
      orderBy: { measured_at: 'desc' }
    });

    let nextSaveTime = todayReference.getTime();
    if (lastLog) {
      const lastLogTime = new Date(lastLog.measured_at).getTime();
      nextSaveTime = lastLogTime + intervalDays * 24 * 60 * 60 * 1000;
    }

    if (now.getTime() < nextSaveTime) {
      const remainingMs = nextSaveTime - now.getTime();
      // แก้ให้แสดงวินาทีด้วย จะได้ไม่เห็นเป็น 0m เฉยๆ
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      console.log(`⏳ ข้ามการบันทึก → รอบถัดไปใน ${minutes}m ${seconds}s`);
      return;
    }

    // ... (ส่วน Map ข้อมูล Sensor ของคุณ เหมือนเดิม) ...
    const sensorKeyMap = { "Nitrogen (N)": "N", "Phosphorus (P)": "P", "Potassium (K)": "K", "Soil Moisture": "soil_moisture", "Water Level": "water_level" };
    const sensorUnitMap = { "Nitrogen (N)": "mg/kg", "Phosphorus (P)": "mg/kg", "Potassium (K)": "mg/kg", "Soil Moisture": "%", "Water Level": "cm" };
    const sensorTypes = await prisma.Sensor_Type.findMany();

    const recordsToSave = sensorTypes.map(sensor => {
      const key = sensorKeyMap[sensor.name];
      if (key && key in data) {
        return {
          device_registrations_ID: registration.device_registrations_ID,
          sensor_type: sensor.sensor_type_ID,
          value: Number(data[key] || 0),
          unit: sensorUnitMap[sensor.name] || "",
          measured_at: now
        };
      }
      return null;
    }).filter(Boolean);

    // 3. เริ่ม Transaction เพื่อบันทึกข้อมูลและ Log พร้อมกัน
    // ถ้าอันไหนพัง ให้ Rollback ทั้งคู่ (ป้องกันข้อมูลขยะ)
    if (recordsToSave.length > 0) {
      await prisma.$transaction(async (tx) => {
        // บันทึก Permanent_Data ทีละรายการ เพื่อใช้ connect syntax
        for (const record of recordsToSave) {
          await tx.Permanent_Data.create({
            data: {
              device_registrations: { connect: { device_registrations_ID: record.device_registrations_ID } },
              Sensor_Type: { connect: { sensor_type_ID: record.sensor_type } },
              value: record.value,
              unit: record.unit,
              measured_at: record.measured_at
            }
          });
        }

        // บันทึก Logs_Alert
        await tx.Logs_Alert.create({
          data: {
            device_registrations: { connect: { device_registrations_ID: registration.device_registrations_ID } },
            alert_message: "เก็บข้อมูลสำเร็จ " + now.toLocaleTimeString(),
            created_at: new Date()
          }
        });
      });
      console.log(`✅ บันทึกข้อมูล ${deviceId} สำเร็จ`);
    }

  } catch (err) {
    console.error("Save Sensor Error:", err);
  }
};


export const sendSettingsToDevice = (deviceId, settings) => {
  const ws = esp32Clients.get(deviceId);
  if (!ws || ws.readyState !== 1) {
    console.log(`Cannot send settings → ${deviceId} offline`);
    return false;
  }

  ws.send(JSON.stringify({
    type:settings.type,
    settings
  }));

  console.log(`Sent settings → ${deviceId}`, settings);
  console.log(`type → ${settings.type}`);
  return true;
};

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });
  console.log("🚀 WebSocket Server started");

  const heartbeat = function() { this.isAlive = true; };

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.subscribedDevices = [];
    ws.receiveSensors = true;
    ws.on("pong", heartbeat);

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw);

        if (data.action === "SUBSCRIBE_STATUS") {
          const deviceList = Array.isArray(data.deviceIds) ? data.deviceIds : [];
          ws.subscribedDevices = deviceList;
          ws.receiveSensors = false;

          deviceList.forEach(id => {
            if (!dashboardClients.has(id)) dashboardClients.set(id, new Set());
            dashboardClients.get(id).add(ws);
            broadcastStatus(id, esp32Clients.has(id) ? "online" : "offline");
          });
          return;
        }

        // -------------------------------
        // Dashboard subscribe full data
        // -------------------------------
        if (data.action === "SUBSCRIBE") {
          const deviceList = Array.isArray(data.deviceIds || data.device_ids || data.device_id || []) ? data.deviceIds || data.device_ids || data.device_id || [] : [];
          ws.subscribedDevices = deviceList;
          ws.receiveSensors = true;

          deviceList.forEach(id => {
            if (!dashboardClients.has(id)) dashboardClients.set(id, new Set());
            dashboardClients.get(id).add(ws);
            broadcastStatus(id, esp32Clients.has(id) ? "online" : "offline");
          });
          return;
        }

        // -------------------------------
        // ESP32 SENSOR_UPDATE / heartbeat
        // -------------------------------
        if (data.device_id) {
          const deviceId = data.device_id;

          // บันทึกเวลา heartbeat
          ws.isAlive = true;

          // ESP32 → SENSOR_UPDATE
          if (data.data) {
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
                K: data.data.K
              },
              water_level: data.data.water_level,
              soil_moisture: data.data.soil_moisture,
              timestamp: data.timestamp,
            };

            if (dashboardClients.has(deviceId)) {
              dashboardClients.get(deviceId).forEach(client => {
                if (client.readyState === 1 && client.receiveSensors) client.send(JSON.stringify(payload));
              });
            }
            await saveSensorData(deviceId, data.data);
          }

          // ESP32 → HEARTBEAT
          if (data.type === "heartbeat") {
            esp32Clients.set(deviceId, ws);
            ws.deviceId = deviceId;
            ws.lastUpdate = Date.now();
            broadcastStatus(deviceId, "online");
          }

          return;
        }

      } catch (err) {
        console.error("❌ WS JSON Error:", err);
      }
    });

    // -------------------------------
    // Client disconnect
    // -------------------------------
    ws.on("close", () => {
      if (ws.deviceId && esp32Clients.get(ws.deviceId) === ws) {
        esp32Clients.delete(ws.deviceId);
        broadcastStatus(ws.deviceId, "offline");
      }

      ws.subscribedDevices.forEach(id => {
        if (dashboardClients.has(id)) {
          dashboardClients.get(id).delete(ws);
          if (dashboardClients.get(id).size === 0) dashboardClients.delete(id);
        }
      });
    });
  });

  // ===========================
  // Heartbeat + Device Timeout
  // ===========================
  const interval = setInterval(() => {
    const now = Date.now();

    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });

    esp32Clients.forEach((client, deviceId) => {
      if (now - client.lastUpdate > DEVICE_TIMEOUT) {
        broadcastStatus(deviceId, "offline");
        esp32Clients.delete(deviceId);
      }
    });
  }, 5000);

  wss.on("close", () => clearInterval(interval));
};

