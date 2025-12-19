import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import axios from "axios";
import config from "../config/auth.config.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });

    const user = await prisma.Account.findFirst({
      where: { email }
    });

    if (!user)
      return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid)
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    const token = jwt.sign({ id: user.user_ID }, config.secret, {
      expiresIn: 86400,
    });

    res.status(200)
  .cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // ⭐ แนะนำ
    path: "/",       // ⭐ แนะนำ
    maxAge: 86400 * 1000,
  })
  .json({
    message: "เข้าสู่ระบบสำเร็จ",
    user: {
      id: user.user_ID,
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position,
    },
  });

    await prisma.logs.create({
      data: {
        Account: {
          connect: { user_ID: user.user_ID }
        },
        action: "login",
        ip_address: req.ip,
        created_at: new Date(),
      },
    });

  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const line_login = async (req, res) => {
  try {
    const { userId , accessToken } = req.body;



    console.log("Access Token:", accessToken);
    console.log("User ID:", userId);


    if (!accessToken ) {
      return res.status(400).json({ message: "Access Token is required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const line_profile = await prisma.Account.findFirst({
      where: { user_id_line: userId },
    });

    if (!line_profile) {
      return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้ที่ผูกกับ LINE นี้" });
    }


    let lineProfile;
    try {
      const response = await axios.get("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      lineProfile = response.data;
    } catch (lineError) {
      console.error("LINE Token Verification Failed:", lineError.message);
      return res.status(401).json({ message: "LINE Token ไม่ถูกต้องหรือหมดอายุ" });
    }

    
    const secureUserId = lineProfile.userId; 


    const user = await prisma.Account.findFirst({
      where: { user_id_line: secureUserId },
    });

    if (!user) {
      return res.status(401).json({ 
        message: "ไม่พบบัญชีผู้ใช้ที่ผูกกับ LINE นี้",
        lineUserId: secureUserId 
      });
    }

    const token = jwt.sign({ id: user.user_ID }, config.secret, {
      expiresIn: 86400, 
    });

    await prisma.logs.create({
      data: {
        Account: {
          connect: { user_ID: user.user_ID },
        },
        action: "login_line",
        ip_address: req.ip || req.socket.remoteAddress,
        created_at: new Date(),
      },
    });

     res.status(200)
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 86400 * 1000,
    })
      .json({
        message: "เข้าสู่ระบบด้วย LINE สำเร็จ",
        user: {
          id: user.user_ID,
          first_name: user.first_name,
          last_name: user.last_name,
          position: user.position,
          pictureUrl: lineProfile.pictureUrl 
        },
      });

  } catch (error) {
    console.error("Error signing in with LINE:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const register = async (req, res) => {
  try {
    const {  password, first_name, last_name, phone_number, user_id_line , email } = req.body;


    const phone_number_ = String(phone_number ?? "").replace(/\D/g, "");


    const exists = await prisma.Account.findFirst({
      where: { email }
    });

    if (exists)
      return res.status(400).json({ message: "อีเมลนี้มีอยู่แล้ว" });


    const phoneExists = await prisma.Account.findFirst({
      where: { phone_number: phone_number_ }
    });
    if (phoneExists)
      return res.status(400).json({ message: "เบอร์โทรนี้มีอยู่แล้ว" });

    if (user_id_line) {
      const lineExists = await prisma.account.findFirst({
        where: { user_id_line }
      });

      if (lineExists)
        return res.status(400).json({ message: "LINE ผู้ใช้นี้ถูกใช้แล้ว" });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

  
    const created = await prisma.Account.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone_number: phone_number_,
        position: "Agriculture",
        user_id_line
      }
    });

    await prisma.logs.create({
      data: {
        user_ID: created.user_ID,     
        action: "create_account",
        ip_address: req.ip,
        created_at: new Date(),
      },
    });

    return res.status(200).json({ message: "สมัครสมาชิกสำเร็จ", success: true });

  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const line_reg = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      birthdate, 
      gender, 
      phone_number, 
      accessToken 
    } = req.body;

    const tokenLine = accessToken.replace("Bearer ", "");

    if (!accessToken) {
      return res.status(400).json({ message: "Access Token is required" });
    }
    let lineProfile;
    try {
      const response = await axios.get("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${tokenLine}`,
        },
      });
      lineProfile = response.data;
      console.log(lineProfile);
    } catch (lineError) {
      console.error("LINE Token Verification Failed:", lineError.message);
      return res.status(401).json({ message: "LINE Token ไม่ถูกต้องหรือหมดอายุ" });
    }

    // ✅ ได้ ID ที่แท้จริงจาก LINE
    const secureUserId = lineProfile.userId;

    // ==========================================
    // 3. ตรวจสอบว่ามี User นี้หรือยัง (ใช้ ID จาก LINE)
    // ==========================================
    const existingUser = await prisma.Account.findFirst({
      where: { user_id_line: secureUserId },
    });

    if (existingUser) {
      return res.status(400).json({ message: "บัญชี LINE นี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบ" });
    }


    
    // สร้าง Username ไม่ให้ซ้ำ
    const generatedUsername = `line_${secureUserId.substring(0, 8)}`;

    // ==========================================
    // 5. บันทึกลง Database
    // ==========================================
    const user = await prisma.Account.create({
      data: {
        user_id_line: secureUserId,
        first_name: first_name || lineProfile.displayName, // ถ้าไม่กรอก ใช้ชื่อไลน์
        last_name: last_name || "",
        email: email || null, // LINE อาจจะไม่ส่ง email มาให้ถ้า user ไม่ allow
        phone_number: phone_number || "", // ✅ แก้ typo (ลบ underscore ออก)
        position: "Agriculture",
      
      }
    });

    // ==========================================
    // 6. สร้าง JWT Token (Auto Login)
    // ==========================================
    const token = jwt.sign({ id: user.user_ID }, config.secret, {
      expiresIn: 86400, 
    });

    // ==========================================
    // 7. บันทึก Log (แก้ Syntax connect)
    // ==========================================
    await prisma.logs.create({
      data: {
        Account: { connect: { user_ID: user.user_ID } }, // ✅ ใช้ connect syntax
        action: "register_line",
        ip_address: req.ip || req.socket.remoteAddress,
        created_at: new Date(),
      },
    });

    // ==========================================
    // 8. ส่ง Response
    // ==========================================
    res.status(200)
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400 * 1000,
      })
      .json({
        message: "ลงทะเบียนและเข้าสู่ระบบด้วย LINE สำเร็จ",
        user: {
          id: user.user_ID,
          first_name: user.first_name,
          last_name: user.last_name,
          position: user.position,
          pictureUrl: lineProfile.pictureUrl 
        },
      });

  } catch (error) {
    console.error("Error signing in with LINE:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("accessToken");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const OTP_EXPIRE_MIN = 1; // อายุ OTP 1 นาที
const OTP_COOLDOWN_SEC = 60; // ขอใหม่ได้ทุก 60 วิ

export const RequestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล" });
    }

    // ============================
    // 1) ตรวจสอบว่ามีผู้ใช้หรือไม่
    // ============================
    const user = await prisma.account.findFirst({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    // ============================
    // 2) ตรวจสอบ rate limit (กันสแปม)
    // ============================
    const lastOtp = await prisma.oTP.findFirst({
      where: { user_id: user.user_ID },
      orderBy: { otp_id: "desc" },
    });

    if (lastOtp) {
      const now = new Date();

      // OTP ล่าสุดหมดอายุเวลา lastOtp.expired_at
      // เวลาที่ขอเก่า + cooldown > ตอนนี้ ? ยังไม่อนุญาตให้ขอใหม่
      const lastCooldownEnd = new Date(
        lastOtp.expired_at.getTime() - OTP_EXPIRE_MIN * 60000 + OTP_COOLDOWN_SEC * 1000
      );

      if (lastCooldownEnd > now) {
        return res.status(429).json({ message: "กรุณารอเวลา 1 นาที ก่อนขอ OTP ใหม่" });
      }
    }

    // ============================
    // 3) สร้าง OTP แบบสุ่ม 6 หลัก
    // ============================
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.oTP.create({
      data: {
        user_id: user.user_ID,
        otp_code: otpCode,
        expired_at: new Date(Date.now() + OTP_EXPIRE_MIN * 60000),
      },
    });

    // ============================
    // 4) ส่งอีเมล OTP
    // ============================

    const user0 = "smartpaddy.p@gmail.com";
    const pass = "Suphanat10";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user0,
        pass: pass
      },
    });

    console.log("transporter", transporter);

    const mailOptions = {
      from: `"Smart Paddy" <${"smartpaddy2025@gmail.com"}>`,
      to: email,
      subject: "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน",
      html: `
        <h2>รหัส OTP ของคุณ</h2>
        <p style="font-size:20px; font-weight:bold;">${otpCode}</p>
        <p>รหัสมีอายุ ${OTP_EXPIRE_MIN} นาที</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "ส่งรหัส OTP สำเร็จ" });

  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
