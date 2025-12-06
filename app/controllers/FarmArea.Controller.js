import { prisma } from "../../lib/prisma.js";


// -----------------------------------------------------การจัดการพื้นที่ฟาร์ม-------------------------------------------------------------------


export const  createFarmArea = async (req, res) => {
  try {
   const user_id = req.user?.id;
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
      const user_id = req.user?.id;
      const { farm_id, area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;

      if(!user_id) {
         return res.status(400).json({ message: "User ID missing in token" });
      }
      if(!farm_id) {
         return res.status(400).json({ message: "Farm Area ID is required" });
      }

      const farmArea = await prisma.Farm.findFirst({
         where: {
            farm_id: farm_id,
            user_ID: user_id
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
      await prisma.logs.create({
         data: {
            Account: {
               connect: { user_ID: user_id }
            },
            action: "update_farm_area",
            ip_address: req.ip,
            created_at: new Date(),
         },
      });
   }
   catch (error) {
      console.error("Error updating farm area:", error);
      res.status(500).json({ message: "Internal server error" });
   }
};

export const deleteFarmArea = async (req, res) => {
   try {
      const farm_id = req.body.farm_id;

      if(!farm_id) {
         return res.status(400).json({ message: "Farm Area ID is required" });
      }


      const farmArea = await prisma.Farm.findFirst({
         where: {
            farm_id: farm_id
         }
      });
      if(!farmArea) {
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

      if(!user_id) {
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



      if(farmAreas.length === 0) {
         return res.status(404).json({ message: "ไม่พบแปลงเกษตร" });
      }


      const result  = farmAreas.map(farm => ({
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

      res.status(200).json(result );
   } catch (error) {
      console.error("Error fetching farm areas:", error);
      res.status(500).json({ message: "Internal server error" });
   }

};

export const  createSubArea = async (req, res) => {
  try {
   const user_id = req.user?.id;
   const { farm_id, area_name } = req.body;
   if(!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
   }

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
   await prisma.logs.create({
      data: {
         Account: {
            connect: { user_ID: user_id }
         },
         action: "create_sub_area",
         ip_address: req.ip,
         created_at: new Date(),
      },
   });
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

      if(!user_id) {
         return res.status(400).json({ message: "User ID missing in token" });
      }

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


export const updateSubArea = async (req, res) => {
   try {
      const user_id = req.user?.id;
      const { area_id, area_name } = req.body;
      if(!user_id) {
         return res.status(400).json({ message: "User ID missing in token" });
      }

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
      where: { device_ID: device.device_ID }
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
        where: { device_ID:  parseInt(device.device_ID) },
        data: { status: "registered" }
      }),

      prisma.user_Settings.create({
        data: {
          device_registrations_ID: newRegistration.device_registrations_ID,
              data_send_interval_days: "1",  // ⭐ ค่า default เช่น ส่งข้อมูลทุก 1 วัน

          Water_level_min: 10,
          Water_level_mxm: 15
        }
      }),

      prisma.logs.create({
        data: {
          user_ID: user_id,
          action: "register_device_to_farm_area",
          ip_address: req.ip
        }
      })
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
