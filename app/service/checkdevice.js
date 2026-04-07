import { prisma } from "../../lib/prisma.js";
import axios from "axios";

export const sendLineNotify = async (lineUserId, deviceName, areaName) => {
   if (!lineUserId) return;

   const timeNow = new Date().toLocaleString("th-TH", { hour12: false });

   const flexMessage = {
      type: "flex",
      altText: "แจ้งเตือนอุปกรณ์ IoT ดับ",
      contents: {
         type: "bubble",
         size: "mega",
         body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
               {
                  type: "text",
                  text: "⚠️ แจ้งเตือน",
                  size: "sm",
                  weight: "bold",
                  color: "#ff5551"
               },
               {
                  type: "text",
                  text: "Smart Paddy",
                  size: "xl",
                  weight: "bold"
               },
               {
                  type: "text",
                  text: "อุปกรณ์ขาดการเชื่อมต่อ",
                  size: "md",
                  color: "#666666",
                  wrap: true
               },

               {
                  type: "separator",
                  margin: "lg"
               },

               {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  spacing: "md",
                  contents: [
                     {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                           { type: "text", text: "อุปกรณ์", size: "sm", flex: 4 },
                           { type: "text", text: deviceName || "-", size: "sm", flex: 6, align: "end", weight: "bold" }
                        ]
                     },
                     {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                           { type: "text", text: "พื้นที่", size: "sm", flex: 4 },
                           { type: "text", text: areaName || "-", size: "sm", flex: 6, align: "end" }
                        ]
                     },
                     {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                           { type: "text", text: "สถานะ", size: "sm", flex: 4 },
                           { type: "text", text: "ออฟไลน์", size: "sm", flex: 6, align: "end", weight: "bold", color: "#ff5551" }
                        ]
                     },
                     {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                           { type: "text", text: "เวลา", size: "sm", flex: 4 },
                           { type: "text", text: timeNow, size: "sm", flex: 6, align: "end" }
                        ]
                     }
                  ]
               }
            ]
         }
      }
   };

   try {
      await axios.post(
         "https://api.line.me/v2/bot/message/push",
         {
            to: lineUserId,
            messages: [flexMessage]
         },
         {
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
         }
      );

      console.log(`[LINE] ส่งแจ้งเตือนแล้ว: ${deviceName}`);
   } catch (err) {
      console.error("LINE Flex Error:", err.response?.data || err.message);
   }
};


export const checkdevice = async (device_code) => {
   try {
      const registration = await prisma.device_registrations.findFirst({
         where: {
            Device: { device_code: device_code },
            status: "active",
         },
         include: {
            Device: true,
            Account: true,
            Area: true,
         },
      });

      if (!registration) {
         return { message: "ไม่พบการลงทะเบียนอุปกรณ์ที่ใช้งานอยู่", success: false };
      }

      // ✅ ดึงค่าที่จำเป็น
      const deviceRegId = registration.device_registrations_ID;
      const lineUserId = registration.Account?.user_id_line;
      const deviceName = registration.Device?.device_code || device_code;
      const areaName = registration.Area?.area_name || "ไม่ระบุโซน";

      // ✅ สร้างข้อความ (อ่านง่าย)
      const alertMsg = `แจ้งเตือนอุปกรณ์ IoT ดับ  รหัสเครื่อง: ${deviceName}  ในพื้นที่: ${areaName}  สถานะ: Offline   เวลา: ${new Date().toLocaleString("th-TH", { hour12: false })}`;


      const recentAlert = await prisma.logs_Alert.findFirst({
         where: {
            device_registrations_ID: deviceRegId,
            type: "OFFLINE",
            created_at: {
               gte: new Date(Date.now() - 10 * 60 * 1000),
            },
         },
      });

      if (recentAlert) {
         return {
            success: true,
            message: "มีการแจ้งเตือนไปแล้วล่าสุด (ป้องกัน spam)",
         };
      }

      // ✅ บันทึก Log
      await prisma.logs_Alert.create({
         data: {
            device_registrations_ID: deviceRegId,
            alert_message: alertMsg,
            type: "OFFLINE",
            created_at: new Date(),
         },
      });

      // ✅ ส่ง LINE
      if (lineUserId) {
         await sendLineNotify(lineUserId, deviceName, areaName);

         return {
            success: true,
            message: `ส่งแจ้งเตือนเครื่อง ${deviceName} เรียบร้อยแล้ว`,
         };
      } else {
         console.warn(`User ID ${registration.user_ID} hasn't linked LINE ID.`);
         return {
            success: false,
            message: "ผู้ใช้นี้ยังไม่ได้เชื่อมต่อ LINE",
         };
      }

   } catch (error) {
      console.error("Check Device Error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในระบบ" };
   }
};