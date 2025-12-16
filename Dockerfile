
FROM node:22

# กำหนด directory เริ่มต้นใน container (ตอน run ขึ้นมา)
WORKDIR /usr/src/app

# ทำการ copy file package.json จากเครื่อง local เข้ามาใน container
COPY package.json ./

# ทำการลง dependency node
RUN npm install

# copy file server.js เข้ามาใน container
COPY server.js ./

# ทำการปล่อย port 8000 ออกมาให้ access ได้
EXPOSE 8000

# กำหนด command สำหรับเริ่มต้น run application (ตอน run container)
CMD ["node", "server.js"]