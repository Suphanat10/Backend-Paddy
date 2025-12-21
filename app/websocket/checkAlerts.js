import { prisma } from "../../lib/prisma.js";
import  {sendSettingsToDevice} from "./socketHandler.js"



const sendLineNotify = async (token, message) => {
  if (!token) return; // ถ้าไม่มี token ก็ไม่ต้องส่ง

  try {
    await axios.post(
      "https://notify-api.line.me/api/notify",
      new URLSearchParams({ message: message }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err) {
    console.error("Failed to send Line Notify:", err.message);
  }
};



const checkAlerts = async (data , device_code) => {

    const registration = await prisma.device_registrations.findFirst({
      where: {
        Device: {
          device_code: device_code
        },
        status: 'active' 
      },
      include: {
        Account: true,       
        User_Settings: true,  
        Device: true          
      }
    });

    if (!registration) {
      console.log(`ไม่พบ Device registration: ${device_code}`);
      return;
    }

    const settings = registration.User_Settings[0];

    if(!settings){
      console.log(`ไม่พบ User Settings: ${device_code}`);
      return;
    }

    const minLevel = settings.Water_level_min;
    const maxLevel = settings.Water_level_max;
    const currentLevel = parseFloat(data.water_level);
    const user_id_line = registration.Account.user_id_line;


    const lastAlert = await prisma.logs_alert.findFirst({
      where: {
        device_registrations_ID: registration.device_registrations_ID,
          },
      orderBy: {
        created_at: "desc",
      },
    });

      const today = new Date().toDateString();
      const lastAlertDate = lastAlert?.created_at ? new Date(lastAlert.created_at).toDateString() : null;
      const isSameDay = today === lastAlertDate;

      const last_type = lastAlert?.type;
      const wasLowAlert = last_type?.includes("High")
      const wasHighAlert = last_type?.includes("Low")


      if(currentLevel < minLevel){
        if(!wasLowAlert || !isSameDay){
             
        const Payload = {
        message : "open pump",
        connectDevice: true,
        type: "OPEN_PUMP",
        };
            sendSettingsToDevice(device_code, Payload);
          
        }
      }else if(currentLevel > maxLevel){
        if(!wasHighAlert || !isSameDay){
             const message = `เตือน! ระดับน้ำในพืชสูงกว่า ${maxLevel}`;
             await sendLineNotify(user_id_line, message);
          
        }
      }





    

}