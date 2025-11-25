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
   
   const  farm = await prisma.FarmArea.FindFirst({
      where: {
         farm_name: farm_name,
         user_ID: user_id
      }
   });

   if(farm) {
      return res.status(400).json({ message: "ชื่อแปลงนี้มีอยู่ในระบบแล้ว" });
   }

   const newFarmArea = await prisma.FarmArea.create({
      data: {
         user_ID: user_id,
         area,
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
      const { farm_area_id, area, farm_name, rice_variety, planting_method, soil_type, water_management, address } = req.body;

      if(!user_id) {
         return res.status(400).json({ message: "User ID missing in token" });
      }
      if(!farm_area_id) {
         return res.status(400).json({ message: "Farm Area ID is required" });
      }

      const farmArea = await prisma.FarmArea.FindFirst({
         where: {
            farm_area_ID: farm_area_id,
            user_ID: user_id
         }
      });

      if(!farmArea) {
         return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
      }
      const updatedFarmArea = await prisma.FarmArea.update({
         where: { farm_area_ID: farm_area_id },
         data: {
            area,
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
      const { farm_area_id } = req.body;

      if(!farm_area_id) {
         return res.status(400).json({ message: "Farm Area ID is required" });
      }
      const farmArea = await prisma.FarmArea.FindFirst({
         where: {
            farm_area_ID: farm_area_id
         }
      });
      if(!farmArea) {
         return res.status(404).json({ message: "ไม่พบแปลงเกษตรนี้" });
      }
      await prisma.FarmArea.delete({
         where: { farm_area_ID: farm_area_id }
      });
      res.status(200).json({ message: "ลบแปลงเกษตรสำเร็จ" });
   }
   
   catch (error) {
      console.error("Error deleting farm area:", error);
      res.status(500).json({ message: "Internal server error" });
   }
};


// --------------------------------------------------------การจัดการแปลงเกษตร---------------------------------------------------------------------




