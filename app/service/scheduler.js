import cron from 'node-cron';
import { prisma } from "../../lib/prisma.js";
import { sendDeviceCommand_takePhoto } from "../service/mqtt.js";
import { mqttClient } from "../service/mqtt.js";

// ห่อหุ้ม Logic ทั้งหมดไว้ในฟังก์ชัน initScheduler
const initScheduler = () => {
    // ตั้งเวลาทำงานทุกวันตอน 07:00 น.
    cron.schedule('30 12 * * *', async () => {
        console.log('--- [System] เริ่มการตรวจสอบรอบการวิเคราะห์ประจำวัน ---');

        try {
            const activeRegistrations = await prisma.device_registrations.findMany({
                where: { status: 'active' },
                include: {
                    User_Settings: true,
                    Device: true,
                    Growth_Analysis: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const reg of activeRegistrations) {
                // ดึงค่าความถี่จาก User_Settings (Default 3 วัน)
                const userSetting = reg.User_Settings[0];
                const period = userSetting?.growth_analysis_period || 3.0;

                const lastAnalysis = reg.Growth_Analysis[0];
                let shouldCapture = false;

                if (!lastAnalysis) {
                    // ถ้าไม่เคยวิเคราะห์เลย ให้ถ่ายรูปทันที
                    shouldCapture = true;
                } else {
                    const lastDate = new Date(lastAnalysis.created_at);
                    lastDate.setHours(0, 0, 0, 0);

                    const diffTime = Math.abs(today - lastDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays >= period) {
                        shouldCapture = true;
                    }
                }

                if (shouldCapture) {
                    console.log(`[Scheduled] Device: ${reg.Device.device_code} ครบกำหนด (ทุก ${period} วัน)`);

                    const mqttSent = await sendDeviceCommand_takePhoto(mqttClient, reg.Device.device_code);                    
                }
            }
        } catch (error) {
            console.error('❌ Scheduler Error:', error);
        }
    });

    console.log('✅ Scheduler initialized and waiting for 07:00 daily check...');
};

// Export ฟังก์ชันออกไปเพื่อให้ไฟล์อื่น (app.js) เรียกใช้ได้
export default initScheduler;
