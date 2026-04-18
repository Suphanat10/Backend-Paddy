import mqtt from "mqtt";
import { saveSensorData } from "./saveSensorData.js";
import { analyzeSoilAndRice } from "./checkNPK.js"
import { checkAlerts } from "./checkAlerts.js";
import { checkdevice } from "./checkdevice.js";


import { prisma } from "../../lib/prisma.js";
const MQTT_HOST = "mqtt://76.13.213.127";
const MQTT_PORT = 1883;
const CLIENT_ID = "9614eb4e-ba6d-00025215210204f9581250000000051688002700";
const TOKEN = "qktv3FhWabKPPVyAAv3nrjkNXR6CQC79";
const SECRET = "JvkHoykFqQduFvf3t4NUCmNXUX2HM14x";




export const lastStatusCache = new Map();



export const lastSensorCache = new Map();

export const mqttClient = mqtt.connect(MQTT_HOST, {
  clientId: CLIENT_ID,
  username: TOKEN,
  password: SECRET,
  port: MQTT_PORT,
  clean: true,
});



const DEVICE_TIMEOUT_MS = 1 * 60 * 1000;
const deviceTimers = new Map();


export default function connectMQTT(app, io) {
  const DATA_PREFIX = "@msg/smartpaddy/data/";
  const STATUS_PREFIX = "@msg/smartpaddy/status/";

  mqttClient.on("connect", () => {
    console.log("MQTT Connected:", mqttClient.connected);
    mqttClient.subscribe([`${DATA_PREFIX}#`, `${STATUS_PREFIX}#`], { qos: 1 });
  });

  const markDeviceOffline = (device_code, reason) => {
    const statusData = {
      device_code,
      status: "offline",
      reason,
      timestamp: new Date().toISOString(),
    };
    lastStatusCache.set(device_code, statusData);
    io.to(`device:${device_code}`).emit("deviceStatus", statusData);
    io.to("all-devices").emit("deviceStatus", statusData);
    checkdevice(device_code);
    console.log(`DEVICE DEAD: ${device_code} | Reason: ${reason}`);
  };

  const resetHeartbeat = (device_code) => {

    if (deviceTimers.has(device_code)) clearTimeout(deviceTimers.get(device_code));
    const timer = setTimeout(() => {
      markDeviceOffline(device_code, "Heartbeat timeout > 1 min (real data missing)");

    }, DEVICE_TIMEOUT_MS);
    deviceTimers.set(device_code, timer);
  };

  mqttClient.on("message", (topic, message, packet) => {
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      console.warn("Non-JSON message on", topic, ":", message.toString());
      return;
    }

    const { retain: isRetained } = packet;

    // STATUS
    if (topic.startsWith(STATUS_PREFIX)) {
      const device_code = payload.device_code?.trim().toUpperCase();
      const status = payload.status;
      if (!device_code || !status) return;


      if (status === "offline" && isRetained) {
        markDeviceOffline(device_code, "LWT OFFLINE");
      }

      // Online จริง ต้อง reset heartbeat
      if (status === "online" && !isRetained) {
        resetHeartbeat(device_code);
      }
    }

    // SENSOR
    if (topic.startsWith(DATA_PREFIX)) {
      const device_code = payload.device_code?.trim().toUpperCase() || topic.replace(DATA_PREFIX, "").trim().toUpperCase();
      const data = payload.data;
      if (!device_code || !data) return;

      const invalid = Object.values(data).some(d => d?.val == null || d.val === -1);
      if (invalid) return console.log("ค่า sensor ไม่ถูกต้อง:", device_code);

      const sensorData = {
        device_code,
        measured_at: new Date().toISOString(),
        data: {
          N: data.N?.val,
          P: data.P?.val,
          K: data.K?.val,
          pH: data.pH?.val ?? data.PH?.val ?? data.ph?.val,
          W: data.W?.val,
          water_level: data.W?.val,
        },
      };
      lastSensorCache.set(device_code, sensorData);

      // Auto online + reset heartbeat เฉพาะข้อมูลจริง
      const statusData = { device_code, status: "online", timestamp: new Date().toISOString() };
      lastStatusCache.set(device_code, statusData);

      resetHeartbeat(device_code); // นับเฉพาะ sensor หรือ online จริง

      io.to(`device:${device_code}`).emit("sensorData", sensorData);
      io.to(`device:${device_code}`).emit("deviceStatus", statusData);
      io.to("all-devices").emit("sensorData", sensorData);
      io.to("all-devices").emit("deviceStatus", statusData);

      Promise.all([
        saveSensorData(data, device_code),
        analyzeSoilAndRice(
          sensorData.data.N,
          sensorData.data.P,
          sensorData.data.K,
          device_code
        ),
        checkAlerts(data, device_code)
      ]).catch(err => console.error(err));
    }
  });

  mqttClient.on("error", (err) => console.error("MQTT Error:", err.message));
}


export const sendDeviceCommand_disconnect = (client, device_code) => {
  const CMD_TOPIC = `@msg/smartpaddy/cmd/${device_code}`;
  const payload = JSON.stringify({
    device_id: device_code,
    type: "disconnect"
  });

  client.publish(CMD_TOPIC, payload, { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error(`Failed to send command to ${device_code}:`, err.message);
    } else {
      console.log(`Command [disconnect] sent to ${device_code}`);
    }
  });
};


export const sendDeviceCommand_PUMP_OFF_ON = (client, mac_address, cmd) => {
  try {
    if (!client) throw new Error("MQTT client is missing");
    if (!mac_address) throw new Error("mac_address is required");

    const CMD_TOPIC = `@msg/smartpaddy/cmd/${mac_address}`;

    let payload;

    if (cmd === "OFF") {
      payload = {
        pump: mac_address,
        type: "pump_off"
      };
    } else if (cmd === "ON") {
      payload = {
        pump: mac_address,
        type: "pump_on"
      };
    } else {
      throw new Error(`Invalid cmd: ${cmd}`);
    }

    const message = JSON.stringify(payload);

    client.publish(
      CMD_TOPIC,
      message,
      { qos: 1, retain: true },
      (err) => {
        if (err) {
          console.error(` MQTT ERROR (${mac_address}):`, err.message);
        } else {
          console.log(`MQTT SENT [${cmd}] → ${mac_address}`);
        }
      }
    );

    return true;

  } catch (err) {
    console.error("sendDeviceCommand_PUMP_OFF_ON ERROR:", err.message);
    return false;
  }
};

export const sendDeviceCommand_takePhoto = (client, device_code) => {
  const CMD_TOPIC = `@msg/smartpaddy/cmd/${device_code}`;
  const payload = JSON.stringify({
    device_code: device_code,
    type: "takePhoto",
  });

  client.publish(CMD_TOPIC, payload, { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error(` Failed to send command to ${device_code}:`, err.message);
    } else {
      console.log(`Command [takePhoto] sent to ${device_code} on topic: ${CMD_TOPIC}`);
    }
  });
};


