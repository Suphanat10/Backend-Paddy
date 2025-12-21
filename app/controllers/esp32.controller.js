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



export const openPump = async (req, res) => {
   try {
      const { reg_code, mac_address } = req.body;

      if (!reg_code || !mac_address) {
         return res.status(400).json({ message: "กรุณาส่ง mac_address และ reg_code มาให้ครบ" });
      }

      const regCodeStr = String(reg_code);
      const pump = await prisma.pump.upsert({
         where: { mac_address: mac_address },
         update: { 
            reg_code: regCodeStr,
            status: "WAITING" 
         },
         create: {
            mac_address: mac_address,
            reg_code: regCodeStr,
            status: "WAITING"
         }
      });

      const token = jwt.sign(
         {
            device_id: pump.mac_address, 
            type: "pump"
         },
         config.secret,
         { expiresIn: "30d" } 
      );
      return res.status(200).json({ 
         message: "บันทึกข้อมูลอุปกรณ์สำเร็จ", 
         status: pump.status,
         token 
      });

   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
};


 export const  checkPump = async (req, res) => {
   try {
      console.log(req.body);
      const { reg_code , pump_name  , area_id  } = req.body;
      const user_id = req.user.id;

      if (!reg_code || !pump_name || !area_id) {
         return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
      }

      const pump = await prisma.pump.findFirst({
         where: { reg_code: reg_code }
      });

      if (!pump) {
         return res.status(404).json({ message: "รหัสการลงทะเบียนไม่ถูกต้อง" });
      }

      if(pump.user_ID !== user_id) {
         return res.status(400).json({ message: "อุปกรณ์ไม่สําหรับคุณ" });
      }

      if(pump.status  == "WAITING") {

      const update = await prisma.pump.update({
         where: { 
             pump_ID: pump.pump_ID 
         },
         data: { 
            status: "OFF", 
            user_ID: user_id,
            pump_name: pump_name,
            area_id: parseInt(area_id)
         }
      });

      res.status(200).json({ message: "บันทึกข้อมูลอุปกรณ์สำเร็จ", update });
   }else{
      return res.status(400).json({ message: "ไม่พบการเชื่อมต่ออุปกรณ์ปั๊มน้ำ" });
   }

   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
}; 


export const   updatePump = async (req, res) => {
   try {
      const { pump_ID , pump_name  } = req.body;
      const user_id = req.user.id;

      if (!pump_ID || !pump_name) {
         return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
      }

      const pump = await prisma.pump.findFirst({
         where: { pump_ID: pump_ID }
      });

      if (!pump) {
         return res.status(404).json({ message: "ไม่พบอุปกรณ์ปั๊มน้ำ" });
      }

      const update = await prisma.pump.update({
         where: { 
             pump_ID: pump.pump_ID 
         },
         data: { 
            pump_name: pump_name,
         }
      });

      res.status(200).json({ message: "บันทึกข้อมูลอุปกรณ์สำเร็จ", update });   
   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
};


export const   deletePump = async (req, res) => {
   try {
      const { pump_ID } = req.body;
      console.log(req.body);
      const user_id = req.user.id;

      if (!pump_ID) {
         return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
      }

      const pump = await prisma.pump.findFirst({
         where: { pump_ID: pump_ID }
      });

      if (!pump) {
         return res.status(404).json({ message: "ไม่พบอุปกรณ์ปั๊มน้ำ" });
      }

       await prisma.pump.delete({
         where: { 
             pump_ID: pump.pump_ID 
         }
      });

      res.status(200).json({ message: "ลบอุปกรณ์ปั๊มน้ำสำเร็จ" });   
   } catch (error) {
      console.error("Error connecting device:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
};