import { prisma } from "../../lib/prisma.js";
import axios from "axios";

export const Automatic_water_level = async (req, res) => {
  try {
    const { device_registrations_id, control_mode } = req.body;

    if (!device_registrations_id) {
      return res.status(400).json({ message: "device_registrations_ID required" });
    }

    if (!control_mode) {
      return res.status(400).json({ message: "control_mode required" });
    }


    const device_registrations_ID = Number(device_registrations_id);

    let targetMin, targetMax;

    if (control_mode === "AUTO") {

      const growth = await prisma.growth_Analysis.findFirst({
        where: { device_registrations_ID },
        orderBy: { created_at: "desc" }
      });

      const AUTO_WATER_LEVEL_BY_STAGE = {
        "ระยะต้นกล้า": { min: 5, max: 10 },
        "ระยะตั้งท้อง": { min: 10, max: 20 },
        "ระยะออกรวง": { min: 5, max: 10 },
        "ระยะสุกแก่": { min: 0, max: 5 },
      };

      if (growth && AUTO_WATER_LEVEL_BY_STAGE[growth.growth_stage]) {
        targetMin = AUTO_WATER_LEVEL_BY_STAGE[growth.growth_stage].min;
        targetMax = AUTO_WATER_LEVEL_BY_STAGE[growth.growth_stage].max;
      } else {
        targetMin = 5;
        targetMax = 15;
      }


      if (isNaN(targetMin) || isNaN(targetMax)) {
        return res.status(400).json({ message: "Invalid water level" });
      }

      await prisma.user_Settings.updateMany({
        where: { device_registrations_ID },
        data: {
          Water_level_min: targetMin,
          Water_level_mxm: targetMax,
          control_mode: "AUTO"
        }
      });

      return res.status(200).json({
        message: "AUTO updated",
        stage: growth?.growth_stage || "fallback",
        targetMin,
        targetMax
      });
    }

    if (control_mode === "MANUAL") {
      await prisma.user_Settings.updateMany({
        where: { device_registrations_ID },
        data: {
          control_mode: "MANUAL"
        }
      });

      return res.status(200).json({
        message: "Switched to MANUAL"
      });
    }

  } catch (error) {
    console.error("AUTO WATER ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getdataSetting = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const dataSetting = await prisma.device_registrations.findMany({
      where: { user_ID: user_id },
      include: {
        User_Settings: true,
        Permanent_Data: {
          where: { sensor_type: 4 },
          orderBy: { measured_at: "desc" },
          take: 1,
          include: { Sensor_Type: true },
        },
        Area: {
          include: {
            Farm: true,
          },
        },
      },
    });

    if (dataSetting.length === 0) {
      return res.status(404).json({ message: "ไม่พบการตั้งค่า" });
    }

    const result = dataSetting.map((device) => ({
      device_registrations_ID: device.device_registrations_ID,
      device_ID: device.device_ID,

      farm_name: device.Area.Farm?.farm_name || null,
      area_name: device.Area.area_name,

      status: device.status,

      setting: device.User_Settings[0] ?? null,

      latest_water_level: device.Permanent_Data[0]
        ? {
          value: device.Permanent_Data[0].value,
          unit: device.Permanent_Data[0].unit,
          measured_at: device.Permanent_Data[0].measured_at,
        }
        : null,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data setting:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const {
      device_registrations_id,
      Water_level_min,
      Water_level_max,
      data_send_interval_days,
      growth_analysis_period,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const device = await prisma.device_registrations.findFirst({
      where: {
        device_registrations_ID: parseInt(device_registrations_id),
        user_ID: user_id,
      },
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้" });
    }

    // 🔍 ตรวจว่ามี setting เดิมไหม
    const existingSetting = await prisma.User_Settings.findFirst({
      where: { device_registrations_ID: device.device_registrations_ID },
    });

    let updatedSetting;

    if (existingSetting) {
      updatedSetting = await prisma.User_Settings.update({
        where: { user_settings_ID: existingSetting.user_settings_ID },
        data: {
          Water_level_min: parseFloat(Water_level_min),
          data_send_interval_days: parseFloat(data_send_interval_days),
          Water_level_mxm: parseFloat(Water_level_max),
          growth_analysis_period: parseFloat(growth_analysis_period),
        },
      });
    } else {
      updatedSetting = await prisma.User_Settings.create({
        data: {
          Water_level_min: parseFloat(Water_level_min),
          data_send_interval_days: parseFloat(data_send_interval_days),
          Water_level_mxm: parseFloat(Water_level_max),
          growth_analysis_period: parseFloat(growth_analysis_period),

          device_registrations: {
            connect: {
              device_registrations_ID:
                device.device_registrations_ID,
            },
          },
        },
      });
    }


    return res.status(200).json({
      message: "อัปเดตการตั้งค่าสำเร็จ",
      setting: updatedSetting,
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const sendLineNotify = async (
  userId,
  areaName,
  statusText,
  waterLevel,
  actionText,
) => {
  if (!userId) return;

  const time = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isWarning = statusText.includes("ระดับน้ำต่ำ");
  const themeColor = isWarning ? "#fdd835" : "#ff9800";

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          {
            type: "flex",
            altText: `แจ้งเตือน: ${areaName} (${statusText})`,
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
                    margin: "sm",
                  },
                ],
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
                        color: "#888888",
                      },
                      {
                        type: "text",
                        text: `${time} น.`,
                        size: "sm",
                        color: "#888888",
                        align: "end",
                      },
                    ],
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
                        color: themeColor,
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
                            flex: 0,
                          },
                          {
                            type: "text",
                            text: `${waterLevel}`,
                            weight: "bold",
                            size: "xxl",
                            color: "#111111",
                            flex: 0,
                          },
                          {
                            type: "text",
                            text: "ซม.",
                            size: "md",
                            color: "#444444",
                            flex: 0,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "separator",
                    margin: "xl",
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
                        weight: "bold",
                      },
                      {
                        type: "text",
                        text: actionText,
                        size: "sm",
                        color: "#333333",
                        wrap: true,
                        margin: "xs",
                        lineSpacing: "4px",
                      },
                    ],
                  },
                ],
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
                      uri: "https://smart-paddy.space",
                    },
                    style: "link",
                    height: "sm",
                    color: themeColor,
                  },
                ],
              },
            },
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );
    console.log("LINE Flex Sent Successfully");
    return true;
  } catch (err) {
    console.error("LINE Error:", err.response?.data || err.message);
    return false;
  }
};



