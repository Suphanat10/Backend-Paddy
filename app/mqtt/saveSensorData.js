import { prisma } from "../../lib/prisma.js";
 
 export const saveSensorData = async (data , device_code) => {
    if(!data || !device_code){
      console.log("Invalid payload");
      return;
    }


   const Device = await prisma.Device.findFirst({
      include: { device_registrations: true },
      where: { device_code: device_code },
    });

    if (!Device){
      console.log("ไม่พบ Device: " + device_code);
      return;
    }

    const id = Device.device_ID;
    const registration = Device.device_registrations[0];
    if (!registration){
         return console.log("ไม่พบการลงทะเบียน: " + device_code);

    }
      const user_settings = await prisma.User_Settings.findFirst({
      where: { device_registrations_ID: registration.device_registrations_ID }
    });

    if (!user_settings) {
       return console.log("ไม่พบ User settings: " + device_code);
    }

    const intervalDays = Number(user_settings.data_send_interval_days); //เวลาที่ตั้งค่าในการเก็บ
    const now = new Date(); //เวลาปัจจุบัน
    const todayReference = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0); //วันเเละเวลาในการจุดอ้างอิง


    const lastLog = await prisma.Permanent_Data.findFirst({
      where: { device_registrations_ID: registration.device_registrations_ID },
      orderBy: { measured_at: 'desc' }
    });


    let nextSaveTime = todayReference.getTime();  //แปลงวันที่ให้เป็นตัวเลข


    if (lastLog) {
      const lastLogTime = new Date(lastLog.measured_at).getTime();
      nextSaveTime = lastLogTime + intervalDays * 24 * 60 * 60 * 1000;  //เวลาเก่า + เวลาที่ถูกตั้งในระบบ
    }


    if(now.getTime() < nextSaveTime){
      const remainingMs = nextSaveTime - now.getTime();
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      console.log(`ข้ามการบันทึก → รอบถัดไปใน ${minutes}m ${seconds}s`);
      return;
    }

    const sensorTypes = await prisma.Sensor_Type.findMany();

    for(const sensorType of sensorTypes){
      const key = sensorType.key;
      if(key && key in data){
        const record = {
          device_registrations_ID: registration.device_registrations_ID,
          sensor_type: sensorType.sensor_type_ID,
          value: Number(data[key].val || 0),
          unit: data[key].unit,
          measured_at: new Date()
        };
        await prisma.Permanent_Data.create({ data: record });
      }
    }

    const  log = await prisma.Logs_Alert.create({
      data: {
        device_registrations: { connect: { device_registrations_ID: registration.device_registrations_ID } },
        alert_message: "เก็บข้อมูลสำเร็จ " + now.toLocaleTimeString(),
        type: "Save_Data",
        created_at: new Date()
      }
    });

   console.log(`บันทึกข้อมูลสำเร็จ ${device_code}`);  
   return;
}
