// import { prisma } from "../../lib/prisma.js";

//  export const saveSensorData = async (data , device_code) => {
//     if(!data || !device_code){
//       console.log("Invalid payload");
//       return;
//     }


//    const Device = await prisma.Device.findFirst({
//       include: { device_registrations: true },
//       where: { device_code: device_code },
//     });

//     if (!Device){
//       console.log("ไม่พบ Device: " + device_code);
//       return;
//     }

//     const id = Device.device_ID;
//     const registration = Device.device_registrations[0];
//     if (!registration){
//          return console.log("ไม่พบการลงทะเบียน: " + device_code);

//     }
//       const user_settings = await prisma.User_Settings.findFirst({
//       where: { device_registrations_ID: registration.device_registrations_ID }
//     });

//     if (!user_settings) {
//        return console.log("ไม่พบ User settings: " + device_code);
//     }

//     const intervalDays = Number(user_settings.data_send_interval_days); //เวลาที่ตั้งค่าในการเก็บ
//     console.log(intervalDays)
//     const now = new Date(); //เวลาปัจจุบัน
//     const todayReference = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0); //วันเเละเวลาในการจุดอ้างอิง


//     const lastLog = await prisma.Permanent_Data.findFirst({
//       where: { device_registrations_ID: registration.device_registrations_ID },
//       orderBy: { measured_at: 'desc' }
//     });


//     let nextSaveTime = todayReference.getTime();  


//     if (lastLog) {
//       const lastLogTime = new Date(lastLog.measured_at).getTime();
//       nextSaveTime = lastLogTime + intervalDays * 24 * 60 * 60 * 1000;  //เวลาเก่า + เวลาที่ถูกตั้งในระบบ
//     }


//     if(now.getTime() < nextSaveTime){
//       const remainingMs = nextSaveTime - now.getTime();
//       const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
//       const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
//       console.log(`ข้ามการบันทึก → รอบถัดไปใน ${minutes}m ${seconds}s`);
//       return;
//     }

//     const sensorTypes = await prisma.Sensor_Type.findMany();

//     for(const sensorType of sensorTypes){
//       const key = sensorType.key;
//       if(key && key in data){
//         const record = {
//           device_registrations_ID: registration.device_registrations_ID,
//           sensor_type: sensorType.sensor_type_ID,
//           value: Number(data[key].val || 0),
//           unit: data[key].unit,
//           measured_at: new Date()
//         };
//         await prisma.Permanent_Data.create({ data: record });
//       }
//     }

//     const  log = await prisma.Logs_Alert.create({
//       data: {
//         device_registrations: { connect: { device_registrations_ID: registration.device_registrations_ID } },
//         alert_message: "เก็บข้อมูลสำเร็จ " + now.toLocaleTimeString(),
//         type: "Save_Data",
//         created_at: new Date()
//       }
//     });

//    console.log(`บันทึกข้อมูลสำเร็จ ${device_code}`);  
//    return;
// }


// import { prisma } from "../../lib/prisma.js";

// export const saveSensorData = async (data, device_code) => {
//   try {
//     // ================= VALIDATE =================
//     if (!data || !device_code) {
//       console.log("❌ Invalid payload");
//       return;
//     }

//     // ================= GET DEVICE =================
//     const device = await prisma.Device.findFirst({
//       where: { device_code },
//       include: { device_registrations: true },
//     });

//     if (!device) {
//       console.log("❌ ไม่พบ Device:", device_code);
//       return;
//     }

//     // ================= GET REGISTRATION =================
//     const registration = device.device_registrations[0];
//     if (!registration) {
//       console.log("❌ ไม่พบการลงทะเบียน:", device_code);
//       return;
//     }

//     // ================= GET USER SETTINGS =================
//     const user_settings = await prisma.User_Settings.findFirst({
//       where: {
//         device_registrations_ID: registration.device_registrations_ID,
//       },
//     });

//     if (!user_settings) {
//       console.log("❌ ไม่พบ User settings:", device_code);
//       return;
//     }

//     // ================= INTERVAL (วัน) =================
//     const intervalDays = Math.max(
//       1,
//       Number(user_settings.data_send_interval_days) || 1
//     );

//     const now = new Date();

//     // ================= GET LAST LOG =================
//     const lastLog = await prisma.Permanent_Data.findFirst({
//       where: {
//         device_registrations_ID: registration.device_registrations_ID,
//       },
//       orderBy: { measured_at: "desc" },
//     });

//     // ================= CHECK TIME =================
//     if (lastLog) {
//       const lastDate = new Date(lastLog.measured_at);

//       const diffMs = now - lastDate;
//       const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

//       console.log(`📊 ผ่านมาแล้ว ${diffDays} วัน (ตั้งไว้ ${intervalDays} วัน)`);

//       if (diffDays < intervalDays) {
//         console.log(`⏳ ยังไม่ถึงเวลา → ไม่บันทึก`);
//         return;
//       }
//     }

//     // ================= GET SENSOR TYPES =================
//     const sensorTypes = await prisma.Sensor_Type.findMany();

//     const records = [];

//     for (const sensorType of sensorTypes) {
//       const key = sensorType.key;

//       if (key && key in data) {
//         const rawVal = data[key]?.val;
//         const value = isNaN(Number(rawVal)) ? 0 : Number(rawVal);

//         records.push({
//           device_registrations_ID: registration.device_registrations_ID,
//           sensor_type: sensorType.sensor_type_ID,
//           value,
//           unit: data[key]?.unit || "",
//           measured_at: now,
//         });
//       }
//     }

//     // ================= SAVE DATA =================
//     if (records.length > 0) {
//       await prisma.Permanent_Data.createMany({
//         data: records,
//       });
//     }

//     // ================= LOG =================
//     await prisma.Logs_Alert.create({
//       data: {
//         device_registrations: {
//           connect: {
//             device_registrations_ID:
//               registration.device_registrations_ID,
//           },
//         },
//         alert_message: "เก็บข้อมูลสำเร็จ " + now.toLocaleString(),
//         type: "Save_Data",
//         created_at: now,
//       },
//     });

//     console.log(`บันทึกข้อมูลสำเร็จ: ${device_code}`);
//   } catch (err) {
//     console.error("saveSensorData error:", err.message);
//   }
// };




// import { prisma } from "../../lib/prisma.js";

// let sensorTypesCache = [];

// export const saveSensorData = async (data, device_code) => {
//   try {
//     // ================= VALIDATE =================
//     if (!data || !device_code) {
//       console.log("Invalid payload");
//       return;
//     }

//     // ================= GET DEVICE =================
//     const device = await prisma.Device.findFirst({
//       where: { device_code },
//     });

//     if (!device) {
//       console.log("ไม่พบ Device:", device_code);
//       return;
//     }

//     // ================= GET REGISTRATION (ตัวล่าสุด + active) =================
//     const registration = await prisma.device_registrations.findFirst({
//       where: {
//         device_ID: device.device_ID,
//         status: "active",
//       },
//       orderBy: { registered_at: "desc" },
//     });

//     if (!registration) {
//       console.log("ไม่พบ registration ที่ active:", device_code);
//       return;
//     }

//     // ================= GET USER SETTINGS =================
//     const user_settings = await prisma.User_Settings.findFirst({
//       where: {
//         device_registrations_ID: registration.device_registrations_ID,
//       },
//     });

//     if (!user_settings) {
//       console.log("ไม่พบ User settings:", device_code);
//       return;
//     }

//     // ================= INTERVAL (วัน) =================
//     const intervalDays = Math.max(
//       1,
//       Number(user_settings.data_send_interval_days) || 1
//     );

//     const now = new Date();

//     // ================= GET LAST LOG =================
//     const lastLog = await prisma.Permanent_Data.findFirst({
//       where: {
//         device_registrations_ID: registration.device_registrations_ID,
//       },
//       orderBy: { measured_at: "desc" },
//     });

//     // ================= CHECK TIME (แบบ calendar day) =================
//     if (lastLog) {
//       const lastDate = new Date(lastLog.measured_at);

//       const today = new Date(now.toISOString().split("T")[0]);
//       const lastDay = new Date(lastDate.toISOString().split("T")[0]);

//       const diffDays = Math.floor(
//         (today - lastDay) / (1000 * 60 * 60 * 24)
//       );

//       console.log(
//         `ผ่านมาแล้ว ${diffDays} วัน (ตั้งไว้ ${intervalDays} วัน)`
//       );

//       if (diffDays < intervalDays) {
//         console.log("ยังไม่ถึงเวลา → ไม่บันทึก");
//         return;
//       }
//     }

//     // ================= GET SENSOR TYPES (cache) =================
//     if (sensorTypesCache.length === 0) {
//       sensorTypesCache = await prisma.Sensor_Type.findMany();
//     }

//     const records = [];

//     for (const sensorType of sensorTypesCache) {
//       const key = sensorType.key;

//       if (key && key in data) {
//         const rawVal = data[key]?.val;
//         const value = Number.isFinite(Number(rawVal))
//           ? Number(rawVal)
//           : 0;

//         records.push({
//           device_registrations_ID:
//             registration.device_registrations_ID,
//           sensor_type: sensorType.sensor_type_ID,
//           value,
//           unit: data[key]?.unit || "",
//           measured_at: now,
//         });
//       }
//     }

//     // ================= SAVE DATA =================
//     if (records.length > 0) {
//       await prisma.Permanent_Data.createMany({
//         data: records,
//       });
//     }

//     // ================= LOG =================
//     const thaiTime = now.toLocaleString("th-TH", {
//       timeZone: "Asia/Bangkok",
//     });

//     await prisma.Logs_Alert.create({
//       data: {
//         device_registrations: {
//           connect: {
//             device_registrations_ID:
//               registration.device_registrations_ID,
//           },
//         },
//         alert_message: "เก็บข้อมูลสำเร็จ " + thaiTime,
//         type: "Save_Data",
//         created_at: now,
//       },
//     });

//     console.log(`บันทึกข้อมูลสำเร็จ: ${device_code}`);
//   } catch (err) {
//     console.error("saveSensorData error:", err.message);
//   }
// };


import { prisma } from "../../lib/prisma.js";

let sensorTypesCache = [];

export const saveSensorData = async (data, device_code) => {
  try {
    // ================= VALIDATE =================
    if (!data || !device_code) {
      console.log("Invalid payload");
      return;
    }

    // ================= GET DEVICE =================
    const device = await prisma.Device.findFirst({
      where: { device_code },
    });

    if (!device) {
      console.log("ไม่พบ Device:", device_code);
      return;
    }

    // ================= GET REGISTRATION (ตัวล่าสุด + active) =================
    const registration = await prisma.device_registrations.findFirst({
      where: {
        device_ID: device.device_ID,
        status: "active",
      },
      orderBy: { registered_at: "desc" },
    });

    if (!registration) {
      console.log(`ไม่พบ registration ที่ active: ${device_code}`);
      return;
    }

    // ================= GET USER SETTINGS =================
    const user_settings = await prisma.User_Settings.findFirst({
      where: {
        device_registrations_ID: registration.device_registrations_ID,
      },
    });

    if (!user_settings) {
      console.log(` ไม่พบ User settings: ${device_code}`);
      return;
    }

    // ================= INTERVAL (วัน) =================
    const intervalDays = Math.max(1, Number(user_settings.data_send_interval_days) || 1);
    const now = new Date();

    // ================= GET LAST LOG =================
    const lastLog = await prisma.Permanent_Data.findFirst({
      where: {
        device_registrations_ID: registration.device_registrations_ID,
      },
      orderBy: { measured_at: "desc" },
    });

    // ================= CHECK TIME & CALCULATE REMAINING =================
    let daysRemaining = 0;

    if (lastLog) {
      // Get Bangkok time (UTC+7) as a date at midnight
      const getBangkokMidnight = (date) => {
          const d = new Date(date);
          const thaiTime = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
          return new Date(thaiTime.getFullYear(), thaiTime.getMonth(), thaiTime.getDate(), 0, 0, 0, 0);
      };
      
      // ใช้การ Reset เวลาเป็น 00:00:00 เพื่อเทียบวันที่แม่นยำ (Calendar Day) ใน Bangkok timezone
      const todayMidnight = getBangkokMidnight(now);
      const lastDayMidnight = getBangkokMidnight(lastLog.measured_at);

      const diffTime = todayMidnight - lastDayMidnight;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      daysRemaining = intervalDays - diffDays;

      console.log(`[${device_code}] ผ่านมาแล้ว: ${diffDays} วัน | รอบบันทึก: ${intervalDays} วัน | เหลืออีก: ${Math.max(0, daysRemaining)} วัน`);

      if (diffDays < intervalDays) {
        console.log(`[${device_code}] ยังไม่ถึงเวลา (เหลืออีก ${daysRemaining} วัน) → ไม่บันทึก`);
        return;
      }
    }

    // ================= GET SENSOR TYPES (cache) =================
    if (sensorTypesCache.length === 0) {
      sensorTypesCache = await prisma.Sensor_Type.findMany();
    }

    const records = [];
    for (const sensorType of sensorTypesCache) {
      const key = sensorType.key;
      if (key && key in data) {
        const rawVal = data[key]?.val;
        const value = Number.isFinite(Number(rawVal)) ? Number(rawVal) : 0;

        records.push({
          device_registrations_ID: registration.device_registrations_ID,
          sensor_type: sensorType.sensor_type_ID,
          value,
          unit: data[key]?.unit || "",
          measured_at: now,
        });
      }
    }

    // ================= SAVE DATA =================
    if (records.length > 0) {
      await prisma.Permanent_Data.createMany({
        data: records,
      });
    }

    // ================= LOG =================
    const thaiTime = now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    await prisma.Logs_Alert.create({
      data: {
        device_registrations: {
          connect: { device_registrations_ID: registration.device_registrations_ID },
        },
        alert_message: `เก็บข้อมูลสำเร็จ (${thaiTime}) รอบถัดไปในอีก ${intervalDays} วัน`,
        type: "Save_Data",
        created_at: now,
      },
    });

    console.log(`บันทึกข้อมูลสำเร็จ: ${device_code}`);
  } catch (err) {
    console.error("saveSensorData error:", err.message);
  }
};