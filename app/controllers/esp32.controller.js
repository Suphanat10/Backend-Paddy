import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";
import sharp from 'sharp';


import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import ffmpeg from 'fluent-ffmpeg';
import path from "path";


export const generateDeviceToken = async (req, res) => {
  try {
    const { device_code } = req.body;

    if (!req.body) {
      return res.status(400).json({ message: "กรุณากรอกรหัสอุปกรณ์" });
    }

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

    if (device.status == "registered") {
      return res.status(200).json({ message: "คำขอเปิดการเชื่อมต่อ Server สำเร็จ พบการลงทะเบียนเเล้ว " });
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


export const getAllDevices = async (req, res) => {
  try {
    const devices = await prisma.Device.findMany({
      orderBy: {
        device_ID: "desc"
      }
    });

    const result = devices.map(d => ({
      device_id: d.device_ID,
      device_code: d.device_code,
      status: d.status,

      // ✅ เช็คจาก status
      is_registered: d.status === "online",

      last_seen: d.last_seen
    }));

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get devices error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


export const openPump = async (req, res) => {
  try {
    const { reg_code, mac_address } = req.body;

    if (!reg_code || !mac_address) {
      return res.status(400).json({ message: "กรุณาส่ง mac_address และ reg_code มาให้ครบ" });
    }

    const regCodeStr = String(reg_code);

    // 🔍 เช็คก่อนว่าเคยมี device นี้ไหม
    const existingPump = await prisma.pump.findFirst({
      where: { mac_address }
    });

    let pump;

    if (existingPump) {
      // ✔ เคยมีแล้ว → เปลี่ยนเป็น OFF
      pump = await prisma.pump.update({
        where: { mac_address },
        data: {
          reg_code: regCodeStr,
          status: "OFF"
        }
      });
    } else {
      // ✔ ใหม่ → WAITING
      pump = await prisma.pump.create({
        data: {
          mac_address,
          reg_code: regCodeStr,
          status: "WAITING"
        }
      });
    }

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
    const user_id = req.user?.id;

    if (!reg_code || !pump_name || !area_id) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    if (!user_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const areaIdInt = parseInt(area_id);
    if (isNaN(areaIdInt)) {
      return res.status(400).json({ message: "area_id ไม่ถูกต้อง" });
    }

    const pump = await prisma.pump.findFirst({
      where: { reg_code }
    });

    if (!pump) {
      return res.status(404).json({ message: "ไม่พบรหัสลงทะเบียนปั๊ม" });
    }

    if (pump.status !== "WAITING") {
      return res.status(400).json({
        message: "อุปกรณ์ไม่ได้อยู่ในสถานะรอเชื่อมต่อ"
      });
    }

    const update = await prisma.pump.update({
      where: {
        pump_ID: pump.pump_ID
      },
      data: {
        status: "OFF",
        user_ID: user_id,
        pump_name,
        area_id: areaIdInt
      }
    });

    return res.status(200).json({
      message: "เชื่อมต่ออุปกรณ์สำเร็จ",
      update
    });

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


function getWaterLevelRecommend(growthStage) {
  const table = [
    { growthStage: "ระยะต้นกล้า", min: 5, max: 10 },
    { growthStage: "ระยะตั้งท้อง", min: 5, max: 15 },
    { growthStage: "ระยะออกรวง", min: 5, max: 10 },
    { growthStage: "ระยะสุกแก่", min: 0, max: 5 },
  ];

  const recomend = table.find((s) => s.growthStage === growthStage);
  return recomend ? { min: recomend.min, max: recomend.max } : { min: 5, max: 15 };
};

const DISEASE_DATA = {
  "โรคจุดสีน้ำตาล": {
    th: "โรคจุดสีน้ำตาล",
    link: "https://rkb.ricethailand.go.th/sys_file/uploads/2025122425-y1a1dg532k.pdf",
  },
  "ใบข้าวที่ดี": {
    th: "ใบข้าวปกติ",
    link: null,
  },
  "โรคไหม้ในข้าว": {
    th: "โรคไหม้ในข้าว",
    link: "https://esc.doae.go.th/%E0%B9%82%E0%B8%A3%E0%B8%84%E0%B9%84%E0%B8%AB%E0%B8%A1%E0%B9%89%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%A7-10/",
  },
  "โรคแมลงดำหนามข้าว": {
    th: "แมลงดำหนามข้าว",
    link: "https://esc.doae.go.th/%E0%B9%81%E0%B8%A1%E0%B8%A5%E0%B8%87%E0%B8%94%E0%B8%B3%E0%B8%AB%E0%B8%99%E0%B8%B2%E0%B8%A1%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%A7-2/",
  },
  "โรคกาบใบแห้ง": {
    th: "โรคกาบใบแห้ง",
    link: "https://esc.doae.go.th/%E0%B9%82%E0%B8%A3%E0%B8%84%E0%B8%81%E0%B8%B2%E0%B8%9A%E0%B9%83%E0%B8%9A%E0%B9%81%E0%B8%AB%E0%B9%89%E0%B8%87-2/",
  },
  "ไม่ผ่านเกณฑ์": {
    th: "ไม่ผ่านเกณฑ์",
    link: "",
  },
};


const GROWTH_STAGE_DATA = {
  "ระยะตั้งท้อง": {
    link: "https://newwebs2.ricethailand.go.th/upload/doc/7376/1673236527.pdf"
  },
  "ระยะสุกแก่": {
    link: "https://newwebs2.ricethailand.go.th/upload/doc/7376/1673236527.pdf"
  },
  "ระยะต้นกล้า": {
    link: "https://newwebs2.ricethailand.go.th/upload/doc/7376/1673236527.pdf"
  },
  "ระยะออกรวง": {
    link: "https://newwebs2.ricethailand.go.th/upload/doc/7376/1673236527.pdf"
  },
};




const sendToFilteredAI = async (imagePath, Type) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);

    const formData = new FormData();

    // 🔥 แก้ตรงนี้
    formData.append("data", imageBuffer, {
      filename: "filtered.jpg",
      contentType: "image/jpeg",
    });

    formData.append("Type", Type);

    const response = await axios.post(
      "https://n8n.smart-paddy.space/webhook/api/img/analyze_image",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 120000,
      }
    );

    return Array.isArray(response.data)
      ? response.data[0]
      : response.data;

  } catch (err) {
    if (err.response && err.response.data) {
      return Array.isArray(err.response.data)
        ? err.response.data[0]
        : err.response.data;
    }

    console.error("Filtered AI error:", err.message);
    return null;
  }
};




export const analyze_image = async (req, res) => {
  const { Type, device_code, Usage } = req.body || {};

  if (!req.body) return res.status(400).json({ message: "ไม่มีข้อมูล body" });
  if (!req.file) return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });

  const tempPath = req.file.path;
  const fileName = req.file.filename;
  const baseName = path.parse(fileName).name;

  if (!device_code) {
    fs.unlinkSync(tempPath);
    return res.status(400).json({ message: "กรุณาระบุ device_code" });
  }
  if (!Type) {
    fs.unlinkSync(tempPath);
    return res.status(400).json({ message: "กรุณาระบุ Type" });
  }

  const finalPath = `uploads/${fileName}`;
  fs.renameSync(tempPath, finalPath);
  const publicUrl = `http://smart-paddy.space/uploads/${fileName}`;

  try {
    // ================= DEVICE =================
    const device = await prisma.Device.findFirst({ where: { device_code } });
    if (!device) return res.status(400).json({ message: "ไม่พบ device_code" });

    const registration = await prisma.device_registrations.findFirst({
      where: { Device: { device_code }, status: "active" },
      include: { Account: true, Area: { include: { Farm: true } } },
    });
    if (!registration) return res.status(400).json({ message: "ไม่พบ registration" });

    const targetUserId = registration?.Account?.user_id_line;
    const areaName = registration?.Area?.area_name || "ไม่ระบุพื้นที่";
    const farmName = registration?.Area?.Farm?.farm_name || "ไม่ระบุฟาร์ม";
    const farmAddress = registration?.Area?.Farm?.address || "ไม่ระบุที่อยู่";





    const result = await sendToFilteredAI(finalPath, Type);

    if (
      result &&
      result.category_name === "ไม่ใช่รูปต้นข้าว"
    ) {
      console.log("ไม่ใช่รูปต้นข้าว → ข้ามทั้งหมด");

      return res.status(400).json({
        message: "กรุณาอัปโหลดภาพต้นข้าว",
        reason: result.reason,
      });
    }


    // ================= GROWTH =================
    if (Type === "growth") {
      const imageBuffer = fs.readFileSync(finalPath);

      const formData = new FormData();
      formData.append("data", imageBuffer, {
        filename: fileName,
        contentType: "image/jpeg",
      });
      formData.append("Type", Type);

      let result = null;
      try {
        const response = await axios.post(
          "https://n8n.smart-paddy.space/webhook/api/analyze_image",
          formData,
          { headers: formData.getHeaders(), timeout: 120000 }
        );

        result = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

      } catch (err) {
        console.error("growth AI call failed:", err.message);
      }

      const confidence = Number.isFinite(Number(result?.confidence))
        ? parseFloat(result.confidence)
        : 0;

      if (result?.status === "success") {
        if (targetUserId) {
          let lineText = `📢 รายงานผล (growth)\n`;
          lineText += `📍 ${farmName} (${areaName})\n`;
          lineText += `🏠 ${farmAddress}\n`;
          lineText += `🌱 ระยะ: ${result.prediction}\n🎯 ${(confidence * 100).toFixed(2)}%\n\n💡 ${result.advice}`;
          await sendLineMessage(targetUserId, lineText, publicUrl);
        }

        const stageInfo = GROWTH_STAGE_DATA[result.prediction] || { link: null };

        const controlMode = await prisma.User_Settings.findFirst({
          where: {
            device_registrations_ID: registration.device_registrations_ID,
          },
          select: {
            control_mode: true,
          },
        });


        // เริ่มเซตระดับน้ำ 
        var waterLevelRecommend = null;
        // check auto mode
        if (controlMode?.control_mode?.toUpperCase() === "AUTO") {
          // ดึงข้อมูล growth_stage ล่าสุดของอุปกรณ์นี้
          const lastgrowthStage = await prisma.growth_Analysis.findFirst({
            where: {
              device_registrations_ID: registration.device_registrations_ID,
            },
            orderBy: {
              created_at: "desc",
            },
            select: {
              growth_stage: true,
            },
          });
          if (lastgrowthStage) {
            //กรณีมี Stage เก่าแล้วไม่เหมือนกัน
            if (lastgrowthStage.growth_stage !== result.prediction) {
              waterLevelRecommend = getWaterLevelRecommend(result.prediction);
            }
            //กรณีมี Stage เก่าแล้วเหมือนกัน ข้ามไม่ทำอะไร waterLevelRecommend จะได้ null

          } else {
            //กรณีไม่มี Stage เก่าเลย 
            waterLevelRecommend = getWaterLevelRecommend(result.prediction);
          }

          //ถ้าไม่ Null
          if (waterLevelRecommend) {
            // update mix max ของ device นั้น
            await prisma.User_Settings.updateMany({
              where: {
                device_registrations_ID: registration.device_registrations_ID,
              },
              data: {
                Water_level_min: waterLevelRecommend.min,
                Water_level_mxm: waterLevelRecommend.max,
              }
            });
          }
        }

        await prisma.growth_Analysis.create({
          data: {
            growth_stage: result.prediction,
            image_url: publicUrl,
            link: stageInfo.link,
            type: Usage === "user_upload" ? "USER_UPLOAD" : "ESP32",
            advice: result.advice || "ไม่มีคำแนะนำ",
            confidence,
            device_registrations_ID: registration.device_registrations_ID,
          },
        });

        return res.status(200).json({
          message: "วิเคราะห์สำเร็จ",
          imageUrl: publicUrl,
          analysisResult: result,
        });
      }

      // FAIL
      await prisma.growth_Analysis.create({
        data: {
          growth_stage: "ไม่ผ่านเกณฑ์",
          image_url: publicUrl,
          type: Usage === "user_upload" ? "USER_UPLOAD" : "ESP32",
          advice: null,
          confidence: null,
          device_registrations_ID: registration.device_registrations_ID,
        },
      });

      return res.status(422).json({
        message: "ผลวิเคราะห์ไม่ผ่านเกณฑ์",
        reason: result?.reason || "Unknown",
      });
    }

    // ================= DISEASE =================
    const cols = 3, rows = 3, overlap = 0.2;
    const imageBuffer = fs.readFileSync(finalPath);
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    const cellWidth = Math.floor(width / (cols - (cols - 1) * overlap));
    const cellHeight = Math.floor(height / (rows - (rows - 1) * overlap));
    const stepX = Math.floor(cellWidth * (1 - overlap));
    const stepY = Math.floor(cellHeight * (1 - overlap));

    const cropDir = `uploads/crops/${baseName}`;
    if (!fs.existsSync(cropDir)) fs.mkdirSync(cropDir, { recursive: true });

    const crops = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = Math.min(c * stepX, width - cellWidth);
        const top = Math.min(r * stepY, height - cellHeight);

        const cropName = `${baseName}_row${r + 1}_col${c + 1}.png`;
        const cropPath = `${cropDir}/${cropName}`;
        const cropUrl = `http://smart-paddy.space/uploads/crops/${baseName}/${cropName}`;

        await sharp(imageBuffer)
          .extract({ left, top, width: cellWidth, height: cellHeight })
          .toFile(cropPath);

        const buffer = await sharp(imageBuffer)
          .extract({ left, top, width: cellWidth, height: cellHeight })
          .toBuffer();

        crops.push({ name: `row${r + 1}_col${c + 1}`, buffer, cropPath, cropUrl });
      }
    }

    // ===== ส่งครบ 9 =====
    const analysisResults = [];

    for (const crop of crops) {
      const formData = new FormData();
      formData.append("data", crop.buffer, {
        filename: `${crop.name}.png`,
        contentType: "image/png",
      });
      formData.append("Type", Type);

      try {
        const response = await axios.post(
          "https://n8n.smart-paddy.space/webhook/api/analyze_image",
          formData,
          { headers: formData.getHeaders(), timeout: 120000 }
        );

        const result = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        analysisResults.push({
          cell: crop.name,
          cropUrl: crop.cropUrl,
          result,
        });

      } catch (err) {
        console.error(`crop ${crop.name} failed:`, err.message);
        analysisResults.push({
          cell: crop.name,
          cropUrl: crop.cropUrl,
          result: null,
        });
      }
    }

    // ===== เลือก BEST =====
    const successResults = analysisResults.filter(r => r.result?.status === "success");

    const diseaseResults = successResults.filter(r =>
      r.result?.disease_name !== "ใบข้าวที่ดี"
    );

    let best = null;

    if (diseaseResults.length > 0) {
      best = diseaseResults.sort((a, b) =>
        (b.result.confidence || 0) - (a.result.confidence || 0)
      )[0];
    } else if (successResults.length > 0) {
      best = successResults.sort((a, b) =>
        (b.result.confidence || 0) - (a.result.confidence || 0)
      )[0];
    }

    const foundResult = best?.result || null;
    const foundCropUrl = best?.cropUrl || null;

    // ===== ลบ crop ที่ไม่ใช้ =====
    const usedCropPath = crops.find(c => c.cropUrl === foundCropUrl)?.cropPath;

    for (const crop of crops) {
      if (crop.cropPath !== usedCropPath) {
        try {
          fs.unlinkSync(crop.cropPath);
        } catch { }
      }
    }

    const confidence = Number.isFinite(Number(foundResult?.confidence))
      ? parseFloat(foundResult.confidence)
      : 0;

    // ===== SUCCESS =====
    if (foundResult?.status === "success") {
      if (targetUserId) {
        let lineText = `📢 รายงานผล (disease)\n`;
        lineText += `📍 ${farmName} (${areaName})\n`;
        lineText += `🏠 ${farmAddress}\n`;
        lineText += `📌 พบ: ${foundResult.disease_name}\n🎯 ${(confidence * 100).toFixed(2)}%\n\n💡 ${foundResult.advice}`;
        await sendLineMessage(targetUserId, lineText, foundCropUrl);
      }

      const diseaseInfo = DISEASE_DATA[foundResult.disease_name] || DISEASE_DATA["ไม่ผ่านเกณฑ์"];

      await prisma.Disease_Analysis.create({
        data: {
          disease_name: foundResult.disease_name,
          confidence,
          image_url: foundCropUrl,
          link: diseaseInfo.link,
          type: Usage === "user_upload" ? "USER_UPLOAD" : "ESP32",
          advice: foundResult.advice,
          device_registrations_ID: registration.device_registrations_ID,
        },
      });

      return res.status(200).json({
        message: "วิเคราะห์สำเร็จ",
        imageUrl: publicUrl,
        bestCropUrl: foundCropUrl,
        analysisResult: foundResult,
        allCells: analysisResults,
      });
    }

    // ===== FAIL =====
    await prisma.Disease_Analysis.create({
      data: {
        disease_name: "ไม่ผ่านเกณฑ์",
        confidence: null,
        image_url: publicUrl,
        type: Usage === "user_upload" ? "USER_UPLOAD" : "ESP32",
        advice: null,
        device_registrations_ID: registration.device_registrations_ID,
      },
    });

    return res.status(422).json({
      message: "ผลวิเคราะห์ไม่ผ่านเกณฑ์",
      reason: "ไม่พบโรคในทุก crop",
      allCells: analysisResults,
    });

  } catch (error) {
    console.error("analyze_image error:", error.message);
    return res.status(500).json({
      message: "ระบบวิเคราะห์ล้มเหลว",
      error: error.message
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