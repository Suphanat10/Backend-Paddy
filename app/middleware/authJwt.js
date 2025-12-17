import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import config from "../config/auth.config.js";

const prisma = new PrismaClient();

export const requireAuthMiddleware = (req, res, next) => {

  const token = req.cookies?.accessToken;

  console.log("Token from cookie:", token);

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, config.secret);

    req.user = decoded;

    console.log("Token verified (cookie):", decoded);
    next();
  } catch (err) {
    console.error("Invalid token:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Unauthorized" });
  }
};


export const isAgriculturist = async (req, res, next) => {
  try {
    const userId = req.user?.id;   // ⭐ ใช้ id จาก token เท่านั้น

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const user = await prisma.Account.findUnique({
      where: { user_ID: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // ⭐ ตรวจ role
    if (user.position !== "Agriculturist") {
      return res.status(403).json({ message: "Require Agriculturist Role!" });
    }

    next();
  } catch (error) {
    console.error("Role check failed:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      details: error.message,
    });
  }
};


export const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;   

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const user = await prisma.Account.findUnique({
      where: { user_ID: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (user.position !== "Admin") {
      return res.status(403).json({ message: "Require Admin Role!" });
    }

    next();
  } catch (error) {
    console.error("Role check failed:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      details: error.message,
    });
  }
};