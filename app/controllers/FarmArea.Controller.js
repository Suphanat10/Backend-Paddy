import { prisma } from "../../lib/prisma.js";
import { sendDeviceCommand_disconnect, sendDeviceCommand_PUMP_OFF_ON } from "../service/mqtt.js";
import { mqttClient } from "../service/mqtt.js";
// -----------------------------------------------------การจัดการพื้นที่ฟาร์ม-------------------------------------------------------------------


export const createFarmArea = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!area || !farm_name || !address || !rice_variety || !planting_method || !soil_type || !water_management) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const farm = await prisma.Farm.findFirst({
      where: {
        farm_name: farm_name,
        user_ID: user_id
      }
    });

    if (farm) {
      return res.status(400).json({ message: "ชื่อแปลงนี้มีอยู่ในระบบแล้ว" });
    }

    const newFarmArea = await prisma.Farm.create({
      data: {
        user_ID: user_id,
        area: parseFloat(area),
        farm_name,
        rice_variety,
        planting_method,
        soil_type,
        water_management,
        address
      }
    });

    res.status(201).json({ message: "สร้างแปลงเกษตรสำเร็จ", farmArea: newFarmArea });

  }
  catch (error) {
    console.error("Error creating farm area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFarmArea = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { farm_id, area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }
    if (!farm_id) {
      return res.status(400).json({ message: "Farm Area ID is required" });
    }

    const farmArea = await prisma.Farm.findFirst({
      where: {
        farm_id: farm_id,
        user_ID: user_id
      }
    });

    if (!farmArea) {
      return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
    }
    const updatedFarmArea = await prisma.Farm.update({
      where: { farm_id: farm_id },
      data: {
        area: parseFloat(area),
        farm_name,
        rice_variety,
        planting_method,
        soil_type,
        water_management,
        address
      }
    });
    res.status(200).json({ message: "อัปเดตแปลงเกษตรสำเร็จ", farmArea: updatedFarmArea });

  }
  catch (error) {
    console.error("Error updating farm area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteFarmArea = async (req, res) => {
  try {
    const farm_id = req.body.farm_id;

    if (!farm_id) {
      return res.status(400).json({ message: "Farm Area ID is required" });
    }


    const farmArea = await prisma.Farm.findFirst({
      where: {
        farm_id: farm_id
      }
    });
    if (!farmArea) {
      return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
    }
    await prisma.Farm.delete({
      where: { farm_id: farm_id }
    });
    res.status(200).json({ message: "ลบแปลงเกษตรสำเร็จ" });
  }

  catch (error) {
    console.error("Error deleting farm area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFarmAreas = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const farmAreas = await prisma.farm.findMany({
      where: { user_ID: user_id },
      include: {
        Area: {
          include: {
            device_registrations: true
          }
        }
      }
    });



    if (farmAreas.length === 0) {
      return res.status(404).json({ message: "ไม่พบแปลงเกษตร" });
    }


    const result = farmAreas.map(farm => ({
      farm_id: farm.farm_id,
      area: farm.area,
      farm_name: farm.farm_name,
      rice_variety: farm.rice_variety,
      planting_method: farm.planting_method,
      soil_type: farm.soil_type,
      water_management: farm.water_management,
      address: farm.address,
      sub_areas: farm.Area.map(subArea => ({
        area_id: subArea.area_id,
        area_name: subArea.area_name,
        device_registrations: subArea.device_registrations
      }))
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching farm areas:", error);
    res.status(500).json({ message: "Internal server error" });
  }

};

export const createSubArea = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { farm_id, area_name } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!farm_id || !area_name) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    const farm = await prisma.Farm.findFirst({
      where: {
        farm_id: farm_id,
      }
    });

    if (!farm) {
      return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
    }

    const subArea = await prisma.Area.findFirst({
      where: {
        area_name: area_name,
      }
    });

    if (subArea) {
      return res.status(400).json({ message: "ชื่อพื้นที่ย่อยนี้มีอยู่ในระบบแล้ว" });
    }

    const newSubArea = await prisma.Area.create({
      data: {
        farm_id: farm_id,
        area_name,
      }
    });

    res.status(201).json({ message: "สร้างพื้นที่ย่อยสำเร็จ", sub_area: newSubArea });

  }
  catch (error) {
    console.error("Error creating sub area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const deleteSubArea = async (req, res) => {
  try {
    const area_id = req.body.area_id;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!area_id) {
      return res.status(400).json({ message: "Sub Area ID is required" });
    }
    const subArea = await prisma.Area.findFirst({
      where: {
        area_id: area_id,
      }
    });
    if (!subArea) {
      return res.status(404).json({ message: "ไม่พบพื้นที่ย่อยนี้" });
    }
    await prisma.Area.delete({
      where: { area_id: area_id }
    });
    res.status(200).json({ message: "ลบพื้นที่ย่อยสำเร็จ" });
  }

  catch (error) {
    console.error("Error deleting sub area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const updateSubArea = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { area_id, new_area_name } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!area_id) {
      return res.status(400).json({ message: "Sub Area ID is required" });
    }
    const subArea = await prisma.Area.findFirst({
      where: {
        area_id: area_id
      }
    });
    if (!subArea) {
      return res.status(404).json({ message: "ไม่พบพื้นที่ย่อยนี้" });
    }
    const updatedSubArea = await prisma.Area.update({
      where: { area_id: area_id },
      data: {
        area_name: new_area_name
      }
    });
    res.status(200).json({ message: "อัปเดตพื้นที่ย่อยสำเร็จ", subArea: updatedSubArea });
  }
  catch (error) {
    console.error("Error updating sub area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const registerDeviceToFarmArea = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { area_id, device_code } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }
    if (!area_id || !device_code) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // หาอุปกรณ์
    const device = await prisma.device.findFirst({ where: { device_code } });

    if (!device) return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });

    if (device.status === "registered")
      return res.status(400).json({ message: "อุปกรณ์นี้ถูกใช้งานในพื้นที่อื่นแล้ว" });

    if (device.status !== "online")
      return res.status(400).json({ message: "อุปกรณ์นี้ยังไม่ออนไลน์ ไม่สามารถลงทะเบียนได้" });

    // อุปกรณ์ถูกใช้หรือยัง
    const deviceAlreadyUsed = await prisma.device_registrations.findFirst({
      where: { device_ID: parseInt(device.device_ID) }
    });

    if (deviceAlreadyUsed)
      return res.status(400).json({ message: "อุปกรณ์นี้ถูกใช้งานในพื้นที่อื่นแล้ว" });

    // เช็กพื้นที่ย่อย
    const subArea = await prisma.area.findFirst({
      where: { area_id: Number(area_id) }
    });

    if (!subArea)
      return res.status(404).json({ message: "ไม่พบพื้นที่ย่อยนี้" });

    // เช็กพื้นที่ย่อยมีอุปกรณ์แล้วหรือยัง
    const areaUsed = await prisma.device_registrations.findFirst({
      where: { area_id: Number(area_id) }
    });

    if (areaUsed)
      return res.status(400).json({ message: "พื้นที่ย่อยนี้มีอุปกรณ์ลงทะเบียนแล้ว" });

    // 1) สร้าง device_registrations ก่อน (ตัวที่ต้องใช้ในขั้นตอนต่อไป)
    const newRegistration = await prisma.device_registrations.create({
      data: {
        user_ID: user_id,
        area_id: Number(area_id),
        device_ID: device.device_ID
      }
    });

    // 2) แล้วค่อยทำ transaction อีกชุด
    await prisma.$transaction([
      prisma.device.update({
        where: { device_ID: parseInt(device.device_ID) },
        data: { status: "registered" }
      }),

      prisma.user_Settings.create({
        data: {
          device_registrations_ID: newRegistration.device_registrations_ID,
          data_send_interval_days: 1,
          growth_analysis_period: 72,

          Water_level_min: 10,
          Water_level_mxm: 15
        }
      }),


    ]);

    return res.status(201).json({
      message: "ลงทะเบียนอุปกรณ์สำเร็จ",
      device: newRegistration
    });

  } catch (error) {
    console.error("Error registering device to farm area:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const transferDevice = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { device_id, area_id, farm_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!device_id || !area_id || !farm_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const device = await prisma.device.findFirst({
      where: { device_ID: device_id },
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    // 🔹 หา registration เดิม
    const reg = await prisma.device_registrations.findFirst({
      where: {
        device_ID: device_id,
        user_ID: user_id,
      },
    });

    if (!reg) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    // 🔹 ตรวจสอบพื้นที่
    const area = await prisma.area.findFirst({
      where: {
        area_id,
        farm_id,
      },
    });

    if (!area) {
      return res.status(404).json({ message: "ไม่พบพื้นที่นี้ในระบบ" });
    }

    // 🔹 ดึงค่า default system settings
    const settings_default = await prisma.system_settings.findFirst({
      where: { system_settings_ID: 1 },
    });

    if (!settings_default) {
      return res.status(404).json({ message: "ไม่พบตั้งค่าระบบ" });
    }

    // =============================
    // 🔹 ใช้ Transaction
    // =============================
    await prisma.$transaction(async (tx) => {

      // 1) ลบข้อมูลเก่า
      await tx.permanent_Data.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID },
      });

      await tx.growth_Analysis.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID },
      });

      await tx.logs_Alert.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID },
      });

      // 2) อัปเดต registration
      await tx.device_registrations.update({
        where: {
          device_registrations_ID: reg.device_registrations_ID,
        },
        data: {
          area_id,
          status: "active",
          registered_at: new Date(),
        },
      });

      // 3) reset user settings
      const settings = await tx.user_Settings.findFirst({
        where: { device_registrations_ID: reg.device_registrations_ID },
      });

      const settingsData = {
        data_send_interval_days: settings_default.data_send_interval_days,
        growth_analysis_period: settings_default.growth_analysis_period,
        Water_level_min: settings_default.water_level_min,
        Water_level_mxm: settings_default.water_level_max,
      };

      if (settings) {
        await tx.user_Settings.update({
          where: { user_settings_ID: settings.user_settings_ID },
          data: settingsData,
        });
      } else {
        await tx.user_Settings.create({
          data: {
            device_registrations_ID: reg.device_registrations_ID,
            ...settingsData,
          },
        });
      }
    });

    sendDeviceCommand_disconnect(mqttClient, device.device_code);


    return res.status(200).json({
      message: "ย้ายอุปกรณ์สำเร็จ",
      data: {
        device_id,
        new_area_id: area_id,
        new_farm_id: farm_id,
        reg_id: reg.device_registrations_ID,
      },
    });

  } catch (error) {
    console.error("Error transferDevice:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const deleteDevice = async (req, res) => {
  try {
    const { device_code } = req.body;

    if (!device_code) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // 1) หา device
    const device = await prisma.device.findFirst({
      where: { device_code }
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    // 2) หา device_registrations
    const registrations = await prisma.device_registrations.findMany({
      where: { device_ID: device.device_ID }
    });

    // 3) ลบข้อมูลลูกทั้งหมด
    for (const reg of registrations) {
      await prisma.permanent_Data.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID }
      });

      await prisma.growth_Analysis.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID }
      });

      await prisma.logs_Alert.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID }
      });

      await prisma.user_Settings.deleteMany({
        where: { device_registrations_ID: reg.device_registrations_ID }
      });
    }

    // 4) ลบ device_registrations (ไม่ลบ Device)
    await prisma.device_registrations.deleteMany({
      where: { device_ID: device.device_ID }
    });



    sendDeviceCommand_disconnect(mqttClient, device_code);

    return res.status(200).json({
      message: "ลบข้อมูลที่เกี่ยวข้องกับอุปกรณ์สำเร็จ และหยุดการทำงานของอุปกรณ์แล้ว"
    });

  } catch (error) {
    console.error("Error deleteDevice:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const ON_OFF_Pupm = async (req, res) => {
  try {
    const { pump_ID, command } = req.body;

    if (!pump_ID) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (!command) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const pump = await prisma.Pump.findFirst({
      where: { pump_ID }
    });

    if (!pump) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    const registration = await prisma.device_registrations.findFirst({
      where: { user_ID: pump.user_ID }
    });

    if (!registration) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    const device_code = await prisma.device.findFirst({
      where: { device_ID: registration.device_ID }

    });

    const mac_address = pump.mac_address;

    if (command === "OFF") {
      sendDeviceCommand_PUMP_OFF_ON(mqttClient, mac_address, "OFF");
    } else if (command === "ON") {
      sendDeviceCommand_PUMP_OFF_ON(mqttClient, mac_address, "ON");
    }

    await prisma.Pump.update({
      where: { pump_ID },
      data: { status: command },
    });

    return res.status(200).json({
      message: "สั่งอุปกรณ์สำเร็จ"
    });


  } catch (error) {
    console.error("Error ON_OFF_Pupm:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};