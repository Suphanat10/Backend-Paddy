import mqtt from "mqtt";
import { saveSensorData } from "./saveSensorData.js";
import { checkAlerts } from "./checkAlerts.js";
import { setupCaptureSchedule} from "./takePhoto.js"
import { prisma } from "../../lib/prisma.js";


/* ===============================
   MQTT CONFIG
================================ */
const MQTT_HOST = "mqtt://broker.netpie.io";
const MQTT_PORT = 1883;
const CLIENT_ID = "df438c1c-464b-406a-96c8-9f65c200197f";
const TOKEN = "3EsTLkcm5EgRHvspwY7rMpCUGZEHpFiZ";
const SECRET = "vSdY3Kpo25RYNP7ZFQU5uECbTuuC5ZYc";


/* ===============================
   MQTT CLIENT (Singleton)
================================ */
export const mqttClient = mqtt.connect(MQTT_HOST, {
  clientId: CLIENT_ID,
  username: TOKEN,
  password: SECRET,
  port: MQTT_PORT,
  clean: true,
});

/* ===============================
   CONNECT MQTT + SOCKET.IO
================================ */
export default function connectMQTT(app, io) {
  const DATA_TOPIC = "@msg/paddy/data";
  const STATUS_TOPIC = "@msg/paddy/status";

 
  

  mqttClient.on("connect", () => {
    mqttClient.subscribe("@msg/paddy/#", (err) => {
      if (!err) {
         console.log("Listening on @msg/paddy/#");
      }
    });
      setupCaptureSchedule(mqttClient);

  });




  mqttClient.on("message", async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const device_code = payload.device_id;

      /* ===============================
         SENSOR DATA
      ================================ */
      if (payload.type === "sensor" && topic.startsWith(DATA_TOPIC)) {
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

        // 🔔 ตรวจ alert + ควบคุมปั๊ม
        await checkAlerts(sensor, device_code, mqttClient);

        io.to("all-devices").emit("sensorData", sensorData);
        io.to(`device:${device_code}`).emit("sensorData", sensorData);

        // 💾 บันทึกข้อมูล
        await saveSensorData(sensor, device_code);
      }

      /* ===============================
         DEVICE STATUS
      ================================ */
      if (topic.startsWith(STATUS_TOPIC)) {
        const status = payload.status;


        io.to(`device:${device_code}`).emit("deviceStatus", {
          device_code,
          status,
        });

        io.to("all-devices").emit("deviceStatus", {
          device_code,
          status,
        });
      }
    } catch (err) {
      console.error("MQTT Message Error:", err.message);
    }
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT Error:", err.message);
  });
}

export const sendDeviceCommand_disconnect= (client, device_code) => {
    const CMD_TOPIC = `@msg/paddy/cmd/disconnect`;
    const payload = JSON.stringify({
        device_id: device_code,
        type : "disconnect"
    });

    client.publish(CMD_TOPIC, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to send command to ${device_code}:`, err.message);
        } else {
            console.log(`Command [disconnect] sent to ${device_code}`);
        }
    });
};



export const sendDeviceCommand_PUMP_OFF_ON= (client, mac_address , cmd) => {
    const CMD_TOPIC = `@msg/paddy/cmd/pump`;
    let payload;
     if(cmd === "OFF"){
        payload = JSON.stringify({
             pump: mac_address,
            type : "pump_off"
        });
     }else if(cmd === "ON"){
         payload = JSON.stringify({
            pump: mac_address,
            type : "pump_on"
        });
     }

    client.publish(CMD_TOPIC, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to send command to ${mac_address}:`, err.message);
        } else {
            console.log(`Command [pump] sent to ${mac_address}`);
        }
    });
};


export const sendDeviceCommand_takePhoto= (client, device_code) => {
    const CMD_TOPIC = `@msg/paddy/cmd/takePhoto`;
    const payload = JSON.stringify({
        device_id: device_code,
        type : "takePhoto",
    });

    client.publish(CMD_TOPIC, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to send command to ${device_code}:`, err.message);
        } else {
            console.log(`Command [takePhoto] sent to ${device_code}`);
        }
    });
};



