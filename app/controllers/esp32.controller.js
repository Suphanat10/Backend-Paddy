import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";


export const generateDeviceToken = async (req, res) => {
   try {
      const { device_code } = req.body;
      
      if(!device_code){
          return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
      }

      const device = await prisma.Device.findFirst({
         where: { device_code }
      });

      if(!device){
         return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
      }

      const token = jwt.sign(
    {
      device_id: device.device_code,
      type: "iot"
    },
    config.secret,
    {
      expiresIn: "7d"
    }
  );

  return res.status(200).json({ token });

   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
   
};



export const connectDevice = async (req, res) => {
   try {
      const { device_code } = req.body;
      
      if(!device_code){
          return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
      }

      const device = await prisma.Device.findFirst({
         where: { device_code }
      });

      if(!device){
         return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
      }

      const updated = await prisma.Device.update({
         where: { 
             device_ID : device.device_ID
         },
         data: { 
            status: "online",
         }
      });

      return res.status(200).json({ message: "คำขอเปิดการเชื่อมต่อ Server สำเร็จ" });
      
   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
   
};
