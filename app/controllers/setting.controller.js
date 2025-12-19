import { prisma } from "../../lib/prisma.js";

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
          where: { sensor_type: 1 },
          orderBy: { measured_at: "desc" },
          take: 1,
          include: { Sensor_Type: true }
        },
        Area: {
          include: {
            Farm: true  
          }
        }
      }
    });

    if (dataSetting.length === 0) {
      return res.status(404).json({ message: "ไม่พบการตั้งค่า" });
    }

    const result = dataSetting.map(device => ({
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
        : null
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
    const { device_registrations_id, Water_level_min, Water_level_max , data_send_interval_days , growth_analysis_period } = req.body;


    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }


  const device = await prisma.device_registrations.findFirst({
  where: {
    device_registrations_ID: parseInt(device_registrations_id), 
    user_ID: user_id
  }
});


    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้" });
    }

    // 🔍 ตรวจว่ามี setting เดิมไหม
    const existingSetting = await prisma.User_Settings.findFirst({
      where: { device_registrations_ID: device.device_registrations_ID }
    });

    let updatedSetting;

    if (existingSetting) {
      // 🔄 update
      updatedSetting = await prisma.User_Settings.update({
        where: { user_settings_ID: existingSetting.user_settings_ID },
        data: {
          Water_level_min,
          data_send_interval_days : parseFloat(data_send_interval_days),
          Water_level_mxm :Water_level_max,
          growth_analysis_period : parseFloat(growth_analysis_period)
        }
      });
    } else {
      updatedSetting = await prisma.User_Settings.create({
        data: {
          device_registrations_ID: device.device_registrations_ID,
          Water_level_min,
          data_send_interval_days : parseFloat(data_send_interval_days),
          Water_level_mxm :Water_level_max,
          growth_analysis_period : parseFloat(growth_analysis_period)
        }
      });
    }

    return res.status(200).json({
      message: "อัปเดตการตั้งค่าสำเร็จ",
      setting: updatedSetting
    });

  } catch (error) {
    console.error("Error updating setting:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
