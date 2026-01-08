import cron from 'node-cron';
import { prisma } from "../../lib/prisma.js";
import { sendDeviceCommand_takePhoto } from "./mqtt.js";



export const setupCaptureSchedule = async (mqttClient) => {

      const device=  await prisma.Device.findMany({
       where: {
         status : "registered"
       },
    });

    const deviceList = device.map((device) => device.device_code);

    deviceList.forEach((device) => {
        cron.schedule("*/1 * * * *", () => {
            sendDeviceCommand_takePhoto(mqttClient, device);
        });
    });
}