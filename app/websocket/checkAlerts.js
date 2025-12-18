import { prisma } from "../../lib/prisma.js";

const checkAlerts = async (data , device_code) => {
    
   const device = await prisma.Device.findFirst({
    include: { device_registrations: true },
    where: { device_code: device_code },
   });


   const registration = device.device_registrations[0];
   if (!registration) return console.log(`ไม่พบ Device registration: ${device_code}`);

   const user_settings = await prisma.User_Settings.findFirst({
    where: { device_registrations_ID: registration.device_registrations_ID }
   });
   if (!user_settings) return console.log(`ไม่พบ User settings: ${device_code}`);

  
    if (data.water_level < user_settings.water_level_min) {
        console.log(`Alert: Water level too low for ${device_code}`);
    }else if (data.water_level > user_settings.water_level_max) {
        console.log(`Alert: Water level too high for ${device_code}`);
    }

}