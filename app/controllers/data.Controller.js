import { type } from "node:os";
import { prisma } from "../../lib/prisma.js";


export const getDevicesByUser = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        message: "User ID missing",
        data: []
      });
    }

    const devices = await prisma.device_registrations.findMany({
      where: { user_ID: user_id },
      select: {
        device_registrations_ID: true,
        status: true,

        Device: {
          select: {
            device_code: true,
            status: true
          }
        },

        Area: {
          select: {
            area_id: true,
            area_name: true,
            Farm: {
              select: {
                farm_name: true,
                address: true
              }
            },
            Pump: true
          }
        }
      }
    });

    // 🔥 รวม pump ไม่ให้ซ้ำ
    const pumpMap = new Map();

    devices.forEach(d => {
      d.Area?.Pump?.forEach(p => {
        pumpMap.set(p.pump_ID, {
          pump_id: p.pump_ID,
          name: p.pump_name,
          mac: p.mac_address,
          status: p.status
        });
      });
    });

    const result = {
      devices: devices.map(d => ({
        id: d.Device?.device_code,
        status: d.Device?.status,
        farm: d.Area?.Farm?.farm_name,
        area: d.Area?.area_name
      })),

      // ✅ pump มีแค่ตัวเดียว
      pumps: Array.from(pumpMap.values())
    };

    return res.json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json([]);
  }
};

// export const getDevicesByUser = async (req, res) => {
//   try {
//     const user_id = req.user?.id;

//     if (!user_id) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID missing in token",
//         devices: []
//       });
//     }

//     // const devices = await prisma.device_registrations.findMany({
//     //   where: { user_ID: user_id },
//     //   select: {
//     //     device_registrations_ID: true,
//     //     status: true,
//     //     registered_at: true,

//     //     Device: {
//     //       select: {
//     //         device_ID: true,
//     //         device_code: true,
//     //         status: true,
//     //         created_at: true
//     //       }
//     //     },

//     //     Area: {
//     //       select: {
//     //         area_id: true,
//     //         area_name: true,
//     //         Farm: {
//     //           select: {
//     //             farm_id: true,
//     //             farm_name: true,
//     //             address: true
//     //           }
//     //         }
//     //       }
//     //     }
//     //   }
//     // });

//     const devices = await prisma.device_registrations.findMany({
//       where: { user_ID: user_id },
//       select: {
//         device_registrations_ID: true,
//         status: true,
//         registered_at: true,

//         Device: {
//           select: {
//             device_ID: true,
//             device_code: true,
//             status: true,
//             created_at: true
//           }
//         },

//         Area: {
//           select: {
//             area_id: true,
//             area_name: true,

//             // ✅ Pump ที่อยู่ใน Area นี้
//             Pump: {
//               select: {
//                 pump_ID: true,
//                 pump_name: true,
//                 mac_address: true,
//                 status: true,
//                 created_at: true,
//                 user_ID: true
//               }
//             },

//             Farm: {
//               select: {
//                 farm_id: true,
//                 farm_name: true,
//                 address: true
//               }
//             }
//           }
//         },

//         // ✅ Pump ของ user (กรณีไม่ได้ผูก area หรืออยากรู้ทั้งหมด)
//         Account: {
//           select: {
//             Pump: {
//               select: {
//                 pump_ID: true,
//                 pump_name: true,
//                 mac_address: true,
//                 status: true,
//                 created_at: true,
//                 area_id: true
//               }
//             }
//           }
//         }
//       }
//     });

//     if (!devices || devices.length === 0) {
//       return res.status(200).json([]);
//     }

//     // const result = devices.map(d => ({
//     //   id: d.Device?.device_code || null,
//     //   device_reg_id: d.device_registrations_ID,
//     //   status: d.status,
//     //   lastUpdate: null,
//     //   user_id: user_id,

//     //   farm: d.Area?.Farm ? {
//     //     name: d.Area.Farm.farm_name,
//     //     location: d.Area.area_name,
//     //     address: d.Area.Farm.address
//     //   } : null,

//     //   sensor: []
//     // }));

//     const result = devices.map(d => ({
//       id: d.Device?.device_code || null,
//       device_reg_id: d.device_registrations_ID,
//       status: d.status,
//       lastUpdate: null,
//       user_id: user_id,

//       farm: d.Area?.Farm ? {
//         name: d.Area.Farm.farm_name,
//         location: d.Area.area_name,
//         address: d.Area.Farm.address
//       } : null,

//       // ✅ รวม pump (เอาจาก Area เป็นหลัก)
//       pumps: d.Area?.Pump?.map(p => ({
//         pump_id: p.pump_ID,
//         name: p.pump_name,
//         mac: p.mac_address,
//         status: p.status,
//         created_at: p.created_at
//       })) || [],

//       // ✅ fallback: ถ้า area ไม่มี pump → ใช้ของ user
//       ...((!d.Area?.Pump || d.Area.Pump.length === 0) && d.Account?.Pump ? {
//         pumps: d.Account.Pump.map(p => ({
//           pump_id: p.pump_ID,
//           name: p.pump_name,
//           mac: p.mac_address,
//           status: p.status,
//           created_at: p.created_at
//         }))
//       } : {}),

//       sensor: []
//     }));

//     return res.status(200).json(result);

//   } catch (error) {
//     console.error("❌ Error fetching devices:", error);

//     // ส่ง array ว่างเสมอเพื่อกันเว็บพัง
//     return res.status(500).json([]);
//   }
// };




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

    const user = await prisma.Account.findFirst({
      select: {
        user_ID: true,
        first_name: true,
        last_name: true,
        position: true,
        birth_date: true,
        gender: true,
        phone_number: true,
        email: true,
        Farm: {
          select: {
            farm_id: true,
            farm_name: true,
            rice_variety: true,
            planting_method: true,
            soil_type: true,
            area: true,
            water_management: true,
            address: true,
            Area: {
              select: {
                area_id: true,
                area_name: true,

              }
            }

          }
        }
      },
    });


    if (!user) {
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
      select: {
        device_ID: true,
        device_code: true,
        status: true,
        created_at: true
      },
    });

    if (!Device) {
      return res.status(404).json({ message: "Device not found!" });
    }

    res.status(200).json(Device);


  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export const getdata_history = async (req, res) => {
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

// export const GetData_devicebyID = async (req, res) => {
//   try {
//     const { device_code } = req.body;
//     const user_id = req.user?.id;

//     if (!device_code)
//       return res.status(400).json({ message: "กรุณาระบุรหัสอุปกรณ์ (device_code)" });

//     if (!user_id)
//       return res.status(400).json({ message: "ไม่พบข้อมูลผู้ใช้" });

//     const device = await prisma.Device.findFirst({
//       where: { device_code }
//     });

//     if (!device)
//       return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในระบบ" });

//     const registration = await prisma.device_registrations.findFirst({
//       where: { device_ID: device.device_ID },
//       include: {
//         Area: true,
//         Account: true
//       }
//     });

//     if (!registration)
//       return res.status(404).json({ message: "อุปกรณ์ยังไม่ได้ลงทะเบียน" });

//     if (registration.user_ID !== user_id)
//       return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงอุปกรณ์นี้" });

//     // 🔥 จำกัดย้อนหลัง 30 วัน (แก้เป็น 7 วันได้)
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - 30);

//     const permanentData = await prisma.Permanent_Data.findMany({
//       where: {
//         device_registrations_ID: registration.device_registrations_ID,
//         measured_at: { gte: startDate }
//       },
//       include: { Sensor_Type: true },
//       orderBy: { measured_at: "asc" } // ✅ เรียงถูกตั้งแต่ backend
//     });

//     if (!permanentData.length)
//       return res.status(404).json({ message: "ยังไม่มีข้อมูลเซ็นเซอร์ของอุปกรณ์นี้" });

//     // ✅ รวมข้อมูลตามวัน
//     const grouped = {};

//     permanentData.forEach(item => {
//       const dateKey = item.measured_at.toISOString().split("T")[0];

//       if (!grouped[dateKey]) {
//         grouped[dateKey] = {
//           timestamp: dateKey,
//           time: new Date(dateKey).toLocaleDateString("th-TH", {
//             day: "numeric",
//             month: "short"
//           }),
//           N: null,
//           P: null,
//           K: null,
//           S: null,
//           W: null
//         };
//       }

//       const key = item.Sensor_Type?.key;
//       if (key) {
//         grouped[dateKey][key] = item.value;
//       }
//     });

//     const sensor_history = Object.values(grouped);

//     const response = {
//       device: {
//         device_id: device.device_ID,
//         device_code: device.device_code,
//         status: registration.status,
//         registered_at: registration.registered_at,
//       },
//       area: {
//         id: registration.Area.area_id,
//         name: registration.Area.area_name,
//       },
//       owner: {
//         user_id: registration.Account.user_ID,
//         first_name: registration.Account.first_name,
//         last_name: registration.Account.last_name,
//         email: registration.Account.email
//       },
//       sensor_history
//     };

//     return res.status(200).json(response);

//   } catch (error) {
//     console.error("Error GetData_devicebyID:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

export const GetData_devicebyID = async (req, res) => {
  try {
    const { device_code } = req.body;
    const user_id = req.user?.id;

    if (!device_code) {
      return res.status(400).json({ message: "กรุณาระบุ device_code" });
    }

    if (!user_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ หา device + registration ในครั้งเดียว
    const registration = await prisma.device_registrations.findFirst({
      where: {
        Device: { device_code },
        user_ID: user_id
      },
      include: {
        Device: true,
        Area: true,
        Account: true
      }
    });

    if (!registration) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ หรือไม่มีสิทธิ์" });
    }

    // 🔥 ย้อนหลัง 30 วัน


    const permanentData = await prisma.Permanent_Data.findMany({
      where: {
        device_registrations_ID: registration.device_registrations_ID,

      },
      include: { Sensor_Type: true },
      orderBy: { measured_at: "asc" }
    });

    if (!permanentData.length) {
      return res.status(404).json({ message: "ไม่มีข้อมูลเซ็นเซอร์" });
    }

    // ✅ รวมข้อมูลแบบ "ค่าเฉลี่ยต่อวัน"
    const grouped = {};

    permanentData.forEach(item => {
      // ✅ ใช้ timezone ไทย
      const date = new Date(item.measured_at);
      const dateKey = date.toLocaleDateString("sv-SE"); // YYYY-MM-DD

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          timestamp: dateKey,
          time: date.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short"
          }),
          N: [],
          P: [],
          K: [],
          S: [],
          W: []
        };
      }

      const key = item.Sensor_Type?.key;
      if (key && grouped[dateKey][key]) {
        grouped[dateKey][key].push(item.value);
      }
    });

    // ✅ แปลงเป็นค่าเฉลี่ย
    const sensor_history = Object.values(grouped).map(day => {
      const avg = arr =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      return {
        timestamp: day.timestamp,
        time: day.time,
        N: avg(day.N),
        P: avg(day.P),
        K: avg(day.K),
        S: avg(day.S),
        W: avg(day.W)
      };
    });

    return res.status(200).json({
      device: {
        device_id: registration.Device.device_ID,
        device_code: registration.Device.device_code,
        status: registration.status,
        registered_at: registration.registered_at
      },
      area: {
        id: registration.Area.area_id,
        name: registration.Area.area_name
      },
      owner: {
        user_id: registration.Account.user_ID,
        first_name: registration.Account.first_name,
        last_name: registration.Account.last_name,
        email: registration.Account.email
      },
      sensor_history
    });

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
            Farm: true,
            Pump: true
          }
        },
        Account: true
      }
    });

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์ในระบบ" });
    }

    console.log(data);

    const response = data.map(item => ({
      // ข้อมูลเดิม...
      device_id: item.device_ID,
      device_code: item.Device.device_code,
      registered_at: item.registered_at,

      area_id: item.Area?.area_id ?? null,
      area_name: item.Area?.area_name ?? null,

      farm_id: item.Area?.Farm?.farm_id ?? null,
      farm_name: item.Area?.Farm?.farm_name ?? null,

      owner_id: item.Account?.user_ID ?? null,
      owner_name: `${item.Account?.first_name ?? ""} ${item.Account?.last_name ?? ""}`,

      // --- ปรับแก้ส่วน Pump (ดึงตัวแรก [0]) ---
      // สังเกตการใช้เครื่องหมาย ? เพื่อกัน Error กรณี Array ว่าง
      pump_id: item.Area?.Pump?.[0]?.pump_ID ?? null,
      pump_name: item.Area?.Pump?.[0]?.pump_name ?? null,

      status: item.Area?.Pump?.[0]?.status ?? null,
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
        Disease_Analysis: {
          orderBy: { created_at: "desc" },
        }
      },
    });






    // if (!data || data.length === 0) {
    //   return res.status(404).json({ message: "ไม่พบอุปกรณ์ในระบบ" });
    // }


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
        type: ga.type,
        Link: ga.link,
        confidence: ga.confidence,
        advice: ga.advice,
        created_at: ga.created_at,
      })),

      Disease_Analysis: item.Disease_Analysis.map((ga) => ({
        disease_id: ga.disease_id,
        disease_name: ga.disease_name,
        image_url: ga.image_url,
        type: ga.type,
        Link: ga.link,
        confidence: ga.confidence,
        advice: ga.advice,
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

// export const getdata_Analysis = async (req, res) => {
//   try {
//     const userId = req.user?.id;

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
//           gps: {
//             latitude: registration?.Device?.latitude ?? null,
//             longitude: registration?.Device?.longitude ?? null,
//           },
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    /* ===============================
       1. Scheduler ล่าสุด
    =============================== */
    const schedulerLogs = await prisma.$queryRaw`
      WITH latest_logs AS (
        SELECT 
          device_code,
          status,
          days_remaining,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY device_code 
            ORDER BY created_at DESC
          ) as rn
        FROM scheduler_device_logs
      )
      SELECT device_code, status, days_remaining, created_at
      FROM latest_logs
      WHERE rn = 1
    `;

    const schedulerMap = {};
    schedulerLogs.forEach(log => {
      schedulerMap[log.device_code] = log;
    });

    /* ===============================
       2. โหลดข้อมูล
    =============================== */
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

    /* ===============================
       3. Format Response
    =============================== */
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

        const deviceCode = registration.Device?.device_code;
        const scheduler = schedulerMap[deviceCode] || null;
        const user_settings = registration.User_Settings?.[0];

        /* =========================
           FIX ARRAY ERROR 🔥
        ========================= */
        const growthList = Array.isArray(registration.Growth_Analysis)
          ? registration.Growth_Analysis
          : [];

        const diseaseList = Array.isArray(registration.Disease_Analysis)
          ? registration.Disease_Analysis
          : [];

        /* =========================
           เอาเฉพาะ VALID ล่าสุด
        ========================= */
        const latestValidGrowth = growthList
          .filter(i =>
            i.confidence !== null &&
            i.confidence >= 0.6 &&
            i.growth_stage !== "ไม่ผ่านเกณฑ์"
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const latestValidDisease = diseaseList
          .filter(i =>
            i.confidence !== null &&
            i.confidence >= 0.7 &&
            i.disease_name !== "ไม่ผ่านเกณฑ์"
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        /* =========================
           Timeline (เอาแค่ล่าสุด)
        ========================= */
        const growthTimeline = latestValidGrowth
          ? [{
            stage: latestValidGrowth.growth_stage,
            confidence: Math.round(latestValidGrowth.confidence * 100),
            advice: latestValidGrowth.advice,
            link: latestValidGrowth.link,
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
            link: latestValidDisease.link,
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
        registration.Permanent_Data?.forEach(d => {
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
        );

        return {
          area_id: area.area_id,
          area_name: area.area_name || "ไม่ระบุชื่อ",
          device_code: deviceCode,
          status: registration.status || "offline",

          scheduler: scheduler
            ? {
              status: scheduler.status,
              days_remaining: scheduler.days_remaining,
              last_check: new Date(scheduler.created_at).toLocaleString("th-TH", {
                timeZone: "Asia/Bangkok"
              })
            }
            : null,

          thresholds: {
            min: user_settings?.Water_level_min,
            max: user_settings?.Water_level_mxm
          },

          ...(latestValidGrowth && {
            growth: {
              stage: latestValidGrowth.growth_stage,
              image_url: latestValidGrowth.image_url,
              advice: latestValidGrowth.advice,
              link: latestValidGrowth.link,
              progress: Math.round(latestValidGrowth.confidence * 100)
            }
          }),

          ...(latestValidDisease && {
            disease: {
              status: "warning",
              name: latestValidDisease.disease_name,
              advice: latestValidDisease.advice,
              link: latestValidDisease.link,
              image_url: latestValidDisease.image_url
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

export const getDataAdmin = async (req, res) => {
  try {

    const formatTH = (date) =>
      new Date(date).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok"
      });

    const farms = await prisma.farm.findMany({
      include: {
        Account: true,
        Area: {
          include: {
            Pump: true,
            device_registrations: {
              include: {

                Device: {
                  include: {
                    scheduler_logs: {
                      orderBy: { created_at: "desc" },
                      take: 3
                    }
                  }
                },

                // 🔥 filter ตั้งแต่ DB (สำคัญมาก)
                Growth_Analysis: {
                  where: {
                    confidence: { gte: 0.6 },
                    growth_stage: { not: "ไม่ผ่านเกณฑ์" }
                  },
                  orderBy: { created_at: "desc" },
                  take: 1
                },

                Disease_Analysis: {
                  where: {
                    confidence: { gte: 0.7 },
                    disease_name: { not: "ไม่ผ่านเกณฑ์" }
                  },
                  orderBy: { created_at: "desc" },
                  take: 1
                },

                User_Settings: {
                  orderBy: { user_settings_ID: "desc" },
                  take: 1
                },

                Permanent_Data: {
                  orderBy: { measured_at: "desc" },
                  take: 20,
                  include: {
                    Sensor_Type: true
                  }
                }

              }
            }
          }
        }
      }
    });

    const formatted = farms.map((farm) => {

      let totalDevices = 0;

      const areas = farm.Area.map((area) => {

        totalDevices += area.device_registrations.length;

        const devices = area.device_registrations.map((deviceReg) => {

          const device = deviceReg.Device;

          // =========================
          // 🔥 Scheduler (priority logic)
          // =========================
          const logs = device?.scheduler_logs || [];

          const latestScheduler =
            logs.find(l => l.status === "queued") ||
            logs.find(l => l.status === "never_analyzed") ||
            logs.find(l => l.status === "not_due") ||
            logs[0] ||
            null;

          // =========================
          // 🔥 Sensor ล่าสุด (แก้ bug ค่าเก่า)
          // =========================
          const sensorMap = {};

          deviceReg.Permanent_Data.forEach((data) => {
            const key = data.Sensor_Type?.key;

            if (key) {
              sensorMap[key] = {
                value: data.value,
                unit: data.unit,
                measured_at: data.measured_at
              };
            }
          });

          const latestSensor = {
            N: sensorMap["N"] || null,
            P: sensorMap["P"] || null,
            K: sensorMap["K"] || null,
            W: sensorMap["W"] || null,
            S: sensorMap["S"] || null
          };

          // =========================
          // 🔥 Fix settings bug
          // =========================
          const setting = deviceReg.User_Settings?.[0];

          return {

            device_id: deviceReg.device_registrations_ID,

            device_code: device?.device_code || null,

            status: deviceReg.status,

            registered_at: deviceReg.registered_at
              ? formatTH(deviceReg.registered_at)
              : null,

            latest_scheduler: latestScheduler
              ? {
                status: latestScheduler.status,
                growth_period: latestScheduler.growth_period,
                days_since_last: latestScheduler.days_since_last,
                days_remaining: latestScheduler.days_remaining,
                message: latestScheduler.message,
                created_at: formatTH(latestScheduler.created_at)
              }
              : null,

            latest_sensor: latestSensor,

            // 🔥 เอา index 0 ได้เลย เพราะ filter แล้ว
            latest_growth:
              deviceReg.Growth_Analysis?.[0]
                ? {
                  ...deviceReg.Growth_Analysis[0],
                  created_at: formatTH(deviceReg.Growth_Analysis[0].created_at)
                }
                : null,

            latest_disease:
              deviceReg.Disease_Analysis?.[0]
                ? {
                  ...deviceReg.Disease_Analysis[0],
                  created_at: formatTH(deviceReg.Disease_Analysis[0].created_at)
                }
                : null,

            latest_setting: setting
              ? {
                data_send_interval_days: setting.data_send_interval_days,
                water_level_min: setting.Water_level_min,
                water_level_max: setting.Water_level_mxm,
                growth_analysis_period: setting.growth_analysis_period
              }
              : null
          };

        });

        return {
          area_id: area.area_id,
          area_name: area.area_name,
          pump_count: area.Pump.length,
          device_count: area.device_registrations.length,
          devices
        };

      });

      return {
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        owner: farm.Account
          ? `${farm.Account.first_name || ""} ${farm.Account.last_name || ""}`
          : null,
        area_count: farm.Area.length,
        device_count: totalDevices,
        areas
      };

    });

    res.status(200).json({
      ok: true,
      data: formatted
    });

  } catch (error) {
    console.error("Get Data Admin Error:", error);

    res.status(500).json({
      ok: false,
      message: "Server Error"
    });
  }
};

export const getdataTimeline = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { area_id } = req.body;
    console.log(area_id)

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const devices = await prisma.device_registrations.findMany({
      where: {
        user_ID: userId,
        ...(area_id && { area_id: Number(area_id) })
      },
      select: {
        device_registrations_ID: true
      }
    });

    const deviceIds = devices.map(d => d.device_registrations_ID);


    if (deviceIds.length === 0) {
      return res.json({ success: true, data: [] });
    }


    const MIN_CONFIDENCE = 0.7;

    const growth = await prisma.growth_Analysis.findMany({
      where: {
        device_registrations_ID: { in: deviceIds },
        confidence: {
          gte: MIN_CONFIDENCE
        }
      },
      select: {
        analysis_id: true,
        growth_stage: true,
        image_url: true,
        advice: true,
        confidence: true,
        created_at: true,
        type: true,
        device_registrations_ID: true
      }
    });

    // 3. Disease (เอาเฉพาะที่เป็นโรคจริง + confidence ผ่าน)
    const disease = await prisma.disease_Analysis.findMany({
      where: {
        device_registrations_ID: { in: deviceIds },
        confidence: {
          gte: MIN_CONFIDENCE
        },
        NOT: [
          { disease_name: "healthy" },
          { disease_name: "unknown" }
        ]
      },
      select: {
        disease_id: true,
        disease_name: true,
        image_url: true,
        advice: true,
        type: true,
        confidence: true,
        created_at: true,
        device_registrations_ID: true
      }
    });

    // 4. map
    const growthTimeline = growth.map(item => ({
      id: item.analysis_id,
      type: "growth",
      title: item.growth_stage,
      description: item.advice,
      image: item.image_url,
      type_uplode: item.type,
      confidence: item.confidence,
      created_at: item.created_at
    }));

    const diseaseTimeline = disease.map(item => ({
      id: item.disease_id,
      type: "disease",
      type_uplode: item.type,
      title: item.disease_name,
      description: item.advice,
      image: item.image_url,
      confidence: item.confidence,
      created_at: item.created_at
    }));

    const timeline = [...growthTimeline, ...diseaseTimeline];

    timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      data: timeline
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};


// export const getDataAdmin = async (req, res) => {
//   try {

//     const farms = await prisma.farm.findMany({
//       include: {
//         Account: true,
//         Area: {
//           include: {
//             Pump: true,
//             device_registrations: {
//               include: {

//                 Device: {
//                   include: {
//                     scheduler_logs: {
//                       orderBy: { created_at: "desc" },
//                       take: 3
//                     }
//                   }
//                 },

//                 Growth_Analysis: {
//                   orderBy: { created_at: "desc" },
//                   take: 1
//                 },

//                 Disease_Analysis: {
//                   orderBy: { created_at: "desc" },
//                   take: 1
//                 },

//                 User_Settings: {
//                   orderBy: { user_settings_ID: "desc" },
//                   take: 1
//                 },

//                 Permanent_Data: {
//                   orderBy: { measured_at: "desc" },
//                   take: 20,
//                   include: {
//                     Sensor_Type: true
//                   }
//                 }

//               }
//             }
//           }
//         }
//       }
//     });

//     const formatted = farms.map((farm) => {

//       let totalDevices = 0;

//       const areas = farm.Area.map((area) => {

//         totalDevices += area.device_registrations.length;

//         const devices = area.device_registrations.map((deviceReg) => {

//           const device = deviceReg.Device;

//           // =========================
//           // 🔥 เลือก scheduler ล่าสุดที่สำคัญ
//           // =========================

//           let latestScheduler = null;

//           const logs = device?.scheduler_logs || [];

//           latestScheduler =
//             logs.find(l => l.status === "queued") ||
//             logs.find(l => l.status === "never_analyzed") ||
//             logs.find(l => l.status === "not_due") ||
//             logs[0] ||
//             null;

//           // =========================
//           // 🌡 Sensor ล่าสุด
//           // =========================

//           const sensorMap = {};

//           deviceReg.Permanent_Data.forEach((data) => {

//             const key = data.Sensor_Type?.key;

//             if (key && !sensorMap[key]) {
//               sensorMap[key] = {
//                 value: data.value,
//                 unit: data.unit,
//                 measured_at: data.measured_at
//               };
//             }

//           });

//           const latestSensor = {
//             N: sensorMap["N"] || null,
//             P: sensorMap["P"] || null,
//             K: sensorMap["K"] || null,
//             W: sensorMap["W"] || null,
//             S: sensorMap["S"] || null
//           };

//           return {

//             device_id: deviceReg.device_registrations_ID,

//             device_code: device?.device_code || null,

//             status: deviceReg.status,

//             registered_at: deviceReg.registered_at,

//             // ✅ Scheduler ล่าสุดที่ถูกต้อง
//             latest_scheduler: latestScheduler
//               ? {
//                 status: latestScheduler.status,
//                 growth_period: latestScheduler.growth_period,
//                 days_since_last: latestScheduler.days_since_last,
//                 days_remaining: latestScheduler.days_remaining,
//                 message: latestScheduler.message,
//                 created_at: latestScheduler.created_at
//               }
//               : null,

//             latest_sensor: latestSensor,

//             latest_growth:
//               deviceReg.Growth_Analysis[0] || null,

//             latest_disease:
//               deviceReg.Disease_Analysis[0] || null,

//             latest_setting:
//               deviceReg.User_Settings.length > 0
//                 ? {
//                   data_send_interval_days:
//                     deviceReg.User_Settings[0].data_send_interval_days,

//                   water_level_min:
//                     deviceReg.User_Settings[0].Water_level_min,

//                   water_level_max:
//                     deviceReg.User_Settings[0].Water_level_mxm,

//                   growth_analysis_period:
//                     deviceReg.User_Settings[0].growth_analysis_period
//                 }
//                 : null
//           };

//         });

//         return {

//           area_id: area.area_id,

//           area_name: area.area_name,

//           pump_count: area.Pump.length,

//           device_count: area.device_registrations.length,

//           devices

//         };

//       });

//       return {

//         farm_id: farm.farm_id,

//         farm_name: farm.farm_name,

//         owner: farm.Account
//           ? `${farm.Account.first_name || ""} ${farm.Account.last_name || ""}`
//           : null,

//         area_count: farm.Area.length,

//         device_count: totalDevices,

//         areas

//       };

//     });

//     res.status(200).json({
//       ok: true,
//       data: formatted
//     });

//   } catch (error) {

//     console.error("Get Data Admin Error:", error);

//     res.status(500).json({
//       ok: false,
//       message: "Server Error"
//     });

//   }
// };