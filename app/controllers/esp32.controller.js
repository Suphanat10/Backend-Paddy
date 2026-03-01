import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import ffmpeg from 'fluent-ffmpeg';
import path from "path";


export const generateDeviceToken = async (req, res) => {
  try {
    const { device_code } = req.body;

    if (!device_code) {
      return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
    }

    const device = await prisma.Device.findFirst({
      where: { device_code }
    });

    if (!device) {
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

    if (!device_code) {
      return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
    }

    const device = await prisma.Device.findFirst({
      where: { device_code }
    });

    if (!device) {
      return res.status(400).json({ message: "ไม่พบอุปกรณ์" });
    }

    const updated = await prisma.Device.update({
      where: {
        device_ID: device.device_ID
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


export const checkPump = async (req, res) => {
  try {
    const { reg_code, pump_name, area_id } = req.body;
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

    if (pump.status == "WAITING") {

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
    } else {
      return res.status(400).json({ message: "ไม่พบการเชื่อมต่ออุปกรณ์ปั๊มน้ำ" });
    }

  } catch (error) {
    console.error("Error connecting device:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updatePump = async (req, res) => {
  try {
    const { pump_ID, pump_name } = req.body;
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


export const deletePump = async (req, res) => {
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

const sendLineMessage = async (userId, messageText) => {
  const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const messages = [{ type: "text", text: messageText }];
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      { to: userId, messages: messages },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
  } catch (err) {
    console.error("Line Messaging API Error:", err.response?.data || err.message);
  }
};

export const analyze_image = async (req, res) => {
  const { Type, device_code } = req.body || {};


  if (!req.body) {
    return res.status(400).json({ message: "ไม่มีข้อมูล body" });
  }


  if (!req.file) {
    return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
  }

  if (!device_code) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "กรุณาระบุ device_code" });
  }

  const device = await prisma.Device.findFirst({
    where: {
      device_code
    }
  })

  if (!device) {
    return res.status(400).json({ message: "ไม่พบ device_code ที่ลงทะเบียน" });
  }

  if (!Type) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "กรุณาระบุ Type" });
  }

  const tempPath = req.file.path;
  const fileName = req.file.filename;

  const apiUrl = "https://n8n.smart-paddy.space/webhook/35fa8b5a-ecde-497c-97ed-a63ea65c2ac6"

 

  try {
    const formData = new FormData();
    formData.append("data", fs.createReadStream(tempPath));
    formData.append("Type", Type);

    const response = await axios.post(apiUrl, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 60000,
    });

    if (response.data && response.data.status === "success") {
      const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
      const result = response.data;


      const registration = await prisma.device_registrations.findFirst({
        where: {
          Device: { device_code: device_code },
          status: "active",
        },
        include: {
          Account: true,
          Area: {
            include: {
              Farm: true
            }
          }
        },
      });


      const targetUserId = registration?.Account?.user_id_line;
      const areaName = registration?.Area?.area_name || "ไม่ระบุพื้นที่";
      const farmName = registration?.Area?.Farm?.farm_name || "ไม่ระบุฟาร์ม";
      const farmAddress = registration?.Area?.Farm?.address || "ไม่ระบุที่อยู่";

      if (targetUserId) {
        // หัวข้อรายงานระบุชื่อฟาร์มและพื้นที่
        let lineText = `📢 รายงานผล (${Type})\n`;
        lineText += `📍 สถานที่: ${farmName} (${areaName})\n`;
        lineText += `🏠 ที่อยู่: ${farmAddress}\n`;

        if (Type === "disease") {
          lineText += `📌 พบ: ${result.disease_name}\n🎯 ความแม่นยำ: ${(result.confidence * 100).toFixed(2)}%\n\n💡 ${result.advice}`;
        } else {
          lineText += `🌱 ระยะ: ${result.prediction}\n🎯 ความแม่นยำ: ${(result.confidence * 100).toFixed(2)}%\n\n💡 ${result.advice}`;
        }

        await sendLineMessage(targetUserId, lineText, publicUrl);
      } else {
        console.log(`Device ${device_code} ไม่มีการผูก LINE ID ไว้`);
      }

      if (Type === "disease") {
        await prisma.Disease_Analysis.create({
          data: {
            disease_name: result.disease_name,
            confidence:  parseFloat(result.confidence),
            image_url: publicUrl,
            advice: result.advice,
            device_registrations_ID: registration.device_registrations_ID,
          },
        });
      } else {
        const savedAnalysis = await prisma.growth_Analysis.create({
          data: {
            growth_stage: Type === "disease" ? result.disease_name : result.prediction,
            image_url: publicUrl,
            advice: result.advice || "ไม่มีคำแนะนำ",
            confidence: result.confidence ? parseFloat(result.confidence) : 0,
            device_registrations_ID: registration.device_registrations_ID,
          },
        });
      }

      await prisma.logs_Alert.create({
        data: {
          device_registrations_ID: registration.device_registrations_ID,
          alert_message: Type === "disease" ? `พบโรค: ${result.disease_name} ในพื้นที :  ${areaName}` : `ระยะ: ${result.prediction} ในพื้นที :  ${areaName}`,
          type: Type,
        }
      });

      return res.status(200).json({
        message: "วิเคราะห์สำเร็จ",
        imageUrl: publicUrl,
        analysisResult: response.data,
      });

    } else {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(422).json({
        message: "ผลวิเคราะห์ไม่ผ่านเกณฑ์",
        reason: response.data.reason || "Internal Analysis Error",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "ไม่สามารถเชื่อมต่อระบบวิเคราะห์ได้",
      error: error.message,
    });
  }
};




export const extractBestFrame = async (req, res) => {
  // 1. ตรวจสอบไฟล์ที่ส่งมา
  if (!req.file) {
    return res.status(400).json({ message: "กรุณาแนบไฟล์วิดีโอ" });
  }

  const videoPath = req.file.path; // ไฟล์ใน uploads/videos/
  const outputFolder = 'uploads/images/'; // โฟลเดอร์เป้าหมาย
  const imageName = `crop-${Date.now()}.jpg`;
  const imagePath = path.join(outputFolder, imageName);

  // ตรวจสอบ/สร้างโฟลเดอร์เก็บภาพ
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  try {
    // 2. ใช้ FFmpeg สกัดภาพ (เลือกวินาทีที่ 2 เพื่อภาพที่นิ่งที่สุด)
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [2],
        filename: imageName,
        folder: outputFolder,
        size: '1080x?'
      })
      .on('end', async () => {

        // 4. ลบไฟล์วิดีโอต้นฉบับทิ้งทันที
        fs.unlink(videoPath, (err) => {
          if (err) console.error("ลบไฟล์วิดีโอไม่สำเร็จ:", err);
          else console.log("ลบไฟล์วidีโอชั่วคราวแล้ว");
        });

        // 5. ส่ง URL ภาพกลับไปให้ Frontend
        return res.status(200).json({
          success: true,
          message: "บันทึกภาพสำเร็จ และลบวิดีโอต้นฉบับแล้ว",
          image_url: `/uploads/${imageName}`
        });
      })
      .on('error', (err) => {
        // หากเกิดข้อผิดพลาด ให้ลบวิดีโอทิ้งเพื่อไม่ให้ไฟล์ค้าง
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        console.error("FFmpeg Error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการสกัดภาพ" });
      });

  } catch (error) {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};