#Backend Paddy Project

ระบบ Backend สำหรับจัดการข้อมูลฟาร์ม แปลงนา ผู้ใช้งาน และอุปกรณ์ IoT\
ใช้ Docker Compose เพื่อรัน Node.js Backend + MySQL + phpMyAdmin
ได้ในคำสั่งเดียว

------------------------------------------------------------------------

##โครงสร้างโปรเจค

    Backend-Paddy/
    │── app/                         # Source code backend
    │── server.js                    # จุดเริ่มต้น Server
    │── Dockerfile                   # ใช้ build Node.js image
    │── docker-compose.yml           # รัน node + mysql + phpmyadmin
    │── package.json
    │── package-lock.json
    │── README.md

------------------------------------------------------------------------

## การใช้งานผ่าน Docker

### รันระบบ

``` bash
docker-compose up -d --build
```

จะได้ 3 services:

  Service           URL
  ----------------- -----------------------
  Node.js Backend   http://localhost:8000
  phpMyAdmin        http://localhost:8080
  MySQL             ใช้ภายใน Docker

------------------------------------------------------------------------

## การเข้าถึงบริการต่าง ๆ

### ✔ Backend API

    http://localhost:8000

### ✔ phpMyAdmin

    http://localhost:8080

Login:

-   Username: root\
-   Password: root\
-   Host: db

------------------------------------------------------------------------

## ข้อมูล MySQL

-   Hostname: `db`
-   Port ภายใน container: `3306`
-   Port บนเครื่อง host: `3307`
-   Username: `root`
-   Password: `root`

------------------------------------------------------------------------

##Commands สำหรับนักพัฒนา

### ดู log ของ Node Server

``` bash
docker logs node-server -f
```

### ดู log ของ MySQL

``` bash
docker logs db
```

### รีสตาร์ท service

``` bash
docker-compose restart
```

### ปิดทุก container

``` bash
docker-compose down
```

------------------------------------------------------------------------

## ปัญหาที่พบบ่อย

###phpMyAdmin ขึ้นว่า Connection refused

-   ตรวจสอบว่า container `db` รันอยู่
-   ตรวจสอบว่ามี `MYSQL_ROOT_HOST=%` ใน compose

###Port 3306 ถูกใช้งาน

ปรับเป็น:

    3307:3306

### MySQL crash เพราะ downgrade

ลบ volume เดิม:

``` bash
docker volume rm backend-paddy_mysql_data_test
```



