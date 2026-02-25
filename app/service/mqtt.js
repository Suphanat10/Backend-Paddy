import mqtt from "mqtt";
import { saveSensorData } from "./saveSensorData.js";
import { analyzeSoilAndRice } from "./checkNPK.js"
import { checkAlerts } from "./checkAlerts.js";

import { prisma } from "../../lib/prisma.js";
const MQTT_HOST = "mqtt://emqx:1883";
const MQTT_PORT = 1883;
const CLIENT_ID = "9614eb4e-ba6d-4f95-8e68-cdbb5d083183";
const TOKEN = "qktv3FhWabKPPVyAAv3nrjkNXR6CQC79";
const SECRET = "JvkHoykFqQduFvf3t4NUCmNXUX2HM14x";

// const MQTT_HOST = "mqtt://emqx";
// const MQTT_PORT = 1883;
// const CLIENT_ID = "df438c1c-464b-406a-96c8-9f65c200197f";
// const TOKEN = "server-backend";
// const SECRET = "server-backend";


export const lastStatusCache = new Map();
const statusTimers = new Map();

const STATUS_TIMEOUT = 10 * 60 * 1000; // 10 นาที

export const lastSensorCache = new Map();

export const mqttClient = mqtt.connect(MQTT_HOST, {
  clientId: CLIENT_ID,
  username: TOKEN,
  password: SECRET,
  port: MQTT_PORT,
  clean: true,
});




function resetStatusTimer(device_code, io) {
  if (statusTimers.has(device_code)) {
    clearTimeout(statusTimers.get(device_code));
  }

  const timer = setTimeout(() => {
    console.warn(`${device_code} OFFLINE (timeout)`);

    const statusData = {
      device_code,
      status: "offline",
      timestamp: new Date().toISOString(),
    };

    lastStatusCache.set(device_code, statusData);

    io.to(`device:${device_code}`).emit("deviceStatus", statusData);
    io.to("all-devices").emit("deviceStatus", statusData);
  }, STATUS_TIMEOUT);

  statusTimers.set(device_code, timer);
}



export default function connectMQTT(app, io) {
  const DATA_PREFIX = "@msg/smartpaddy/data/";
  const STATUS_PREFIX = "@msg/smartpaddy/status/";

  mqttClient.on("connect", () => {
    console.log("✅ MQTT Connected");

    mqttClient.subscribe(`${DATA_PREFIX}#`);
    mqttClient.subscribe(`${STATUS_PREFIX}#`);

    console.log("📡 Subscribed:", DATA_PREFIX + "#");
    console.log("📡 Subscribed:", STATUS_PREFIX + "#");

  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());

      console.log(payload)

      /* ================= STATUS ================= */
      if (topic.startsWith(STATUS_PREFIX)) {
        const device_code =
          payload.device_code || topic.replace(STATUS_PREFIX, "");

        const status = payload.status;
        if (!device_code || !status) return;

        const statusData = {
          device_code,
          status,
          timestamp: new Date().toISOString(),
        };

        console.log("📶 STATUS:", statusData);

        lastStatusCache.set(device_code, statusData);
        resetStatusTimer(device_code, io);

        io.to(`device:${device_code}`).emit("deviceStatus", statusData);
        io.to("all-devices").emit("deviceStatus", statusData);
      }

      /* ================= SENSOR ================= */
      if (topic.startsWith(DATA_PREFIX)) {
        const device_code =
          payload.device_code || topic.replace(DATA_PREFIX, "");

        const data = payload.data;
        if (!device_code || !data) return;

        const sensorData = {
          device_code,
          measured_at: new Date().toISOString(),
          data: {
            N: data.N?.val,
            P: data.P?.val,
            K: data.K?.val,
            W: data.W?.val,
            S: data.S?.val,
            water_level: data.W?.val,
            soil_moisture: data.S?.val,

          },
        };

        lastSensorCache.set(device_code, sensorData);

        // sensor มา = online
        const statusData = {
          device_code,
          status: "online",
          timestamp: new Date().toISOString(),
        };

        lastStatusCache.set(device_code, statusData);
        resetStatusTimer(device_code, io);

        io.to(`device:${device_code}`).emit("sensorData", sensorData);
        io.to(`device:${device_code}`).emit("deviceStatus", statusData);

        io.to("all-devices").emit("sensorData", sensorData);
        io.to("all-devices").emit("deviceStatus", statusData);

        await saveSensorData(data, device_code);
        await analyzeSoilAndRice(sensorData.data.N, sensorData.data.P, sensorData.data.K, device_code);
      }

    } catch (err) {
      console.error("❌ MQTT Message Error:", err.message);
    }
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT Error:", err.message);
  });
}



export const sendDeviceCommand_disconnect = (client, device_code) => {
  const CMD_TOPIC = `@msg/smartpaddy/cmd/${device_code}`;
  const payload = JSON.stringify({
    device_id: device_code,
    type: "disconnect"
  });

  client.publish(CMD_TOPIC, payload, { qos: 1 , retain: true }, (err) => {
    if (err) {
      console.error(`Failed to send command to ${device_code}:`, err.message);
    } else {
      console.log(`Command [disconnect] sent to ${device_code}`);
    }
  });
};


export const sendDeviceCommand_PUMP_OFF_ON = (client, mac_address, cmd) => {
  const CMD_TOPIC = `@msg/smartpaddy/cmd/${mac_address}`;
  let payload;
  if (cmd === "OFF") {
    payload = JSON.stringify({
      pump: mac_address,
      type: "pump_off"
    });
  } else if (cmd === "ON") {
    payload = JSON.stringify({
      pump: mac_address,
      type: "pump_on"
    });
  }

  client.publish(CMD_TOPIC, payload, { qos: 1 ,   retain: true }, (err) => {
    if (err) {
      console.error(`Failed to send command to ${mac_address}:`, err.message);
    } else {
      console.log(`Command [pump] sent to ${mac_address}`);
    }
  });
};


export const sendDeviceCommand_takePhoto = (client, device_code) => {
  const CMD_TOPIC = `@msg/smartpaddy/cmd/${device_code}`;
  const payload = JSON.stringify({
    device_id: device_code,
    type: "takePhoto",
  });

  client.publish(CMD_TOPIC, payload, { qos: 1  , retain: true}, (err) => {
    if (err) {
      console.error(` Failed to send command to ${device_code}:`, err.message);
    } else {
      console.log(`Command [takePhoto] sent to ${device_code} on topic: ${CMD_TOPIC}`);
    }
  });
};


