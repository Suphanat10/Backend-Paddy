import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import config from "../config/auth.config.js";

const prisma = new PrismaClient();

// ===============================
//   MIDDLEWARE ตรวจ TOKEN
// ===============================
export const requireAuthMiddleware = (req, res, next) => {
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["x-access-token"];

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided!" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    return res.status(403).json({ message: "Invalid token format!" });
  }

  try {
    const decoded = jwt.verify(token, config.secret);

    // decoded = { id: 1, iat, exp }
    req.user = decoded;

    console.log("Token verified:", decoded);
    next();
  } catch (err) {
    console.error("Invalid token:", err.message);

    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token expired" });

    return res.status(401).json({ message: "Unauthorized" });
  }
};

// ===============================
//   ตรวจ Role: Agriculturist
// ===============================
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