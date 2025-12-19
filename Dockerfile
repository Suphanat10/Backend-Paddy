FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Copy ไฟล์โปรเจกต์ทั้งหมด (รวม schema.prisma)
COPY . .

# 🔥 เพิ่มบรรทัดนี้ครับ (สำคัญที่สุด!) 🔥
# เพื่อสร้าง Prisma Client สำหรับ Linux (Version 6.14.0)
RUN npx prisma generate

EXPOSE 8000

CMD ["node", "server.js"]