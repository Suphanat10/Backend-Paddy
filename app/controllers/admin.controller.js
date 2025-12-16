import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs"; 


 export const update_device = async (req, res) => {
  try {
      const { device_id, status , device_code }  = req.body;

       if(!device_id || !status || !device_code){
        return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์และสถานะ" });
       }

       const device = await prisma.device.findFirst({
        where: { device_id }
       });

       if(!device){
        return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
       }

       const updatedDevice = await prisma.device.update({
         data :{
            device_code : device_code,
            status : status
         },
         where: { device_id }
      });
        res.status(200).json({ 
          message: "อุปกรณ์ถูกอัปเดตแล้ว",
          device : updatedDevice

        });
    } catch (error) {
      console.error("Error updating device:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
};
export const delete_device = async (req, res) => {
  try {
      const { device_id }  = req.body;

       if(!device_id){
        return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
       }

       const device = await prisma.device.findFirst({
        where: { device_id }
       });

       if(!device){
        return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
       }

       const deletedDevice = await prisma.device.delete({
         where: { device_id }
      });
        res.status(200).json({ 
          message: "อุปกรณ์ถูกลบแล้ว",
          device : deletedDevice
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


export const  delete_user = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "กรุณากรอกรหัสผู้ใช้งาน" });
    }

    const user = await prisma.Account.findFirst({
      where: parseInt(user_id)
    });

    if (!user) {
      return res.status(400).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const deletedUser = await prisma.Account.delete({
      where: { user_ID: parseInt(user_id) }
    });
    res.status(200).json({
      message: "ผู้ใช้งานถูกลบแล้ว",
      user: deletedUser
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




export const updateProfile = async (req, res) => {
  try {
      const user_id = req.body.user_id;

      const { first_name, last_name, phone_number, gender , email } = req.body;

      if(!user_id) {
        return res.status(400).json({ message: "User ID missing in token" });
      }

      if(!first_name || !last_name) {
         return res.status(400).json({ message: "กรุณากรอกชื่อและนามสกุล" });
      }

      if(!phone_number) {
         return res.status(400).json({ message: "กรุณากรอกเบอร์โทรศัพท์" });
      }

      if(!email) {
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



export const  createFarmArea = async (req, res) => {
  try {
   const user_id = req.body.user_id;
   const { area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;

   if(!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
   }  

   if(!area || !farm_name || !address  || !rice_variety || !planting_method || !soil_type || !water_management) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
   }
   
   const  farm = await prisma.Farm.findFirst({
      where: {
         farm_name: farm_name,
         user_ID: user_id
      }
   });

   if(farm) {
      return res.status(400).json({ message: "ชื่อแปลงนี้มีอยู่ในระบบแล้ว" });
   }

   const newFarmArea = await prisma.Farm.create({
      data: {
         user_ID: user_id,
         area:parseFloat(area),
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

   
      if(!farm_id) {
         return res.status(400).json({ message: "Farm Area ID is required" });
      }

      const farmArea = await prisma.Farm.findFirst({
         where: {
            farm_id: farm_id,
         }
      });

      if(!farmArea) {
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


export const  createSubArea = async (req, res) => {
  try {

   const { farm_id, area_name } = req.body;


   if(!farm_id || !area_name ) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
   }
   const  farm = await prisma.Farm.findFirst({
      where: {
         farm_id: farm_id,
      }
   });

   if(!farm) {
      return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
   }

   const subArea = await prisma.Area.findFirst({
      where: {
         area_name: area_name,
      }
   });

   if(subArea) {  
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
   
      if(!area_id) {
         return res.status(400).json({ message: "Sub Area ID is required" });
      }
      const subArea = await prisma.Area.findFirst({
         where: {
            area_id: area_id
         }
      });
      if(!subArea) {
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


      if(!area_id) {
         return res.status(400).json({ message: "Sub Area ID is required" });
      }
      const subArea = await prisma.Area.findFirst({
         where: {
            area_id: area_id ,
         }
      });
      if(!subArea) {
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
      const devices = await prisma.Device.findMany({
         orderBy: {
            created_at: "desc"
         }
      }); 

      if(!devices) {
         return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
      }
      res.status(200).json(devices);
   }
   catch (error) {
      console.error("Error getting devices:", error);
      res.status(500).json({ message: "Internal server error" });
   }
};

export const createDevice = async (req, res) => {
   try {
      const { device_code} = req.body;

      if(!device_code) {
         return res.status(400).json({ message: "Device Code is required" });
      }

      const device = await prisma.Device.findFirst({
         where: {
            device_code: device_code,
         }
      });

      if(device) {
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
      const device_id = req.body.device_id;

      if(!device_id) {
         return res.status(400).json({ message: "Device ID is required" });
      }

      const device = await prisma.Device.findFirst({
         where: {
            device_ID: device_id,
         }
      });

      if(!device) {
         return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้" });
      }

      await prisma.Device.delete({
         where: { device_ID: device_id }
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

      if(!device_id) {
         return res.status(400).json({ message: "Device ID is required" });
      }

      const device = await prisma.Device.findFirst({
         where: {
            device_ID: device_id,
         }
      });

      if(!device) {
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

      if(!deviceRegistrations) {
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
    const { device_code } = req.body;


    if (!device_code)
      return res.status(400).json({ message: "กรุณาระบุรหัสอุปกรณ์ (device_code)" });

   
    const device = await prisma.Device.findFirst({
      where: { device_code }
    });

    if (!device) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });
    }


    const registration = await prisma.device_registrations.findFirst({
      where: { device_ID: device.device_ID },
      include: {
        Area: true,
        Account: true,
        Device: true
      }
    });

    if (!registration) {
      return res.status(404).json({ message: "อุปกรณ์ยังไม่ได้ลงทะเบียน" });
    }




    const permanentData = await prisma.Permanent_Data.findMany({
      where: { device_registrations_ID: registration.device_registrations_ID },
      include: { Sensor_Type: true },
      orderBy: { measured_at: "desc" }
    });

    if (!permanentData || permanentData.length === 0) {
      return res.status(404).json({ message: "ยังไม่มีข้อมูลเซ็นเซอร์ของอุปกรณ์นี้" });
    }

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
        email: registration.Account.email
      },
      sensor_data: permanentData.map(item => ({
        id: item.permanent_ID,
        sensor_type: item.Sensor_Type?.name,
        value: item.value,
        unit: item.unit,
        measured_at: item.measured_at
      }))
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

export const update_system_settings = async (req, res) => {
  try {
      const  {data_send_interval_days , growth_analysis_period ,water_level_min , 	water_level_max} = req.body;

      if(!data_send_interval_days || !growth_analysis_period || !water_level_min || !water_level_max){
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ถูกต้อง" });
      }

      const system_settings = await prisma.system_settings.findFirst({

      });

      if(!system_settings){
        return res.status(404).json({ message: "ไม่พบข้อมูล" });
      }

      const updated_system_settings = await prisma.system_settings.update({
        where: { system_settings_ID: system_settings.system_settings_ID },
        data: {
          data_send_interval_days,
          growth_analysis_period,
          water_level_min,
          water_level_max,
          updated_at : new Date()
        },
      });

      return res.status(200).json(updated_system_settings);

  } catch (error) {
    console.error("Error updating system settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};