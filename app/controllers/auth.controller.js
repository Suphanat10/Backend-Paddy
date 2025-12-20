import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import axios from "axios";
import config from "../config/auth.config.js";
import { Resend } from "resend";

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


     res.status(200).cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", 
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

const OTP_EXPIRE_MIN = 5; // อายุ OTP 5 นาที
const OTP_COOLDOWN_SEC = 60; // ขอใหม่ได้ทุก 60 วิ

const resend = new Resend("re_fNfEQpA7_Jodua8fLgx381LWk2monYN3V");

export const RequestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล" });
    }

    const user = await prisma.account.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    // 2) ตรวจสอบ rate limit
    const lastOtp = await prisma.oTP.findFirst({
      where: { user_id: user.user_ID },
      orderBy: { otp_id: "desc" },
    });

    if (lastOtp) {
      const now = new Date();
      const lastCooldownEnd = new Date(
        lastOtp.expired_at.getTime() - OTP_EXPIRE_MIN * 60000 + OTP_COOLDOWN_SEC * 1000
      );
      if (lastCooldownEnd > now) {
        return res
          .status(429)
          .json({ message: "กรุณารอเวลา 1 นาที ก่อนขอ OTP ใหม่" });
      }
    }

    // 3) สร้าง OTP แบบสุ่ม 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const otp = await prisma.oTP.create({
      data: {
        user_id: user.user_ID,
        otp_code: otpCode,
        expired_at: new Date(Date.now() + OTP_EXPIRE_MIN * 60000),
      },
    });

    // 4) ส่งอีเมล OTP ผ่าน Resend
    await resend.emails.send({
      from: "no-reply@smart-paddy.space",
      to: email,
      subject: "รหัส OTP ของคุณ",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2E86C1;">รหัส OTP ของคุณ</h2>
          <p>รหัส OTP ของคุณคือ:</p>
          <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${otpCode}</p>
          <p>รหัสนี้จะหมดอายุภายใน <strong>${OTP_EXPIRE_MIN} นาที</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #999;">
            หากคุณไม่ได้ขอรหัสนี้ โปรดละเว้นอีเมลฉบับนี้
          </p>
        </div>
      `,
    });

    return res.json({ message: "ส่ง OTP เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




export const login_admin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });

    const user = await prisma.Account.findFirst({
      where: { email , position: "Admin" }
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
    sameSite: "lax", 
    path: "/",     
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

  
  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const VerifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "กรุณากรอกรหัส OTP" });
    }

    const otpRecord = await prisma.OTP.findFirst({
      where: {
        otp_code: otp,
      },
      orderBy: { otp_id: "desc" },
    });
    if (!otpRecord) {
      return res.status(400).json({ message: "รหัส OTP ไม่ถูกต้อง" });
    }

    const now = new Date();
    if (otpRecord.expired_at < now) {
      return res.status(400).json({ message: "รหัส OTP หมดอายุ" });
    }
   
     await prisma.OTP.update({
      where: { otp_id: otpRecord.otp_id },
      data: { is_verified: true },
    });
    
    return res.json({ message: "ยืนยัน OTP สำเร็จ" });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { otp, new_password } = req.body;

    if (!otp || !new_password) {
      return res.status(400).json({ message: "กรุณากรอก OTP และรหัสผ่านใหม่" });
    }

    const otpRecord = await prisma.OTP.findFirst({
      where: { otp_code: otp },
      orderBy: { otp_id: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "รหัส OTP ไม่ถูกต้อง" });
    }

    if (otpRecord.is_verified === false) {
      return res.status(400).json({ message: "ไม่พบการยืนยัน OTP" });
    }
 
     const pass = bcrypt.hashSync(new_password, 8);
    // 3. เปลี่ยนรหัสผ่านผู้ใช้
    await prisma.account.update({
      where: { user_ID: otpRecord.user_id },
      data: { password: pass }, 
    });

    await prisma.OTP.delete({ where: { otp_id: otpRecord.otp_id } });

    return res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });

  } catch (error) {
    console.error("verifyOtpAndResetPassword error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

