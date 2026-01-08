import { prisma } from "../../lib/prisma.js";
import { sendDeviceCommand_PUMP_OFF_ON, mqttClient } from "../mqtt/mqtt.js";
import axios from "axios";

/* ===============================
   LINE Notify
=============================== */
const sendLineNotify = async (
  userId,
  areaName,
  statusText,
  waterLevel,
  actionText
) => {
  if (!userId) return;

  const time = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isWarning =  statusText.includes("ระดับน้ำต่ำ");
  const themeColor = isWarning ? "#fdd835" : "#ff9800"; 

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          {
            type: "flex",
            altText: `📢แจ้งเตือน: ${areaName} (${statusText})`,
            contents: {
              type: "bubble",
              size: "mega",
              header: {
                type: "box",
                layout: "vertical",
                backgroundColor: themeColor,
                paddingAll: "20px",
                contents: [
                  {
                    type: "text",
                    text: areaName,
                    color: "#FFFFFF",
                    size: "xl",
                    weight: "bold",
                    margin: "sm"
                  }
                ]
              },
              body: {
                type: "box",
                layout: "vertical",
                paddingAll: "20px",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "เวลา",
                        size: "sm",
                        color: "#888888"
                      },
                      {
                        type: "text",
                        text: `${time} น.`,
                        size: "sm",
                        color: "#888888",
                        align: "end"
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "xl",
                    contents: [
                      {
                        type: "text",
                        text: statusText,
                        size: "xxl",
                        weight: "bold",
                        color: themeColor
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        margin: "md",
                        spacing: "sm",
                        contents: [
                          {
                            type: "text",
                            text: "ระดับน้ำตอนนี้",
                            color: "#444444",
                            size: "md",
                            flex: 0
                          },
                          {
                            type: "text",
                            text: `${waterLevel}`,
                            weight: "bold",
                            size: "xxl",
                            color: "#111111",
                            flex: 0
                          },
                          {
                            type: "text",
                            text: "ซม.",
                            size: "md",
                            color: "#444444",
                            flex: 0
                          }
                        ]
                      }
                    ]
                  },
                  {
                    type: "separator",
                    margin: "xl"
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "xl",
                    contents: [
                      {
                        type: "text",
                        text: "คำแนะนำ:",
                        size: "xs",
                        color: "#888888",
                        weight: "bold"
                      },
                      {
                        type: "text",
                        text: actionText,
                        size: "sm",
                        color: "#333333",
                        wrap: true,
                        margin: "xs",
                        lineSpacing: "4px"
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: "box",
                layout: "vertical",
                paddingAll: "xs",
                contents: [
                  {
                    type: "button",
                    action: {
                      type: "uri",
                      label: "ดูรายละเอียดทั้งหมด",
                      uri: "https://your-paddy-system.com"
                    },
                    style: "link",
                    height: "sm",
                    color: themeColor
                  }
                ]
              }
            }
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    console.log("LINE Flex Sent Successfully");
  } catch (err) {
    console.error("LINE Error:", err.response?.data || err.message);
  }
};

/* ===============================
   เช็คว่าแจ้งวันนี้หรือยัง
=============================== */
const hasAlertToday = async (deviceRegId, type) => {
  const result = await prisma.logs_Alert.findFirst({
    where: {
      device_registrations_ID: deviceRegId,
      type,
      created_at: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
  });
  return result !== null;
};


export const checkAlerts = async (data, device_code) => {

  const registration = await prisma.device_registrations.findFirst({
    where: {
      Device: { device_code },
      status: "active",
    },
    include: {
      Account: true,
      User_Settings: true,
    },
  });

  if (!registration) return;

  const settings = registration.User_Settings?.[0];
  if (!settings) return;

  const minLevel = settings.Water_level_min;
  const maxLevel = settings.Water_level_mxm;
  const currentLevel = Number(data.W.val);
  const userLineId = registration.Account?.user_id_line;
  const deviceRegId = registration.device_registrations_ID;


  if (currentLevel >= minLevel && currentLevel <= maxLevel) {
     console.log("ยังไม่ต้องแจ้งเตือน");
    return;
  }

   //น้ำน้อย
  if (currentLevel < minLevel) {
    const alreadySent = await hasAlertToday(deviceRegId, "Level_Low");
    if (alreadySent){
      console.log("ยังไม่ต้องแจ้งเตือน");
      return;
    } 

  await sendLineNotify(
  userLineId,
  "เเจ้งเตือนระดับน้ำ",
  "ระดับน้ำต่ำ",
  currentLevel,
  "ควรเปิดปั๊มเพิ่อป้องกันการสูญเสีย"
);


 const alertMessage = "เเจ้งเตือนระดับน้ำต่ำกว่าที่ตั้งค่า ระดับน้ำปัจจุบัน " + currentLevel + " ซม.";

    await prisma.logs_Alert.create({
      data: {
        device_registrations_ID: deviceRegId,
        type: "Level_Low",
        alert_message: alertMessage,
      },
    });
    return;
  }


  //น้ำมาก
  if (currentLevel > maxLevel) {
    const alreadySent = await hasAlertToday(deviceRegId, "Level_High");

    if (alreadySent){
      console.log("ยังไม่ต้องแจ้งเตือน");
      return;
    } 

   const alertMessage = "เเจ้งเตือนระดับน้ำสูงกว่าที่ตั้งค่า ระดับน้ำปัจจุบัน " + currentLevel + " ซม.";

      await sendLineNotify(
        userLineId,
        "เเจ้งเตือนระดับน้ำ",
        "ระดับน้ำสูง",
        currentLevel,
        "หากปั๊มเปิดอยู่ ควรปิดปั๊มเพิ่อป้องกันการสูญเสีย"
      );

    await prisma.logs_Alert.create({
      data: {
        device_registrations_ID: deviceRegId,
        type: "Level_High",
        alert_message: alertMessage,
      },
    });

    return;
  }
};

