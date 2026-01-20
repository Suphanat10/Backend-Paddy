# FROM node:22

# # กำหนด directory เริ่มต้น
# WORKDIR /usr/src/app

# # copy package.json และ package-lock.json (ถ้ามี)
# COPY package*.json ./

# # ลง dependency
# RUN npm install

# # copy ทุกไฟล์ (รวม prisma folder, server.js, lib/ ฯลฯ)
# COPY . .

# # generate Prisma client
# RUN npx prisma generate

# # ปล่อย port
# EXPOSE 8000

# # รัน server
# CMD ["node", "server.js"]


FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8000

CMD ["sh", "start.sh"]
