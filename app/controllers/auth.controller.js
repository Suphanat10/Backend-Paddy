import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
        maxAge: 86400 * 1000,
      })
      .send({
        message: "เข้าสู่ระบบสำเร็จ",
        user: {
          id: user.user_id,
          first_name: user.first_name,
          last_name: user.last_name,
          position: user.position,
          Token: token
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


export const logout = (req, res) => {
  try {
    res.clearCookie("accessToken");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
