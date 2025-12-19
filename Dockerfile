FROM node:22

# กำหนด directory เริ่มต้น
WORKDIR /usr/src/app

# copy package.json และ package-lock.json (ถ้ามี)
COPY package*.json ./

# ลง dependency
RUN npm install

# ❌ ลบบรรทัดนี้ทิ้ง: COPY server.js ./
# ✅ ใส่บรรทัดนี้แทน: copy ทุกไฟล์ (รวมถึง folder app/) เข้าไป
COPY . .

# ปล่อย port
EXPOSE 8000

# รัน
CMD ["node", "server.js"]