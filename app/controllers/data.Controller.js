import { prisma } from "../../lib/prisma.js";

export const getDevicesByUser = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID missing in token",
        devices: []
      });
    }

    const devices = await prisma.device_registrations.findMany({
      where: { user_ID: user_id },
      select: {
        device_registrations_ID: true,
        status: true,
        registered_at: true,

        Device: {
          select: {
            device_ID: true,
            device_code: true,
            status: true,
            created_at: true
          }
        },

        Area: {
          select: {
            area_id: true,
            area_name: true,
            Farm: {
              select: {
                farm_id: true,
                farm_name: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!devices || devices.length === 0) {
      return res.status(200).json([]);  // ⛔ สำคัญมาก: ต้องส่ง array ว่าง
    }

    // ป้องกัน Device เป็น null
    const result = devices.map(d => ({
      id: d.Device?.device_code || null,
      device_reg_id: d.device_registrations_ID,
      status: d.status,
      lastUpdate: null,
      user_id: user_id,

      farm: d.Area?.Farm ? {
        name: d.Area.Farm.farm_name,
        location: d.Area.area_name,
        address: d.Area.Farm.address
      } : null,

      sensor: []
    }));

    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ Error fetching devices:", error);

    // ส่ง array ว่างเสมอเพื่อกันเว็บพัง
    return res.status(500).json([]);
  }
};




export const getdatastatic = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const devices = await prisma.device_registrations.findMany({
      where: { user_ID: user_id },
      include: {
        Area: true,
      }
    });

    if (devices.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการลงทะเบียนอุปกรณ์" }); 
    }

    const results = [];

    for (const device of devices) {
      const sensorList = await prisma.permanent_Data.findMany({
        where: { device_registrations_ID: device.device_registrations_ID },
        distinct: ["sensor_type"],
        include: { Sensor_Type: true }
      });

      let stats = {};

      for (const sensor of sensorList) {
        const sensorType = sensor.sensor_type;
        const sensorName = sensor.Sensor_Type.name;

        const latest = await prisma.permanent_Data.findFirst({
          where: {
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          include: { Sensor_Type: true },
          orderBy: { measured_at: "desc" }
        });


        const allData = await prisma.permanent_Data.findMany({
          where: {
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          orderBy: { measured_at: "asc" }
        });

 
        const agg = await prisma.permanent_Data.aggregate({
          where: { 
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          _min: { value: true },
          _max: { value: true },
          _avg: { value: true }
        });

        stats[sensorName] = {
          latest: latest?.value || null,
          min: agg._min.value,
          max: agg._max.value,
          avg: agg._avg.value,
          unit: latest?.unit || null,
          all_data: allData.map(d => ({
            value: d.value,
            measured_at: d.measured_at,
            unit: d.unit
          }))
        };
      }

      results.push({
        device_registrations_ID: device.device_registrations_ID,
        device_ID: device.device_ID,
        device_status: device.status,
        area_name: device.Area.area_name,
        stats
      });
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}



//isAdmin

export const getdataPersonal = async (req, res) => {
  try {
    
    const user =await prisma.Account.findFirst({
       select:{
         user_ID : true,
         first_name : true,
         last_name : true,
         position : true,
         birth_date : true,
         gender : true,
         phone_number : true,
         email : true,
         Farm : {
           select:{
             farm_id : true,
             farm_name : true,
             rice_variety : true,
             planting_method : true,
             soil_type : true,
             area : true,
             water_management : true,
             address : true,
               Area : {
                 select:{
                   area_id : true,
                   area_name : true,
                   
                 }
               }
             
           }
         }
       },
     });


    if(!user){
      return res.status(404).json({ message: "User not found!" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export const getdata_Device = async (req, res) => {
  try {
     const Device = await prisma.Device.findMany({
       select:{
         device_ID : true,
         device_code : true,
         status : true,
         created_at : true
       },
     });

    if(!Device){
      return res.status(404).json({ message: "Device not found!" });
    }
    
    res.status(200).json(Device);

    
  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
   

export const  getdata_history = async (req, res) => {
  try {
      const user = req.user?.id;

      if (!user) {
        return res.status(400).json({ message: "User ID missing in token" });
      }

    const history = await prisma.Logs.findMany({
  where: { user_ID: user },
  orderBy: {
    created_at: "desc"
  }
});


      if (!history) {
        return res.status(404).json({ message: "History not found!" });
      }

      res.status(200).json(history);



  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export const GetData_devicebyID = async (req, res) => { 
  try {
    const { device_code } = req.body;
    const user_id = req.user?.id;

    if (!device_code)
      return res.status(400).json({ message: "กรุณาระบุรหัสอุปกรณ์ (device_code)" });

    if (!user_id)
      return res.status(400).json({ message: "ไม่พบข้อมูลผู้ใช้" });

   
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


    if (registration.user_ID !== user_id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงอุปกรณ์นี้" });
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


export const getData_dashboard = async (req, res) => {
  try {
    const user = req.user?.id;

    if (!user) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const data = await prisma.device_registrations.findMany({
      where: { user_ID: user },
      include: {
        Device: true,
        Area: {
          include: {
            Farm: true   // ✔ ดึงฟาร์มผ่าน Area (ถูกต้อง)
          }
        },
        Account: true
      }
    });

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ในระบบ" });
    }

    const response = data.map(item => ({
      // ข้อมูลอุปกรณ์
      device_id: item.device_ID,
      device_code: item.Device.device_code,
   
      registered_at: item.registered_at,

      // ข้อมูลพื้นที่เพาะปลูก (Area)
      area_id: item.Area?.area_id ?? null,
      area_name: item.Area?.area_name ?? null,

      // ข้อมูลฟาร์ม (Farm)
      farm_id: item.Area?.Farm?.farm_id ?? null,
      farm_name: item.Area?.Farm?.farm_name ?? null,
      farm_location: item.Area?.Farm?.location ?? null,

      // เจ้าของอุปกรณ์ (Account)
      owner_id: item.Account?.user_ID ?? null,
      owner_name: `${item.Account?.first_name ?? ""} ${item.Account?.last_name ?? ""}`,
      owner_email: item.Account?.email ?? null
    }));

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error getData_dashboard:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getdata_Growth_Analysis = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }
    const data = await prisma.device_registrations.findMany({
      where: { user_ID: userId },
      include: {
        Device: true,
        Area: {
          include: {
            Farm: true,
          },
        },
        Growth_Analysis: {
          orderBy: { created_at: "desc" }, 
        },
      },
    });

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ในระบบ" });
    }


    const response = data.map((item) => ({
      device_registrations_id: item.device_registrations_ID,

    
      device_id: item.device_ID,
      device_code: item.Device?.device_code ?? null,
      device_status: item.Device?.status ?? null,
      registered_at: item.registered_at,

      
      area_id: item.Area?.area_id ?? null,
      area_name: item.Area?.area_name ?? null,

      farm_id: item.Area?.Farm?.farm_id ?? null,
      farm_name: item.Area?.Farm?.farm_name ?? null,
      farm_address: item.Area?.Farm?.address ?? null,

      growth_analysis: item.Growth_Analysis.map((ga) => ({
        analysis_id: ga.analysis_id,
        growth_stage: ga.growth_stage,
        image_url: ga.image_url,
        created_at: ga.created_at,
      })),
    }));

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error getdata_Growth_Analysis:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getdata_Pump = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    // เริ่มดึงจาก Farm เพื่อให้ได้ฟาร์มทั้งหมดของ User คนนั้น
    const farms = await prisma.farm.findMany({
      where: { user_ID: userId },
      include: {
        Area: {
          include: {
            Pump: {
              orderBy: { created_at: "desc" },
            },
            device_registrations: {
              include: {
                Device: true
              }
            }
          },
        },
      },
    });

    if (!farms || farms.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลฟาร์มในระบบ" });
    }

    // จัดโครงสร้าง Response ให้เข้าใจง่าย
    const response = farms.flatMap((farm) => 
      farm.Area.map((area) => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        farm_address: farm.address,
        
        area_id: area.area_id,
        area_name: area.area_name,

        // ข้อมูลอุปกรณ์ (ถ้ามีติดตั้งในพื้นที่นี้)
        devices: area.device_registrations.map((reg) => ({
          device_registrations_id: reg.device_registrations_ID,
          device_id: reg.device_ID,
          device_code: reg.Device?.device_code,
          device_status: reg.Device?.status,
          registered_at: reg.registered_at,
        })),

        // ข้อมูลปั๊ม (ดึงมาจากความสัมพันธ์ Area -> Pump)
        pumps: area.Pump.map((p) => ({
          pump_id: p.pump_ID, // ใช้ pump_ID ตาม schema
          pump_name: p.pump_name,
          pump_status: p.status, // ใช้ status ตาม schema
          mac_address: p.mac_address,
          created_at: p.created_at,
        })),
      }))
    );

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error getdata_Pump:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};