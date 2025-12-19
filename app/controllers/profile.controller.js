import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";
import { log } from "console";
import axios from "axios";

export const changePassword = async (req, res) => {
  try {
    const user_id = req.user?.id;

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" });
    }

    if (newPassword === oldPassword) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านปัจจุบัน" });
    }

    const user = await prisma.Account.findFirst({
      where: { user_ID: user_id },
    });

    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const passwordIsValid = bcrypt.compareSync(oldPassword, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 8);
    await prisma.Account.update({
      where: { user_ID: user_id }, // ✔ ใช้ user_ID!
      data: { password: hashedNewPassword },
    });

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });

    await prisma.logs.create({
      data: {
        user_id: user.user_id,
        action: "login",
        ip_address: req.ip,
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if(!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
      }
      const profile = await prisma.Account.findFirst({
        where: { user_ID: user_id },
        select: {
            user_ID: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            gender : true,
            position: true,
            birth_date: true,
                        user_id_line: true

        },
      });

      if (!profile) {
         return res.status(404).json({ message: "Profile not found" });
      }

      res.status(200).json({ profile });

  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const updateProfile = async (req, res) => {
  try {
    // แก้ไขจุดนี้: ดึงเฉพาะ id ออกมาจาก Object req.user
    // จาก Error เดิมระบุว่า id อยู่ใน Object (req.user.id)
    const user_id = req.user.id; 

    const { first_name, last_name, phone_number, gender, email } = req.body;

    // Validation
    if (!first_name || !last_name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อและนามสกุล" });
    }
    if (!phone_number) {
      return res.status(400).json({ message: "กรุณากรอกเบอร์โทรศัพท์" });
    }
    if (!email) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล" });
    }

    // อัปเดตข้อมูล
    const updatedProfile = await prisma.Account.update({
      where: { 
        // มั่นใจว่าเป็น Integer โดยใช้ Number() หรือ parseInt()
        user_ID: Number(user_id) 
      },
      data: {
        first_name,
        last_name,
        phone_number,
        gender: gender || null, // ป้องกันกรณี gender เป็น undefined ให้ลงเป็น null แทน
        email
      },
      select: {
        user_ID: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        gender: true,
        birth_date: true,
        position: true,
      },
    });

    // บันทึก Logs
    // แนะนำให้ย้ายมาไว้ก่อน res.status หรือใช้ try-catch แยกเพื่อไม่ให้ขัดขวางการตอบกลับหลัก
    try {
      await prisma.logs.create({
        data: {
          Account: {
            connect: { user_ID: updatedProfile.user_ID }
          },
          action: "update_profile",
          ip_address: req.ip || "unknown",
          created_at: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to create log:", logError);
      // ไม่ต้อง return res เพราะเราส่งคำตอบหลักไปแล้ว
    }

    return res.status(200).json({ 
      message: "อัปเดตโปรไฟล์สำเร็จ", 
      profile: updatedProfile 
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const connect_Line = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const accessToken = req.body.accessToken;

    if (!user_id) {
      return res.status(400).json({ message: "ไม่พบ User ID ใน Token" });
    }

    if (!accessToken) {
      return res.status(400).json({ message: "ไม่พบ Access Token" });
    }

    // ลบคำว่า Bearer ออกหากติดมา
    const tokenLine = accessToken.replace("Bearer ", "");

    // 1. ตรวจสอบ Profile จาก LINE API
    let lineProfile;
    try {
      const response = await axios.get("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenLine}` },
      });
      lineProfile = response.data;
    } catch (lineError) {
      console.error("LINE Verification Failed:", lineError.response?.data || lineError.message);
      return res.status(401).json({ message: "LINE Token ไม่ถูกต้องหรือหมดอายุ" });
    }


    const lineConnection = await prisma.Account.update({
      where: { user_ID: user_id },
      data: {
        line_ID: lineProfile.userId,
      },
    });

  
    res.status(200).json({ 
      message: "เชื่อมต่อ LINE สำเร็จ", 
      line: lineConnection,
      displayName: lineProfile.displayName 
    });


    try {
      await prisma.logs.create({
        data: {
          Account: {
            connect: { user_ID: user_id }
          },
          action: "connect_line",
          ip_address: req.ip || "unknown",
          created_at: new Date(),
        },
      });
    } catch (logError) {
      console.error("Log Creation Failed:", logError.message);
    }

  } catch (error) {
    console.error("Error connecting line:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  }
};


export const getdataPofile_notification = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const profile_notification = await prisma.account.findFirst({
      where: { user_ID: user_id },
      include: {
        device_registrations: {
          select: {
            device_registrations_ID: true,
            device_ID: true,        // field ธรรมดา
            status: true,
            Logs_Alert: true     // relation จาก schema
          }
        }
      }
    });

  
    


    if (!profile_notification) {
      return res.status(404).json({ message: "Profile not found" });
    }


      const result = {
      profile: {
        user_ID: profile_notification.user_ID,
        first_name: profile_notification.first_name,
        last_name: profile_notification.last_name,
        email: profile_notification.email,
        phone_number: profile_notification.phone_number,
        position: profile_notification.position,
      },
      devices: profile_notification.device_registrations.map(device => ({
        device_registrations_ID: device.device_registrations_ID,
        device_ID: device.device_ID,
        status: device.status,
        logs_alert: device.Logs_Alert
      }))
    };
    
    return res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching profile notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
