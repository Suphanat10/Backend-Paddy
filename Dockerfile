

# # ---------- Base ----------
# FROM node:20-alpine

# WORKDIR /usr/src/app

# # ติดตั้ง netcat (เบามากใน alpine)
# RUN apk add --no-cache netcat-openbsd

# # คัดลอก package ก่อน (cache-friendly)
# COPY package*.json ./

# # ติดตั้งเฉพาะ production deps
# RUN npm install --omit=dev

# # คัดลอก source
# COPY . .

# # Prisma generate
# RUN npx prisma generate

# EXPOSE 8000

# CMD ["sh", "start.sh"]


# # ---------- Base ----------
# FROM node:20-alpine

# WORKDIR /usr/src/app

# # ติดตั้ง netcat สำหรับรอ DB
# RUN apk add --no-cache netcat-openbsd

# # สร้าง user ไม่ใช้ root
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# # คัดลอก package ก่อน (cache-friendly)
# COPY package*.json ./

# ENV TZ=Asia/Bangkok

# # ติดตั้ง production deps
# RUN npm install --omit=dev

# # คัดลอก source
# COPY . .

# # Prisma generate
# RUN npx prisma generate

# # ให้สิทธิไฟล์ทั้งหมดกับ appuser
# RUN chown -R appuser:appgroup /usr/src/app

# # เปลี่ยนไปใช้ user ที่ไม่ใช่ root
# USER appuser

# EXPOSE 8000

# CMD ["sh", "start.sh"]
# ---------- Base ----------
FROM node:20-alpine

WORKDIR /usr/src/app

# ติดตั้ง netcat
RUN apk add --no-cache netcat-openbsd

# สร้าง user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV TZ=Asia/Bangkok

# ---------- Dependencies ----------
COPY package*.json ./
RUN npm install --omit=dev

# ---------- Prisma (แยกออกมา!) ----------
COPY prisma ./prisma

# ใช้ cache ลดเวลา generate
RUN --mount=type=cache,id=prisma-cache,target=/root/.cache/prisma \
   npx prisma generate

# ---------- App Source ----------
COPY . .

# เปลี่ยน owner
RUN chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 8000

CMD ["sh", "start.sh"]