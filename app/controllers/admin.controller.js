import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import { sendDeviceCommand_disconnect, sendDeviceCommand_takePhoto, sendDeviceCommand_PUMP_OFF_ON } from "../service/mqtt.js";
import { mqttClient } from "../service/mqtt.js";



export const update_device = async (req, res) => {
  try {
    const { device_id, status, device_code } = req.body;

    if (!device_id || !status || !device_code) {
      return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์และสถานะ" });
    }

    const device = await prisma.device.findFirst({
      where: { device_id }
    });

    if (!device) {
      return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
    }

    const updatedDevice = await prisma.device.update({
      data: {
        device_code: device_code,
        status: status
      },
      where: { device_id }
    });
    res.status(200).json({
      message: "อุปกรณ์ถูกอัปเดตแล้ว",
      device: updatedDevice

    });
  } catch (error) {
    console.error("Error updating device:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const delete_device = async (req, res) => {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
    }

    const device = await prisma.device.findFirst({
      where: { device_id }
    });

    if (!device) {
      return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
    }

    const deletedDevice = await prisma.device.delete({
      where: { device_id }
    });
    res.status(200).json({
      message: "อุปกรณ์ถูกลบแล้ว",
      device: deletedDevice
    });

  } catch (error) {
    console.error("Error deleting device:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const get_user = async (req, res) => {
  try {
    const users = await prisma.Account.findMany({
      select: {
        user_ID: true,
        first_name: true,
        last_name: true,
        birth_date: true,
        phone_number: true,
        email: true,
        position: true,
        gender: true,
        Farm: {
          select: {
            farm_id: true,
            farm_name: true,
            rice_variety: true,
            planting_method: true,
            soil_type: true,
            water_management: true,
            address: true,
            area: true, // ขนาดฟาร์ม
            Area: {
              select: {
                area_id: true,
                area_name: true
              }
            }
          }
        }
      },
      where: {
        position: "Agriculture"
      }
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: "ไม่พบผู้ใช้งาน",
        user: []
      });
    }

    // 🔥 จัดรูป response ให้ใช้งานง่าย
    const users_result = users.map(user => ({
      ...user,
      Farm: user.Farm.map(farm => ({
        ...farm,
        areas: farm.Area.map(area => ({
          area_id: area.area_id,
          area_name: area.area_name,
          farm_area_size: farm.area // ดึงพื้นที่ฟาร์มมาแปะให้ sub-area
        }))
      }))
    }));

    return res.status(200).json(users_result);

  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const add_user = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      birth_date,
      phone_number,
      email,
      position,
      gender,
      password
    } = req.body || {};

    // =============================
    // 1) Validate input
    // =============================
    if (
      !first_name ||
      !last_name ||
      !birth_date ||
      !phone_number ||
      !email ||
      !position ||
      !gender ||
      !password
    ) {
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลให้ครบถ้วน"
      });
    }

    // แปลงเบอร์ให้เหลือเฉพาะตัวเลข
    const phone_number_clean = String(phone_number).replace(/\D/g, "");

    // =============================
    // 2) เช็ค email ซ้ำ
    // =============================
    const emailExists = await prisma.Account.findFirst({
      where: { email }
    });

    if (emailExists) {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้แล้ว"
      });
    }

    // =============================
    // 3) เช็คเบอร์โทรซ้ำ
    // =============================
    const phoneExists = await prisma.Account.findFirst({
      where: { phone_number: phone_number_clean }
    });

    if (phoneExists) {
      return res.status(400).json({
        message: "เบอร์โทรศัพท์นี้ถูกใช้แล้ว"
      });
    }

    // =============================
    // 4) Hash password
    // =============================
    const hashedPassword = await bcrypt.hash(password, 10);

    // =============================
    // 5) Create user
    // =============================
    const newUser = await prisma.Account.create({
      data: {
        first_name,
        last_name,
        birth_date: new Date(birth_date),
        phone_number: phone_number_clean,
        email,
        position,
        gender,
        password: hashedPassword
      }
    });

    return res.status(201).json(
      newUser
    );

  } catch (error) {
    console.error("Error adding user:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


export const delete_user = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "กรุณากรอกรหัสผู้ใช้งาน" });
    }

    const id = parseInt(user_id);

    // ✅ ใช้ findUnique และส่ง where เป็น object
    const user = await prisma.account.findUnique({
      where: {
        user_ID: id,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    // ✅ ลบผู้ใช้
    const deletedUser = await prisma.account.delete({
      where: {
        user_ID: id,
      },
    });

    res.status(200).json({
      ok: true,
      message: "ผู้ใช้งานถูกลบแล้ว",
      user: deletedUser,
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const updateProfile = async (req, res) => {
  try {
    const user_id = req.body.user_id;

    const { first_name, last_name, phone_number, gender, email } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!first_name || !last_name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อและนามสกุล" });
    }

    if (!phone_number) {
      return res.status(400).json({ message: "กรุณากรอกเบอร์โทรศัพท์" });
    }

    if (!email) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล" });
    }

    const updatedProfile = await prisma.Account.update({
      where: { user_ID: user_id },
      data: {
        first_name,
        last_name,
        phone_number,
        gender,
        email
      },
      select: {
        user_ID: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        gender: true,
        birth_date: true,
        position: true,
      },
    });

    res.status(200).json({ message: "อัปเดตโปรไฟล์สำเร็จ", profile: updatedProfile });

    await prisma.logs.create({
      data: {
        Account: {
          connect: { user_ID: updatedProfile.user_ID }
        },
        action: "update_profile",
        ip_address: req.ip,
        created_at: new Date(),
      },
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const createFarmArea = async (req, res) => {
  try {
    const user_id = req.body.user_id;
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

    await prisma.logs.create({
      data: {
        Account: {
          connect: { user_ID: user_id }
        },
        action: "create_farm_area",
        ip_address: req.ip,
        created_at: new Date(),
      },
    });
  }
  catch (error) {
    console.error("Error creating farm area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const updateFarmArea = async (req, res) => {
  try {
    const { farm_id, area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;


    if (!farm_id) {
      return res.status(400).json({ message: "Farm Area ID is required" });
    }

    const farmArea = await prisma.Farm.findFirst({
      where: {
        farm_id: farm_id,
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


export const createSubArea = async (req, res) => {
  try {

    const { farm_id, area_name } = req.body;


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




export const updateSubArea = async (req, res) => {
  try {
    const { area_id, area_name } = req.body;

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
        area_name
      }
    });
    res.status(200).json({ message: "อัปเดตพื้นที่ย่อยสำเร็จ", subArea: updatedSubArea });
  }
  catch (error) {
    console.error("Error updating sub area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const deleteSubArea = async (req, res) => {
  try {
    const area_id = req.body.area_id;


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


export const getDevices = async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: {
        created_at: "desc",
      },
      include: {
        device_registrations: {
          include: {
            Area: {
              include: {
                Farm: true,
              },
            },
          },
        },
      },
    });

    if (!devices || devices.length === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
    }

    const formatted = devices.map((device) => {
      // เอา registration ล่าสุด (ถ้ามีหลายอัน)
      const latestReg = device.device_registrations[0];

      return {
        device_id: device.device_ID,
        device_code: device.device_code,
        status: device.status,
        created_at: device.created_at,

        farm: latestReg?.Area?.Farm
          ? {
            farm_id: latestReg.Area.Farm.farm_id,
            farm_name: latestReg.Area.Farm.farm_name,
          }
          : null,

        area: latestReg?.Area
          ? {
            area_id: latestReg.Area.area_id,
            area_name: latestReg.Area.area_name,
          }
          : null,
      };
    });

    res.status(200).json({
      ok: true,
      data: formatted,
    });

  } catch (error) {
    console.error("Error getting devices:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createDevice = async (req, res) => {
  try {
    const { device_code } = req.body;

    if (!device_code) {
      return res.status(400).json({ message: "Device Code is required" });
    }

    const device = await prisma.Device.findFirst({
      where: {
        device_code: device_code,
      }
    });

    if (device) {
      return res.status(400).json({ message: "ไม่สามารถสร้างอุปกรณ์ได้เนื่องจากอุปกรณ์นี้มีอยู่ในระบบแล้ว" });
    }

    const newDevice = await prisma.Device.create({
      data: {
        device_code,
        status: "inactive",
        created_at: new Date(),

      }
    });

    res.status(201).json({ message: "Device created successfully", device: newDevice });

  }
  catch (error) {
    console.error("Error creating device:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const deleteDevice = async (req, res) => {
  try {
    const device_id = req.body.device_code;

    if (!device_id) {
      return res.status(400).json({ message: "Device ID is required" });
    }

    const device = await prisma.Device.findFirst({
      where: {
        device_code: device_id,
      }
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้" });
    }

    await prisma.Device.delete({
      where: { device_code: device_id }
    });

    res.status(200).json({ message: "ลบอุปกรณ์สำเร็จ" });
  }
  catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const updateDevice = async (req, res) => {
  try {
    const { device_id, device_code } = req.body;

    if (!device_id) {
      return res.status(400).json({ message: "Device ID is required" });
    }

    const device = await prisma.Device.findFirst({
      where: {
        device_ID: device_id,
      }
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้" });
    }

    const updatedDevice = await prisma.Device.update({
      where: { device_ID: device_id },
      data: {
        device_code
      }
    });

    res.status(200).json({ message: "อัปเดตอุปกรณ์สำเร็จ", device: updatedDevice });
  }
  catch (error) {
    console.error("Error updating device:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getAllPumpSystem = async (req, res) => {
  try {
    const farms = await prisma.farm.findMany({
      include: {
        Account: true, // 👈 เพิ่มเจ้าของฟาร์ม

        Area: {
          include: {
            Pump: {
              orderBy: { created_at: "desc" },
            },
            device_registrations: {
              include: {
                Device: true,
              },
            },
          },
        },
      },
    });

    if (!farms || farms.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลฟาร์มในระบบ" });
    }

    const response = farms.flatMap((farm) =>
      (farm.Area || []).map((area) => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        farm_address: farm.address,

        // 👇 เจ้าของฟาร์ม
        owner: {
          user_id: farm.Account?.user_ID,
          first_name: farm.Account?.first_name,
          last_name: farm.Account?.last_name,
          email: farm.Account?.email,
        },

        area_id: area.area_id,
        area_name: area.area_name,

        devices: (area.device_registrations || []).map((reg) => ({
          device_registrations_id: reg.device_registrations_ID,
          device_id: reg.device_ID,
          device_code: reg.Device?.device_code,
          device_status: reg.Device?.status,
          registered_at: reg.registered_at,
        })),

        pumps: (area.Pump || []).map((p) => ({
          pump_id: p.pump_ID,
          pump_name: p.pump_name,
          pump_status: p.status,
          mac_address: p.mac_address,
          created_at: p.created_at,
        })),
      }))
    );

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error getAllPumpSystem:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getDeviceRegistrations = async (req, res) => {
  try {


    const deviceRegistrations =
      await prisma.device_registrations.findMany({
        select: {
          device_registrations_ID: true,
          status: true,
          registered_at: true,

          Device: {
            select: {
              device_code: true,
            },
          },

          // 👤 เจ้าของอุปกรณ์
          Account: {
            select: {
              user_ID: true,
              first_name: true,
              last_name: true,
            },
          },

          // 📍 พื้นที่ที่ลงทะเบียนจริง
          Area: {
            select: {
              area_id: true,
              area_name: true,
              Farm: {
                select: {
                  farm_id: true,
                  farm_name: true,
                },
              },
            },
          },
        },
        orderBy: {
          registered_at: "desc",
        },
      });

    if (!deviceRegistrations) {
      return res.status(404).json({ message: "ไม่พบการลงทะเบียนอุปกรณ์" });
    }


    res.status(200).json(deviceRegistrations);
  }
  catch (error) {
    console.error("Error getting device registrations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const GetData_devicebyID = async (req, res) => {
  try {
    const { device_code, range = 30 } = req.body;

    if (!device_code)
      return res.status(400).json({
        message: "กรุณาระบุรหัสอุปกรณ์ (device_code)",
      });

    const device = await prisma.Device.findFirst({
      where: { device_code },
    });

    if (!device)
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });

    const registration = await prisma.device_registrations.findFirst({
      where: { device_ID: device.device_ID },
      include: {
        Area: true,
        Account: true,
      },
    });

    if (!registration)
      return res.status(404).json({ message: "อุปกรณ์ยังไม่ได้ลงทะเบียน" });

    // 🔥 จำกัดช่วงเวลา
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(range));

    // 🔥 ดึงข้อมูลพร้อมกัน
    const [permanentData, growthHistory, diseaseHistory] = await Promise.all([
      prisma.Permanent_Data.findMany({
        where: {
          device_registrations_ID:
            registration.device_registrations_ID,
          measured_at: { gte: startDate },
        },
        include: { Sensor_Type: true },
        orderBy: { measured_at: "asc" }, // ✅ เรียงถูกจาก backend
      }),

      prisma.Growth_Analysis.findMany({
        where: {
          device_registrations_ID:
            registration.device_registrations_ID,
        },
        orderBy: { created_at: "desc" },
        take: 20, // จำกัดจำนวน
      }),

      prisma.Disease_Analysis.findMany({
        where: {
          device_registrations_ID:
            registration.device_registrations_ID,
        },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
    ]);

    // 🔥 รวม sensor ต่อวัน
    const grouped = {};

    permanentData.forEach((item) => {
      const dateKey = item.measured_at.toISOString().split("T")[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          timestamp: dateKey,
          time: new Date(dateKey).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
          }),
          N: null,
          P: null,
          K: null,
          S: null,
          W: null,
        };
      }

      const key = item.Sensor_Type?.key;
      if (key) grouped[dateKey][key] = item.value;
    });

    const sensor_history = Object.values(grouped);

    const response = {
      device: {
        device_id: device.device_ID,
        device_code: device.device_code,
        status: registration.status,
        registered_at: registration.registered_at,
      },
      area: {
        id: registration.Area.area_id,
        name: registration.Area.area_name,
      },
      owner: {
        user_id: registration.Account.user_ID,
        first_name: registration.Account.first_name,
        last_name: registration.Account.last_name,
        email: registration.Account.email,
      },
      sensor_history,
      growth_history: growthHistory,
      disease_history: diseaseHistory,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error GetData_devicebyID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const GetdataLog = async (req, res) => {
  try {
    const log = await prisma.Logs.findMany({
      include: {
        Account: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" }
    });

    if (!log || log.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    return res.status(200).json(log);

  } catch (error) {
    console.error("Error GetdataLog:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




export const GetdataLog_Logs_Alert = async (req, res) => {
  try {
    const logs = await prisma.Logs_Alert.findMany({
      orderBy: { created_at: "desc" },
      select: {
        logs_alert_ID: true,
        alert_message: true,
        created_at: true,

        device_registrations: {
          select: {
            device_registrations_ID: true,
            status: true,

            Device: {
              select: {
                device_ID: true,
                device_code: true,
                status: true,
              },
            },

            Account: {
              select: {
                user_ID: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!logs.length) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    return res.status(200).json(logs);

  } catch (error) {
    console.error("Error GetdataLog_Logs_Alert:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const get_system_settings = async (req, res) => {
  try {
    const system_settings = await prisma.system_settings.findMany({
    });


    if (!system_settings) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    return res.status(200).json(system_settings);
  } catch (error) {
    console.error("Error get_system_settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const update_Scheduler = async (req, res) => {

  // ตอนนี้ req จะมีค่า และ req.body จะไม่ undefined แล้ว
  const scheduler_time = req.body.scheduler_time;

  if (!scheduler_time) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ถูกต้อง" });
  }

  try {

    const isoDateString = `1970-01-01T${scheduler_time}:00.000Z`;
    const dateForPrisma = new Date(isoDateString);



    const system_settings = await prisma.system_settings.findFirst({});

    if (!system_settings) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    const updated_system_settings = await prisma.system_settings.update({
      where: { system_settings_ID: system_settings.system_settings_ID },
      data: {
        scheduler_time: dateForPrisma,
        updated_at: new Date()
      },
    });

    return res.status(200).json(updated_system_settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

export const update_system_settings = async (req, res) => {
  try {
    const { data_send_interval_days, growth_analysis_period, water_level_min, water_level_max } = req.body;

    if (!data_send_interval_days || !growth_analysis_period || !water_level_min || !water_level_max) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ถูกต้อง" });
    }

    const system_settings = await prisma.system_settings.findFirst({});

    if (!system_settings) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    const updated_system_settings = await prisma.system_settings.update({
      where: { system_settings_ID: system_settings.system_settings_ID },
      data: {
        data_send_interval_days,
        growth_analysis_period,
        water_level_min,
        water_level_max,
        updated_at: new Date()
      },
    });

    return res.status(200).json(updated_system_settings);

  } catch (error) {
    console.error("Error updating system settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getFarmAreas = async (req, res) => {
  try {
    const user_id = req.body.user_id;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const farmAreas = await prisma.farm.findMany({
      where: { user_ID: parseInt(user_id) },
      include: {
        Area: {
          include: {
            device_registrations: true
          }
        }
      }
    });

    if (!farmAreas) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    return res.status(200).json(farmAreas);

  } catch (error) {
    console.error("Error getFarmAreas:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const transferDevice = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { device_registrations_ID, area_id, farm_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    if (!device_registrations_ID || !area_id || !farm_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }


    // 🔹 หา registration เดิม
    const reg = await prisma.device_registrations.findFirst({
      where: {
        device_registrations_ID: parseInt(device_registrations_ID),
        user_ID: parseInt(user_id),
      },
    });

    if (!reg) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }

    const device = await prisma.device.findFirst({
      where: {
        device_ID: reg.device_ID,
      },
    });

    if (!device) {
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


export const getData_Growth_Analysis = async (req, res) => {
  try {
    const result = await prisma.account.findMany({
      include: {
        Farm: {
          include: {
            Area: {
              include: {
                device_registrations: {
                  include: {
                    Device: true,
                    Growth_Analysis: {
                      orderBy: { created_at: "desc" },
                    },
                    Disease_Analysis: {
                      orderBy: { created_at: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    const data = result.map((user) => ({
      user_id: user.user_ID,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,

      farms: user.Farm.map((farm) => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,

        areas: farm.Area.map((area) => ({
          area_id: area.area_id,
          area_name: area.area_name,

          devices: area.device_registrations.map((reg) => ({
            device_registration_id: reg.device_registrations_ID,
            status: reg.status,

            device: {
              device_id: reg.Device.device_ID,
              device_code: reg.Device.device_code,
              device_status: reg.Device.status,
            },

            // 🌱 วิเคราะห์การเจริญเติบโต
            growth_analysis: reg.Growth_Analysis.map((ga) => ({
              analysis_id: ga.analysis_id,
              growth_stage: ga.growth_stage,
              confidence: ga.confidence,
              advice: ga.advice,
              type: ga.type,
              image_url: ga.image_url,
              created_at: ga.created_at,
            })),

            // 🦠 วิเคราะห์โรคข้าว
            disease_analysis: reg.Disease_Analysis.map((da) => ({
              analysis_id: da.analysis_id,
              disease_name: da.disease_name,
              confidence: da.confidence,
              advice: da.advice,
              type: da.type,
              image_url: da.image_url,
              created_at: da.created_at,
              status: da.confidence > 0.7 ? "warning" : "safe",
            })),
          })),
        })),
      })),
    }));

    return res.status(200).json({
      data,
    });

  } catch (error) {
    console.error("Error getData_Growth_Analysis:", error);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};
export const getDashboardOverview = async (req, res) => {
  try {

    /* =========================
      1. SUMMARY COUNTS
    ========================= */

    const [
      totalDevices,
      registeredDevices,
      agricultureUsers,
      totalFarms,
      totalAreas,
      farmsAreaSum,
    ] = await Promise.all([
      prisma.Device.count(),

      prisma.device_registrations.count(),

      prisma.Account.count({
        where: {
          position: "Agriculture",
        },
      }),

      prisma.Farm.count(),

      prisma.Area.count(),

      prisma.Farm.aggregate({
        _sum: {
          area: true,
        },
      }),
    ]);

    /* =========================
      2. DEVICE + FARM + AREA
    ========================= */

    const devices = await prisma.Device.findMany({
      select: {
        device_ID: true,
        device_code: true,
        status: true,

        device_registrations: {
          select: {
            device_registrations_ID: true,
            status: true,

            Area: {
              select: {
                area_id: true,
                area_name: true,

                Farm: {
                  select: {
                    farm_id: true,
                    farm_name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    /* =========================
      FORMAT DEVICE DATA
    ========================= */

    const deviceData = devices.map((device) => {
      const registration = device.device_registrations?.[0];

      return {
        device_id: device.device_ID,
        device_code: device.device_code,
        device_status: device.status,

        farm: registration?.Area?.Farm
          ? {
            farm_id: registration.Area.Farm.farm_id,
            farm_name: registration.Area.Farm.farm_name,
          }
          : null,

        area: registration?.Area
          ? {
            area_id: registration.Area.area_id,
            area_name: registration.Area.area_name,
          }
          : null,
      };
    });

    /* =========================
      3. BAR CHART: Devices per Farm
    ========================= */

    const devicesPerFarm = await prisma.Farm.findMany({
      select: {
        farm_id: true,
        farm_name: true,
        Area: {
          select: {
            device_registrations: {
              select: {
                device_registrations_ID: true,
              },
            },
          },
        },
      },
    });

    const barChartDevicesPerFarm = devicesPerFarm.map((farm) => {
      const deviceCount = farm.Area.reduce(
        (sum, area) => sum + area.device_registrations.length,
        0
      );

      return {
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        device_count: deviceCount,
      };
    });

    /* =========================
      RESPONSE
    ========================= */

    return res.status(200).json({
      summary: {
        total_devices: totalDevices,
        registered_devices: registeredDevices,
        agriculture_users: agricultureUsers,
        total_farms: totalFarms,
        total_areas: totalAreas,
        total_area_rai: farmsAreaSum._sum.area || 0,
      },

      devices: deviceData,

      charts: {
        devices_per_farm: barChartDevicesPerFarm,
      },
    });

  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const getdata_Pump = async (req, res) => {
  try {

    const pumps = await prisma.pump.findMany({
      select: {
        pump_ID: true,
        pump_name: true,
        status: true,

        Account: {
          select: {
            first_name: true,
            last_name: true,
          }
        },

        Area: {
          select: {
            area_id: true,
            area_name: true,
          }
        }
      }
    });



    if (!pumps || pumps.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล Pump" });
    }

    return res.status(200).json(pumps);

  } catch (error) {
    console.error("Error getdata_Pump:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}



export const ON_OFF_Pupm = async (req, res) => {
  try {
    const { pump_ID, command } = req.body;

    // 1. validate input
    if (!pump_ID || !command) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (!["ON", "OFF"].includes(command)) {
      return res.status(400).json({ message: "command ต้องเป็น ON หรือ OFF เท่านั้น" });
    }

    // 2. หา pump
    const pump = await prisma.pump.findFirst({
      where: { pump_ID: Number(pump_ID) },
    });

    if (!pump) {
      return res.status(404).json({ message: "ไม่พบปั๊มในระบบ" });
    }

    // 3. ตรวจ mac_address
    if (!pump.mac_address) {
      return res.status(400).json({ message: "Pump ไม่มี mac_address" });
    }

    // 4. ส่ง MQTT command
    sendDeviceCommand_PUMP_OFF_ON(
      mqttClient,
      pump.mac_address,
      command
    );

    // 5. update status
    await prisma.pump.update({
      where: { pump_ID: pump.pump_ID },
      data: { status: command },
    });

    return res.status(200).json({
      message: `สั่งปั๊ม ${command} สำเร็จ`,
      pump_id: pump.pump_ID,
      status: command,
    });

  } catch (error) {
    console.error("Error ON_OFF_Pump:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// export const getdata_Analysis = async (req, res) => {
//   try {
//     const userId = req.body.userId;

//     if (!userId) {
//       return res.status(400).json({ message: "Invalid user ID" });
//     }

//     const systemSettings = await prisma.system_settings.findFirst({
//       orderBy: { updated_at: "desc" }
//     });

//     const farms = await prisma.Farm.findMany({
//       where: { user_ID: userId },
//       include: {
//         Area: {
//           include: {
//             device_registrations: {
//               include: {
//                 Device: true,
//                 User_Settings: true,

//                 // 🔥 ดึงย้อนหลัง 10 รายการสำหรับ timeline
//                 Growth_Analysis: {
//                   orderBy: { created_at: "desc" },
//                   take: 10,
//                 },
//                 Disease_Analysis: {
//                   orderBy: { created_at: "desc" },
//                   take: 10,
//                 },

//                 Permanent_Data: {
//                   include: { Sensor_Type: true },
//                   orderBy: { measured_at: "desc" },
//                   take: 40,
//                 }
//               }
//             }
//           }
//         }
//       }
//     });

//     const formattedData = farms.map(farm => ({
//       farm_id: farm.farm_id,
//       farm_name: farm.farm_name,
//       location: farm.address || "ไม่ระบุพิกัด",
//       rice_variety: farm.rice_variety || "ข้าวหอมมะลิ",

//       areas: farm.Area.map(area => {
//         const registration = area.device_registrations?.[0];
//         const latestGrowth = registration?.Growth_Analysis?.[0];
//         const latestDisease = registration?.Disease_Analysis?.[0];
//         const settings = registration?.User_Settings?.[0];
//         const user_settings = registration?.User_Settings[0];

//         // =========================
//         // 📊 Sensor History
//         // =========================
//         const rawHistory = [...(registration?.Permanent_Data || [])].reverse();

//         const sensor_history = Object.values(
//           rawHistory.reduce((acc, item) => {
//             const dateObj = new Date(item.measured_at);
//             const dateKey = dateObj.toISOString().split("T")[0];

//             if (!acc[dateKey]) {
//               acc[dateKey] = {
//                 timestamp: dateKey,
//                 time: dateObj.toLocaleDateString("th-TH", {
//                   day: "numeric",
//                   month: "short"
//                 }),
//                 N: null,
//                 P: null,
//                 K: null,
//                 S: null,
//                 W: null
//               };
//             }

//             const key = item.Sensor_Type?.key;
//             if (key) acc[dateKey][key] = Number(item.value);

//             return acc;
//           }, {})
//         ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

//         // =========================
//         // 📌 Sensor ล่าสุด
//         // =========================
//         const sensorMap = {};
//         registration?.Permanent_Data?.forEach(d => {
//           const key = d.Sensor_Type?.key;
//           if (key && !sensorMap[key]) {
//             sensorMap[key] = d.value;
//           }
//         });

//         // =========================
//         // 🌱 Growth Timeline
//         // =========================
//         const growthTimeline = (registration?.Growth_Analysis || [])
//           .slice()
//           .reverse()
//           .map(item => ({
//             stage: item.growth_stage,
//             confidence: item.confidence
//               ? Math.round(item.confidence * 100)
//               : 0,
//             advice: item.advice,
//             image_url: item.image_url,
//             date: new Date(item.created_at).toLocaleDateString("th-TH", {
//               day: "numeric",
//               month: "short"
//             })
//           }));

//         // =========================
//         // 🦠 Disease Timeline
//         // =========================
//         const diseaseTimeline = (registration?.Disease_Analysis || [])
//           .slice()
//           .reverse()
//           .map(item => ({
//             name: item.disease_name,
//             confidence: item.confidence
//               ? Math.round(item.confidence * 100)
//               : 0,
//             status: item.confidence > 0.7 ? "warning" : "safe",
//             advice: item.advice,
//             image_url: item.image_url,
//             date: new Date(item.created_at).toLocaleDateString("th-TH", {
//               day: "numeric",
//               month: "short"
//             })
//           }));

//         return {
//           area_id: area.area_id,
//           area_name: area.area_name || "ไม่ระบุชื่อ",
//           device_code: registration?.Device?.device_code || "N/A",
//           status: registration?.status || "offline",

//           thresholds: {
//             min: user_settings?.Water_level_min ??
//               user_settings?.water_level_min ?? 5,
//             max: user_settings?.water_level_max ??
//               user_settings?.water_level_max ?? 15
//           },

//           // ✅ Latest Growth
//           ...(latestGrowth && {
//             growth: {
//               stage: latestGrowth.growth_stage,
//               image_url: latestGrowth.image_url,
//               advice: latestGrowth.advice,
//               progress: latestGrowth.confidence
//                 ? Math.round(latestGrowth.confidence * 100)
//                 : 0
//             }
//           }),

//           // ✅ Latest Disease (แก้ bug image_url)
//           ...(latestDisease && {
//             disease: {
//               status: latestDisease.confidence > 0.7 ? "warning" : "safe",
//               name: latestDisease.disease_name,
//               advice: latestDisease.advice,
//               image_url: latestDisease.image_url
//             }
//           }),

//           // ✅ Timeline เพิ่มใหม่
//           ...(growthTimeline.length > 0 && {
//             growth_timeline: growthTimeline
//           }),

//           ...(diseaseTimeline.length > 0 && {
//             disease_timeline: diseaseTimeline
//           }),

//           sensor: {
//             water_level: sensorMap["water_level"] ?? 0,
//             n: sensorMap["n"] ?? 0,
//             p: sensorMap["p"] ?? 0,
//             k: sensorMap["k"] ?? 0,
//             humidity: sensorMap["humidity"] ?? 0,
//             temperature: sensorMap["temperature"] ?? 0
//           },

//           sensor_history
//         };
//       })
//     }));

//     return res.status(200).json(formattedData);

//   } catch (error) {
//     console.error("Error getdata_Analysis:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

export const getdata_Analysis = async (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const farms = await prisma.Farm.findMany({
      where: { user_ID: userId },
      include: {
        Area: {
          include: {
            device_registrations: {
              include: {
                Device: true,
                User_Settings: true,
                Growth_Analysis: {
                  orderBy: { created_at: "desc" },
                  take: 10
                },
                Disease_Analysis: {
                  orderBy: { created_at: "desc" },
                  take: 10
                },
                Permanent_Data: {
                  include: { Sensor_Type: true },
                  orderBy: { measured_at: "desc" },
                  take: 40
                }
              }
            }
          }
        }
      }
    });

    const formattedData = farms.map(farm => ({
      farm_id: farm.farm_id,
      farm_name: farm.farm_name,
      location: farm.address || "ไม่ระบุพิกัด",
      rice_variety: farm.rice_variety || "ข้าวหอมมะลิ",

      areas: farm.Area.map(area => {
        const registration = area.device_registrations?.[0];

        if (!registration) {
          return {
            area_id: area.area_id,
            area_name: area.area_name || "ไม่ระบุชื่อ",
            device_code: "N/A",
            status: "offline"
          };
        }

        const user_settings = registration?.User_Settings?.[0];

        /* =========================
           SAFE ARRAY
        ========================= */
        const growthList = Array.isArray(registration.Growth_Analysis)
          ? registration.Growth_Analysis
          : [];

        const diseaseList = Array.isArray(registration.Disease_Analysis)
          ? registration.Disease_Analysis
          : [];

        /* =========================
           FILTER VALID ONLY (🔥 แก้ปัญหาหลัก)
        ========================= */
        const latestValidGrowth = growthList
          .filter(item =>
            item &&
            item.confidence !== null &&
            item.confidence >= 0.6 &&
            item.growth_stage &&
            item.growth_stage !== "ไม่ผ่านเกณฑ์"
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const latestValidDisease = diseaseList
          .filter(item =>
            item &&
            item.confidence !== null &&
            item.confidence >= 0.7 &&
            item.disease_name &&
            item.disease_name !== "ไม่ผ่านเกณฑ์"
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        /* =========================
           TIMELINE (เอาเฉพาะตัวที่ผ่านล่าสุด)
        ========================= */
        const growthTimeline = latestValidGrowth
          ? [{
            stage: latestValidGrowth.growth_stage,
            confidence: Math.round(latestValidGrowth.confidence * 100),
            advice: latestValidGrowth.advice,
            image_url: latestValidGrowth.image_url,
            date: new Date(latestValidGrowth.created_at).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok"
            })
          }]
          : [];

        const diseaseTimeline = latestValidDisease
          ? [{
            name: latestValidDisease.disease_name,
            confidence: Math.round(latestValidDisease.confidence * 100),
            status: "warning",
            advice: latestValidDisease.advice,
            image_url: latestValidDisease.image_url,
            date: new Date(latestValidDisease.created_at).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok"
            })
          }]
          : [];

        /* =========================
           SENSOR ล่าสุด
        ========================= */
        const sensorMap = {};
        registration?.Permanent_Data?.forEach(d => {
          const key = d.Sensor_Type?.key;
          if (key && !sensorMap[key]) {
            sensorMap[key] = d.value;
          }
        });

        /* =========================
           SENSOR HISTORY
        ========================= */
        const rawHistory = Array.isArray(registration.Permanent_Data)
          ? [...registration.Permanent_Data].reverse()
          : [];

        const sensor_history = Object.values(
          rawHistory.reduce((acc, item) => {
            const dateObj = new Date(item.measured_at);
            const dateKey = dateObj.toISOString().split("T")[0];

            if (!acc[dateKey]) {
              acc[dateKey] = {
                timestamp: dateKey,
                time: dateObj.toLocaleDateString("th-TH"),
                N: null,
                P: null,
                K: null,
                S: null,
                W: null
              };
            }

            const key = item.Sensor_Type?.key;
            if (key) acc[dateKey][key] = Number(item.value);

            return acc;
          }, {})
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
          area_id: area.area_id,
          area_name: area.area_name || "ไม่ระบุชื่อ",
          device_code: registration.Device?.device_code || "N/A",
          status: registration.status || "offline",

          thresholds: {
            min: user_settings?.Water_level_min ?? 5,
            max: user_settings?.Water_level_mxm ?? 15
          },

          /* =========================
             🔥 แสดงเฉพาะที่ผ่านเท่านั้น
          ========================= */
          ...(latestValidGrowth && {
            latest_growth: {
              analysis_id: latestValidGrowth.analysis_id,
              growth_stage: latestValidGrowth.growth_stage,
              image_url: latestValidGrowth.image_url,
              created_at: latestValidGrowth.created_at,
              advice: latestValidGrowth.advice,
              confidence: latestValidGrowth.confidence
            }
          }),

          ...(latestValidDisease && {
            latest_disease: {
              disease_id: latestValidDisease.disease_id,
              disease_name: latestValidDisease.disease_name,
              image_url: latestValidDisease.image_url,
              created_at: latestValidDisease.created_at,
              advice: latestValidDisease.advice,
              confidence: latestValidDisease.confidence
            }
          }),

          ...(growthTimeline.length > 0 && {
            growth_timeline: growthTimeline
          }),

          ...(diseaseTimeline.length > 0 && {
            disease_timeline: diseaseTimeline
          }),

          sensor: {
            water_level: sensorMap["water_level"] ?? 0,
            n: sensorMap["n"] ?? 0,
            p: sensorMap["p"] ?? 0,
            k: sensorMap["k"] ?? 0,
            humidity: sensorMap["humidity"] ?? 0,
            temperature: sensorMap["temperature"] ?? 0
          },

          sensor_history
        };
      })
    }));

    return res.status(200).json(formattedData);

  } catch (error) {
    console.error("Error getdata_Analysis:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

function formatThaiDate(date) {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const d = new Date(date);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);

  return `${day} ${month} ${year}`;
}

export const scheduler_device_logs = async (req, res) => {
  try {

    const result = await prisma.$queryRaw`

    /* ================= DAILY SUMMARY ================= */

    SELECT
        'daily' AS level,
        DATE(l.created_at) AS log_date,

        NULL AS farm_name,
        NULL AS area_name,
        NULL AS device_code,
        NULL AS days_remaining,

        COUNT(DISTINCT l.device_code) AS total_devices,

        SUM(CASE WHEN l.status='queued' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN l.status='not_due' THEN 1 ELSE 0 END) AS not_due,
        SUM(CASE WHEN l.status='never_analyzed' THEN 1 ELSE 0 END) AS never_analyzed,
        SUM(CASE WHEN l.status='error' THEN 1 ELSE 0 END) AS errors

    FROM scheduler_device_logs l
    GROUP BY DATE(l.created_at)

    UNION ALL

    /* ================= DEVICE DETAIL ================= */

    SELECT
        'device' AS level,
        DATE(l.created_at) AS log_date,

        f.farm_name,
        a.area_name,
        l.device_code,

        CASE
            WHEN l.status = 'not_due' THEN l.days_remaining
            ELSE NULL
        END AS days_remaining,

        1 AS total_devices,

        CASE WHEN l.status='queued' THEN 1 ELSE 0 END AS queued,
        CASE WHEN l.status='not_due' THEN 1 ELSE 0 END AS not_due,
        CASE WHEN l.status='never_analyzed' THEN 1 ELSE 0 END AS never_analyzed,
        CASE WHEN l.status='error' THEN 1 ELSE 0 END AS errors

    FROM scheduler_device_logs l

    LEFT JOIN Device dv
        ON dv.device_code = l.device_code

    LEFT JOIN device_registrations dr
        ON dr.device_ID = dv.device_ID

    LEFT JOIN Area a
        ON a.area_id = dr.area_id

    LEFT JOIN Farm f
        ON f.farm_id = a.farm_id

    ORDER BY log_date DESC
    LIMIT 500

    `;

    const formatted = result.map(row => ({
      level: row.level,
      log_date: formatThaiDate(row.log_date),

      farm_name: row.farm_name ?? null,
      area_name: row.area_name ?? null,
      device_code: row.device_code ?? null,

      days_remaining:
        row.days_remaining !== null ? Number(row.days_remaining) : null,

      total_devices: Number(row.total_devices),
      queued: Number(row.queued),
      not_due: Number(row.not_due),
      never_analyzed: Number(row.never_analyzed),
      errors: Number(row.errors)
    }));

    res.json({
      success: true,
      total_rows: formatted.length,
      data: formatted
    });

  } catch (error) {

    console.error("Dashboard Summary Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูล Dashboard ได้"
    });

  }
};


export const capture = async (req, res) => {
  try {

    const { device_code } = req.body;

    if (!device_code) {
      return res.status(400).json({
        success: false,
        message: "device_code is required"
      });
    }

    const device = await prisma.Device.findFirst({
      where: {
        device_code: device_code
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    sendDeviceCommand_takePhoto(mqttClient, device_code);

    return res.json({
      success: true,
      message: "Capture command sent",
      device_code
    });

  } catch (error) {

    console.error("Capture Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });

  }
};