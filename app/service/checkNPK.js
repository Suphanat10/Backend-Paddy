
import { prisma } from "../../lib/prisma.js";
import axios from "axios";




export const sendLineNotify = async (userId, data) => {
  if (!userId) return;

  const referenceLink = "https://ppsf.doae.go.th/wp-content/uploads/2024/11/%E0%B8%84%E0%B8%B3%E0%B9%81%E0%B8%99%E0%B8%B0%E0%B8%99%E0%B8%B3%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%9B%E0%B8%B8%E0%B9%8B%E0%B8%A2%E0%B8%95%E0%B8%B2%E0%B8%A1%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B2%E0%B8%B0%E0%B8%AB%E0%B9%8C%E0%B8%94%E0%B8%B4%E0%B8%99.pdf";

  const messageText =
    `Paddy Smart Report
━━━━━━━━━━━━━━━━━━
รายงานวิเคราะห์ดิน & คำแนะนำการใช้ปุ๋ย

 ระดับธาตุอาหารในดิน
• N (อินทรียวัตถุ OM): ${data.om}
• P (ฟอสฟอรัส): ${data.p}
• K (โพแทสเซียม): ${data.k}

คำแนะนำการใส่ปุ๋ย
━━━━━━━━━━━━━━━━━━
รอบที่ 1 (ระยะต้นกล้า)
ใส่หลังปักดำ 15–20 วัน หรือ นาหว่าน 20–30 วัน
${data.advice.round1}

รอบที่ 2 (ระยะกำเนิดช่อดอก)
${data.advice.round2}

เอกสารอ้างอิง (กรมส่งเสริมการเกษตร)
${referenceLink}`;

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          {
            type: "text",
            text: messageText,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    console.log("LINE Message Sent Successfully");
  } catch (err) {
    console.error("LINE Notify Error:", err.response?.data || err.message);
  }
};




function getFertilizerRecommendation(om, p, k) {
  const table = [
    // OM ต่ำ
    { om: "ต่ำ", p: "ต่ำ", k: "ต่ำ", r1_46: 14, r1_18: 13, r1_60: 10, r2_46: 20 },
    { om: "ต่ำ", p: "ต่ำ", k: "ปานกลาง", r1_46: 14, r1_18: 13, r1_60: 5, r2_46: 20 },
    { om: "ต่ำ", p: "ต่ำ", k: "สูง", r1_46: 14, r1_18: 13, r1_60: 0, r2_46: 20 },

    { om: "ต่ำ", p: "ปานกลาง", k: "ต่ำ", r1_46: 17, r1_18: 7, r1_60: 10, r2_46: 20 },
    { om: "ต่ำ", p: "ปานกลาง", k: "ปานกลาง", r1_46: 17, r1_18: 7, r1_60: 5, r2_46: 20 },
    { om: "ต่ำ", p: "ปานกลาง", k: "สูง", r1_46: 17, r1_18: 0, r1_60: 0, r2_46: 20 },

    { om: "ต่ำ", p: "สูง", k: "ต่ำ", r1_46: 20, r1_18: 0, r1_60: 10, r2_46: 20 },
    { om: "ต่ำ", p: "สูง", k: "ปานกลาง", r1_46: 20, r1_18: 0, r1_60: 5, r2_46: 20 },
    { om: "ต่ำ", p: "สูง", k: "สูง", r1_46: 20, r1_18: 7, r1_60: 0, r2_46: 20 },


    // OM ปานกลาง
    { om: "ปานกลาง", p: "ต่ำ", k: "ต่ำ", r1_46: 8, r1_18: 13, r1_60: 10, r2_46: 13 },
    { om: "ปานกลาง", p: "ต่ำ", k: "ปานกลาง", r1_46: 8, r1_18: 13, r1_60: 5, r2_46: 13 },
    { om: "ปานกลาง", p: "ต่ำ", k: "สูง", r1_46: 8, r1_18: 13, r1_60: 0, r2_46: 13 },

    { om: "ปานกลาง", p: "ปานกลาง", k: "ต่ำ", r1_46: 10, r1_18: 7, r1_60: 10, r2_46: 13 },
    { om: "ปานกลาง", p: "ปานกลาง", k: "ปานกลาง", r1_46: 10, r1_18: 7, r1_60: 5, r2_46: 13 },
    { om: "ปานกลาง", p: "ปานกลาง", k: "สูง", r1_46: 10, r1_18: 0, r1_60: 0, r2_46: 13 },

    { om: "ปานกลาง", p: "สูง", k: "ต่ำ", r1_46: 13, r1_18: 0, r1_60: 10, r2_46: 13 },
    { om: "ปานกลาง", p: "สูง", k: "ปานกลาง", r1_46: 13, r1_18: 0, r1_60: 5, r2_46: 13 },
    { om: "ปานกลาง", p: "สูง", k: "สูง", r1_46: 13, r1_18: 7, r1_60: 0, r2_46: 13 },

    // OM สูง
    { om: "สูง", p: "ต่ำ", k: "ต่ำ", r1_46: 0, r1_18: 13, r1_60: 10, r2_46: 8 },
    { om: "สูง", p: "ต่ำ", k: "ปานกลาง", r1_46: 0, r1_18: 13, r1_60: 5, r2_46: 8 },
    { om: "สูง", p: "ต่ำ", k: "สูง", r1_46: 0, r1_18: 13, r1_60: 0, r2_46: 8 },

    { om: "สูง", p: "ปานกลาง", k: "ต่ำ", r1_46: 4, r1_18: 7, r1_60: 10, r2_46: 7 },
    { om: "สูง", p: "ปานกลาง", k: "ปานกลาง", r1_46: 4, r1_18: 7, r1_60: 5, r2_46: 7 },
    { om: "สูง", p: "ปานกลาง", k: "สูง", r1_46: 4, r1_18: 0, r1_60: 0, r2_46: 7 },

    { om: "สูง", p: "สูง", k: "ต่ำ", r1_46: 7, r1_18: 0, r1_60: 10, r2_46: 7 },
    { om: "สูง", p: "สูง", k: "ปานกลาง", r1_46: 7, r1_18: 0, r1_60: 5, r2_46: 7 },
    { om: "สูง", p: "สูง", k: "สูง", r1_46: 7, r1_18: 7, r1_60: 0, r2_46: 7 },
  ];

  const match = table.find(item => item.om === om && item.p === p && item.k === k);


  return match ? {
    round1: `ปุ๋ย 46-0-0: ${match.r1_46} กก., 18-46-0: ${match.r1_18} กก., 0-0-60: ${match.r1_60} กก.`,
    round2: `ปุ๋ย 46-0-0: ${match.r2_46} กก.`
  } : "ไม่พบข้อมูลในระบบ";
}




export const analyzeSoilAndRice = async (n_mgkg, p_mgkg, k_mgkg, device_code) => {

  console.log("Test")
  console.log(n_mgkg, p_mgkg, k_mgkg, device_code);

  const calculatedOM = n_mgkg / 500;
  const omLevel = calculatedOM < 1.0 ? "ต่ำ" : calculatedOM >= 1.0 && calculatedOM <= 2.0 ? "ปานกลาง" : "สูง";
  const pLevel = p_mgkg < 5 ? "ต่ำ" : p_mgkg >= 5 && p_mgkg <= 10 ? "ปานกลาง" : "สูง";
  const kLevel = k_mgkg < 60 ? "ต่ำ" : k_mgkg >= 60 && k_mgkg <= 80 ? "ปานกลาง" : "สูง";

  // 2. ค้นหา ID การลงทะเบียนของอุปกรณ์จาก device_code
  const registration = await prisma.device_registrations.findFirst({
    where: {
      Device: { device_code: device_code },
      status: "active",
    },
    include: {
      Account: true,
      User_Settings: true,
    },
  });

  if (!registration) {
    return { message: "ไม่พบการลงทะเบียนอุปกรณ์ที่ใช้งานอยู่", isUpdated: false };
  }

  const deviceRegId = registration.device_registrations_ID;
  const userId = registration.Account?.user_id_line;

  const lastLog = await prisma.logs_Alert.findFirst({
    where: {
      device_registrations_ID: deviceRegId,
      NOT: [
        { type: 'Save_Data' },
        { type: 'Level_High' },
        { type: 'Level_Low' }
      ]
    },
    orderBy: { created_at: 'desc' }
  });



  const currentStatus = `${omLevel}-${pLevel}-${kLevel}`;
  const lastStatus = lastLog ? lastLog.type : null;

  // 4. ตรวจสอบความเปลี่ยนแปลง (ถ้าเหมือนเดิม ไม่ต้องบันทึกและแจ้งเตือน)
  if (lastLog && currentStatus === lastStatus) {
    console.log("ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่")
    return {
      message: "ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่",
      isUpdated: false
    };
  }

  // 5. หากเปลี่ยน หรือเป็นครั้งแรก ให้ดึงคำแนะนำปุ๋ย
  const advice = getFertilizerRecommendation(omLevel, pLevel, kLevel);



  // กำหนดข้อความแจ้งเตือน (เช็คว่าเป็นค่าใหม่ หรือ เปลี่ยนจากค่าเดิม)
  const alertMsg = lastLog
    ? `พบความเปลี่ยนแปลง! ระดับดินปัจจุบัน: ${currentStatus}. แนะนำปุ๋ยรอบ 1: ${advice.round1}, รอบ 2: ${advice.round2})`
    : `บันทึกค่าเริ่มต้น: ${currentStatus}. แนะนำปุ๋ยรอบ 1: ${advice.round1}, รอบ 2: ${advice.round2}`;

  // 6. บันทึก Log ใหม่ลงตาราง logs_alert
  await prisma.logs_Alert.create({
    data: {
      device_registrations_ID: deviceRegId,
      alert_message: alertMsg,
      type: currentStatus,
      created_at: new Date(),
    }
  });


  await sendLineNotify(userId, {
    om: `${omLevel} (${(n_mgkg / 500).toFixed(3)}%)`,
    p: pLevel,
    k: kLevel,
    advice: advice,
  });

};