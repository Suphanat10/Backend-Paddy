import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";
import { log } from "console";

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
      const user_id = req.user?.id;

      const { first_name, last_name, phone_number, gender, birth_date , email } = req.body;

      if(!user_id) {
        return res.status(400).json({ message: "User ID missing in token" });
      }

      if(!first_name || !last_name) {
         return res.status(400).json({ message: "กรุณากรอกชื่อและนามสกุล" });
      }

      if(!phone_number) {
         return res.status(400).json({ message: "กรุณากรอกเบอร์โทรศัพท์" });
      }

      if(!email) {
         return res.status(400).json({ message: "กรุณากรอกอีเมล" });
      }

      const updatedProfile = await prisma.Account.update({
         where: { user_ID: user_id },
         data: {
            first_name,
            last_name,
            phone_number,
            gender,
            birth_date,
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

      res.status(200).json({ message: "อัปเดตโปรไฟล์สำเร็จ", profile: updatedProfile });

      await prisma.logs.create({
        data: {
            Account: {
          connect: { user_ID: updatedProfile.user_ID }
        },
          action: "update_profile",
          ip_address: req.ip,
          created_at: new Date(),
        },
      });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
