
// import { log } from "console";
// import { prisma } from "../../lib/prisma.js";
// import axios from "axios";


// export const sendLineNotify = async (userId, data) => {
//   if (!userId) return;

//   // รวมข้อความสำหรับการส่งแบบ Text
//   const messageText =
//     `🌾 Paddy Smart Report
// ----------------------
// 🔔 รายงานคำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน

// ระดับธาตุอาหารปัจจุบัน:
// - N (OM): ${data.om}
// - P (ฟอสฟอรัส): ${data.p}
// - K (โพแทสเซียม): ${data.k}

// 💡 คำแนะนำการใส่ปุ๋ย:
// รอบที่ 1:ใส่ปุ๋ยระยะปักดำ หรือหลังปักดำ 15-20 วัน หรือในนาหว่านที่ระยะ 20-30 วันหลังงอก คำแนะนำการใช้ปุ๋ย (กก./ไร่)${data.advice.round1}
// รอบที่ 2: ใส่ปุ๋ยที่ระยะกำเนิดช่อดอก คำแนะนำการใช้ปุ๋ย (กก./ไร่)${data.advice.round2}


//  หมายเหตุ: ข้อมูลนี้เป็นการประเมินเบื้องต้นจากเซนเซอร์ในแปลงนาเท่านั้น เพื่อความแม่นยำสูงสุดและก่อนตัดสินใจลงทุนซื้อปุ๋ยจำนวนมาก แนะนำให้ส่งดินตรวจสอบกับกรมการข้าว หรือกรมพัฒนาที่ดินเพิ่มเติมครับ

// ----------------------
// เช็ครายละเอียดเพิ่มเติมได้ที่ระบบของคุณครับ`;

//   try {
//     await axios.post(
//       "https://api.line.me/v2/bot/message/push",
//       {
//         to: userId,
//         messages: [
//           {
//             type: "text",
//             text: messageText
//           }
//         ]
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
//         },
//       }
//     );
//     console.log("LINE Text Message Sent Successfully");
//   } catch (err) {
//     console.error("LINE Notify Error:", err.response?.data || err.message);
//   }
// };


// function getFertilizerRecommendation(om, p, k) {
//   const table = [
//     // OM ต่ำ
//     { om: "ต่ำ", p: "ต่ำ", k: "ต่ำ", r1_46: 14, r1_18: 13, r1_60: 10, r2_46: 20 },
//     { om: "ต่ำ", p: "ต่ำ", k: "ปานกลาง", r1_46: 14, r1_18: 13, r1_60: 5, r2_46: 20 },
//     { om: "ต่ำ", p: "ต่ำ", k: "สูง", r1_46: 14, r1_18: 13, r1_60: 0, r2_46: 20 },

//     { om: "ต่ำ", p: "ปานกลาง", k: "ต่ำ", r1_46: 17, r1_18: 7, r1_60: 10, r2_46: 20 },
//     { om: "ต่ำ", p: "ปานกลาง", k: "ปานกลาง", r1_46: 17, r1_18: 7, r1_60: 5, r2_46: 20 },
//     { om: "ต่ำ", p: "ปานกลาง", k: "สูง", r1_46: 17, r1_18: 0, r1_60: 0, r2_46: 20 },

//     { om: "ต่ำ", p: "สูง", k: "ต่ำ", r1_46: 20, r1_18: 0, r1_60: 10, r2_46: 20 },
//     { om: "ต่ำ", p: "สูง", k: "ปานกลาง", r1_46: 20, r1_18: 0, r1_60: 5, r2_46: 20 },
//     { om: "ต่ำ", p: "สูง", k: "สูง", r1_46: 20, r1_18: 7, r1_60: 0, r2_46: 20 },

//     // OM ปานกลาง
//     { om: "ปานกลาง", p: "ต่ำ", k: "ต่ำ", r1_46: 8, r1_18: 13, r1_60: 10, r2_46: 13 },
//     { om: "ปานกลาง", p: "ต่ำ", k: "ปานกลาง", r1_46: 8, r1_18: 13, r1_60: 5, r2_46: 13 },
//     { om: "ปานกลาง", p: "ต่ำ", k: "สูง", r1_46: 8, r1_18: 13, r1_60: 0, r2_46: 13 },

//     { om: "ปานกลาง", p: "ปานกลาง", k: "ต่ำ", r1_46: 10, r1_18: 7, r1_60: 10, r2_46: 13 },
//     { om: "ปานกลาง", p: "ปานกลาง", k: "ปานกลาง", r1_46: 10, r1_18: 7, r1_60: 5, r2_46: 13 },
//     { om: "ปานกลาง", p: "ปานกลาง", k: "สูง", r1_46: 10, r1_18: 0, r1_60: 0, r2_46: 13 },

//     { om: "ปานกลาง", p: "สูง", k: "ต่ำ", r1_46: 13, r1_18: 0, r1_60: 10, r2_46: 13 },
//     { om: "ปานกลาง", p: "สูง", k: "ปานกลาง", r1_46: 13, r1_18: 0, r1_60: 5, r2_46: 13 },
//     { om: "ปานกลาง", p: "สูง", k: "สูง", r1_46: 13, r1_18: 7, r1_60: 0, r2_46: 13 },

//     // OM สูง
//     { om: "สูง", p: "ต่ำ", k: "ต่ำ", r1_46: 0, r1_18: 13, r1_60: 10, r2_46: 8 },
//     { om: "สูง", p: "ต่ำ", k: "ปานกลาง", r1_46: 0, r1_18: 13, r1_60: 5, r2_46: 8 },
//     { om: "สูง", p: "ต่ำ", k: "สูง", r1_46: 0, r1_18: 13, r1_60: 0, r2_46: 8 },

//     { om: "สูง", p: "ปานกลาง", k: "ต่ำ", r1_46: 4, r1_18: 7, r1_60: 10, r2_46: 7 },
//     { om: "สูง", p: "ปานกลาง", k: "ปานกลาง", r1_46: 4, r1_18: 7, r1_60: 5, r2_46: 7 },
//     { om: "สูง", p: "ปานกลาง", k: "สูง", r1_46: 4, r1_18: 0, r1_60: 0, r2_46: 7 },

//     { om: "สูง", p: "สูง", k: "ต่ำ", r1_46: 7, r1_18: 0, r1_60: 10, r2_46: 7 },
//     { om: "สูง", p: "สูง", k: "ปานกลาง", r1_46: 7, r1_18: 0, r1_60: 5, r2_46: 7 },
//     { om: "สูง", p: "สูง", k: "สูง", r1_46: 7, r1_18: 7, r1_60: 0, r2_46: 7 },
//   ];


//   const match = table.find(item => item.om === om && item.p === p && item.k === k);


//   return match ? {
//     round1: `ปุ๋ย 46-0-0: ${match.r1_46} กก., 18-46-0: ${match.r1_18} กก., 0-0-60: ${match.r1_60} กก.`,
//     round2: `ปุ๋ย 46-0-0: ${match.r2_46} กก.`
//   } : "ไม่พบข้อมูลในระบบ";
// }





// export const analyzeSoilAndRice = async (n_mgkg, p_mgkg, k_mgkg, device_code) => {

//   const calculatedOM = n_mgkg / 500;
//   const omLevel = calculatedOM < 1.0 ? "ต่ำ" : calculatedOM <= 2.0 ? "ปานกลาง" : "สูง";
//   const pLevel = p_mgkg < 5 ? "ต่ำ" : p_mgkg <= 10 ? "ปานกลาง" : "สูง";
//   const kLevel = k_mgkg < 60 ? "ต่ำ" : k_mgkg <= 80 ? "ปานกลาง" : "สูง";

//   // 2. ค้นหา ID การลงทะเบียนของอุปกรณ์จาก device_code
//   const registration = await prisma.device_registrations.findFirst({
//     where: {
//       Device: { device_code: device_code },
//       status: "active",
//     },
//     include: {
//       Account: true,
//       User_Settings: true,
//     },
//   });

//   if (!registration) {
//     return { message: "ไม่พบการลงทะเบียนอุปกรณ์ที่ใช้งานอยู่", isUpdated: false };
//   }

//   const deviceRegId = registration.device_registrations_ID;
//   const userId = registration.Account?.user_id_line;

//   const lastLog = await prisma.logs_Alert.findFirst({
//     where: {
//       device_registrations_ID: deviceRegId,
//       NOT: [
//         { type: 'Save_Data' },
//         { type: 'Level_High' },
//         { type: 'Level_Low' }
//       ]
//     },
//     orderBy: { created_at: 'desc' }
//   });




//   const currentStatus = `${omLevel}-${pLevel}-${kLevel}`;
//   const lastStatus = lastLog ? lastLog.type : null;

//   // 4. ตรวจสอบความเปลี่ยนแปลง (ถ้าเหมือนเดิม ไม่ต้องบันทึกและแจ้งเตือน)
//   if (lastLog && currentStatus === lastStatus) {
//     console.log("ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่")
//     return {
//       message: "ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่",
//       isUpdated: false
//     };
//   }

//   // 5. หากเปลี่ยน หรือเป็นครั้งแรก ให้ดึงคำแนะนำปุ๋ย
//   const advice = getFertilizerRecommendation(omLevel, pLevel, kLevel);



//   // กำหนดข้อความแจ้งเตือน (เช็คว่าเป็นค่าใหม่ หรือ เปลี่ยนจากค่าเดิม)
//   const alertMsg = lastLog
//     ? `พบความเปลี่ยนแปลง! ระดับดินปัจจุบัน: ${currentStatus}. แนะนำปุ๋ยรอบ 1: ${advice.round1}, รอบ 2: ${advice.round2})`
//     : `บันทึกค่าเริ่มต้น: ${currentStatus}. แนะนำปุ๋ยรอบ 1: ${advice.round1}, รอบ 2: ${advice.round2}`;

//   // 6. บันทึก Log ใหม่ลงตาราง logs_alert
//   await prisma.logs_Alert.create({
//     data: {
//       device_registrations_ID: deviceRegId,
//       alert_message: alertMsg,
//       type: currentStatus,
//       created_at: new Date(),
//     }
//   });


//   await sendLineNotify(userId, {
//     om: `${omLevel} (${(n_mgkg / 500).toFixed(3)}%)`,
//     p: pLevel,
//     k: kLevel,
//     advice: advice,
//   });

// }




import { prisma } from "../../lib/prisma.js";
import axios from "axios";

// ==================== LINE NOTIFY ====================
export const sendLineNotify = async (userId, data) => {
  if (!userId) return;

  const mainMessage =
    `🌾 Paddy Smart Report
----------------------
🔔 รายงานคำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน

ระดับธาตุอาหารปัจจุบัน:
- N (ไนโตรเจน): ${data.n.level}
- P (ฟอสฟอรัส): ${data.p.level}
- K (โพแทสเซียม): ${data.k.level}

💡 คำแนะนำตามธาตุอาหาร:
🌱 N: ${data.n.advice}
🌱 P: ${data.p.advice}
🌱 K: ${data.k.advice}

----------------------
เช็ครายละเอียดเพิ่มเติมได้ที่ระบบของคุณครับ`;

  const stageMessage =
    `🌾 คำแนะนำตามระยะการเจริญเติบโต
----------------------
${data.stageAdvice}

----------------------
⚠️ หมายเหตุ: ข้อมูลนี้เป็นการประเมินเบื้องต้นจากเซนเซอร์ในแปลงนาเท่านั้น เพื่อความแม่นยำสูงสุดและก่อนตัดสินใจลงทุนซื้อปุ๋ยจำนวนมาก แนะนำให้ส่งดินตรวจสอบกับกรมการข้าว หรือกรมพัฒนาที่ดินเพิ่มเติมครับ`;

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          { type: "text", text: mainMessage },
          { type: "text", text: stageMessage },
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


// ==================== STAGE ADVICE ====================
function getStageAdvice(stage, N, P, K) {
  const isNLow = N.level.includes("ต่ำ");
  const isPLow = P.level.includes("ต่ำ");
  const isKLow = K.level.includes("ต่ำ");

  const nutrientStatus = [
    `${isNLow ? "⚠️" : "✅"} N - ไนโตรเจน: ${N.level}`,
    `${isPLow ? "⚠️" : "✅"} P - ฟอสฟอรัส: ${P.level}`,
    `${isKLow ? "⚠️" : "✅"} K - โพแทสเซียม: ${K.level}`,
  ].join("\n");

  switch (stage?.trim()) {

    case "ต้นกล้า":
      return `📌 ระยะต้นกล้า (อายุ 0–25 วัน)
ข้าวเริ่มดูดธาตุอาหารทางรากแล้ว ต้องการ N เป็นหลักเพื่อสร้างใบและลำต้น

สถานะธาตุอาหาร:
${nutrientStatus}

💊 คำแนะนำการใส่ปุ๋ย:
${isNLow
          ? "• N ต่ำ: ใส่ปุ๋ยยูเรีย 46-0-0 หรือสูตร 20-10-10 อัตรา 15–20 กก./ไร่ เพื่อเร่งการเจริญเติบโตของใบและลำต้น"
          : "• N เพียงพอ: ยังไม่จำเป็นต้องเพิ่ม N ในขณะนี้"}
${isPLow
          ? "• P ต่ำ: ใส่ปุ๋ย 18-46-0 อัตรา 10–15 กก./ไร่ เพื่อเสริมการพัฒนาระบบราก"
          : "• P เพียงพอ: ระบบรากได้รับฟอสฟอรัสเพียงพอแล้ว"}
${isKLow
          ? "• K ต่ำ: ใส่ปุ๋ย 0-0-60 อัตรา 5–10 กก./ไร่ เพื่อเสริมความแข็งแรงของลำต้น"
          : "• K เพียงพอ: ต้นข้าวมีความแข็งแรงดีแล้ว"}`;

    case "แตกกอ":
      return `📌 ระยะแตกกอ (อายุ 30–50 วัน)
ระยะสำคัญที่สุดในการกำหนดจำนวนรวง ข้าวต้องการ N และ P สูง เพื่อกระตุ้นการแตกกอและพัฒนาราก

สถานะธาตุอาหาร:
${nutrientStatus}

💊 คำแนะนำการใส่ปุ๋ย:
${isNLow
          ? "• N ต่ำ: เร่งด่วน! ใส่ปุ๋ยยูเรีย 46-0-0 หรือสูตร 16-8-8 อัตรา 20–30 กก./ไร่ เพื่อกระตุ้นการแตกกอก่อนเข้าระยะท้อง"
          : "• N เพียงพอ: การแตกกอดำเนินไปได้ดี คงระดับ N ต่อเนื่อง"}
${isPLow
          ? "• P ต่ำ: ใส่ปุ๋ย 18-46-0 อัตรา 15–20 กก./ไร่ เพื่อเร่งรากและเพิ่มจำนวนกอข้าว"
          : "• P เพียงพอ: รากและการแตกกอพัฒนาได้ดีแล้ว"}
${isKLow
          ? "• K ต่ำ: ใส่ปุ๋ย 0-0-60 อัตรา 10–15 กก./ไร่ เพื่อเพิ่มความแข็งแรงและต้านทานโรค"
          : "• K เพียงพอ: ต้นข้าวมีความต้านทานโรคและแมลงดีแล้ว"}`;

    case "ท้อง":
      return `📌 ระยะตั้งท้อง (อายุ 50–65 วัน)
ข้าวกำลังสร้างเมล็ด ต้องการ N และ K สูง แต่ต้องการ P น้อยลง เพราะผ่านระยะสร้างรากมาแล้ว

สถานะธาตุอาหาร:
${nutrientStatus}

💊 คำแนะนำการใส่ปุ๋ย:
${isNLow
          ? "• N ต่ำ: ใส่ปุ๋ยยูเรีย 46-0-0 หรือสูตร 15-5-20 อัตรา 15–20 กก./ไร่ เพื่อช่วยสร้างคลอโรฟิลล์และพลังงานในการสร้างเมล็ด"
          : "• N เพียงพอ: การสร้างเมล็ดดำเนินไปได้ดี"}
${isPLow
          ? "• P ต่ำ: ใส่ปุ๋ย 18-46-0 อัตรา 5–10 กก./ไร่ (ปริมาณน้อย เพราะข้าวต้องการ P ต่ำในระยะนี้)"
          : "• P เพียงพอ: ไม่จำเป็นต้องเพิ่ม P ในระยะนี้"}
${isKLow
          ? "• K ต่ำ: เร่งด่วน! ใส่ปุ๋ย 0-0-60 หรือสูตร 15-3-21 อัตรา 20–25 กก./ไร่ เพื่อเพิ่มน้ำหนักเมล็ดและต้านทานโรค"
          : "• K เพียงพอ: เมล็ดข้าวจะสมบูรณ์และมีน้ำหนักดี"}`;

    case "ออกรวง":
      return `📌 ระยะออกรวง (ก่อนเก็บเกี่ยว ~60 วัน)
ระยะสร้างรวงอ่อน ต้องการ N เพื่อให้รวงสมบูรณ์ มีเมล็ดต่อรวงมาก และ K เพื่อเพิ่มคุณภาพเมล็ด

สถานะธาตุอาหาร:
${nutrientStatus}

💊 คำแนะนำการใส่ปุ๋ย:
${isNLow
          ? "• N ต่ำ: ใส่ปุ๋ยยูเรีย 46-0-0 อัตรา 10–15 กก./ไร่ เพื่อให้รวงข้าวสมบูรณ์และมีจำนวนเมล็ดต่อรวงมากขึ้น"
          : "• N เพียงพอ: รวงข้าวจะพัฒนาได้สมบูรณ์"}
${isPLow
          ? "• P ต่ำ: ใส่ปุ๋ย 18-46-0 อัตรา 5–8 กก./ไร่ เพื่อช่วยการสังเคราะห์แป้งในเมล็ด"
          : "• P เพียงพอ: ไม่จำเป็นต้องเพิ่ม P ในระยะนี้"}
${isKLow
          ? "• K ต่ำ: ใส่ปุ๋ย 0-0-60 หรือสูตร 13-5-42 อัตรา 10–15 กก./ไร่ เพื่อเพิ่มน้ำหนักและคุณภาพเมล็ด"
          : "• K เพียงพอ: คุณภาพและน้ำหนักเมล็ดอยู่ในเกณฑ์ดี"}`;

    case "แก่":
      return `📌 ระยะแก่ (พร้อมเก็บเกี่ยว)
ข้าวสุกแก่เต็มที่ ข้าวจะดูดอาหารที่สะสมในใบแก่มาใช้เองในระยะนี้

สถานะธาตุอาหาร:
${nutrientStatus}

💊 คำแนะนำ:
- ไม่จำเป็นต้องใส่ปุ๋ยเพิ่มเติมในระยะนี้แล้ว
- เตรียมพื้นที่สำหรับเก็บเกี่ยวและเตรียมอุปกรณ์ให้พร้อม
- หลังเก็บเกี่ยวแนะนำให้ไถกลบฟางข้าวเพื่อคืนธาตุอาหารสู่ดินสำหรับฤดูกาลถัดไป`;

    default:
      return `⚠️ ไม่พบข้อมูลระยะการเจริญเติบโตของข้าว
สถานะธาตุอาหารปัจจุบัน:
${nutrientStatus}
กรุณาตรวจสอบการวิเคราะห์ภาพในระบบเพื่อระบุระยะข้าวให้ถูกต้อง`;
  }
}

function normalizeStage(stage) {
  if (!stage || typeof stage !== "string") return null;

  const cleaned = stage.trim();
  const compact = cleaned.replace(/\s+/g, "");

  // Fuzzy match to support variations such as "ระยะตั้งท้อง", "ตั้งท้อง", "ระยะต้นกล้า", etc.
  if (compact.includes("ระยะต้นกล้า")) return "ต้นกล้า";
  if (compact.includes("ระยะตั้งท้อง") || compact === "ท้อง" || compact.includes("ระยะท้อง")) return "ท้อง";
  if (compact.includes("ระยะออกรวง")) return "ออกรวง";
  if (compact.includes("ระยะสุกแก่") || compact.includes("เก็บเกี่ยว") || compact === "แก่") return "แก่";

  const map = {
    "ระยะต้นกล้า": "ต้นกล้า",
    "ต้นกล้า": "ต้นกล้า",
    "ระยะแตกกอ": "แตกกอ",
    "แตกกอ": "แตกกอ",
    "ระยะตั้งท้อง": "ท้อง",
    "ตั้งท้อง": "ท้อง",
    "ท้อง": "ท้อง",
    "ระยะออกรวง": "ออกรวง",
    "ออกรวง": "ออกรวง",
    "ระยะสุกแก่": "แก่",
    "สุกแก่": "แก่",
    "แก่": "แก่",
  };

  return map[cleaned] || cleaned;
}

async function resolveGrowthStage(deviceRegId, stageFromInput) {
  const normalizedInput = normalizeStage(stageFromInput);
  if (normalizedInput) {
    return normalizedInput;
  }

  const latestGrowth = await prisma.growth_Analysis.findFirst({
    where: {
      device_registrations_ID: deviceRegId,
      growth_stage: { not: "ไม่ผ่านเกณฑ์" },
    },
    orderBy: { created_at: "desc" },
    select: { growth_stage: true },
  });

  return normalizeStage(latestGrowth?.growth_stage) || "";
}


// ==================== SOIL ANALYSIS ====================
function analyzeSoilFull(n_mgPerKg, p_mgPerKg, k_mgPerKg, stage) {
  const nPercent = (n_mgPerKg / 0.1) / 10000;

  function checkN(value) {
    if (value < 0.05) return { level: "ต่ำมาก", advice: "แนะนำใส่ปุ๋ยประเภท Urea หรือ 46-0-0 เพื่อเพิ่มไนโตรเจนในดิน หากอยู่ในช่วงที่ข้าวต้องการไนโตรเจนมาก" };
    if (value >= 0.05 && value <= 0.09) return { level: "ต่ำ", advice: "แนะนำใส่ปุ๋ยประเภท Urea หรือ 46-0-0 เพื่อเพิ่มไนโตรเจนในดิน หากอยู่ในช่วงที่ข้าวต้องการไนโตรเจนมาก" };
    if (value >= 0.10 && value <= 0.14) return { level: "ปานกลาง", advice: "แนะนำใส่ปุ๋ยที่มีปริมาณไนโตรเจนไม่มากเกิน หรือใช้ปุ๋ยอินทรีย์แทน เพื่อคงระดับไนโตรเจนให้เหมาะสม" };
    if (value >= 0.15) return { level: "สูง", advice: "ปริมาณไนโตรเจนสูงหรือเหมาะสม ไม่ต้องใส่เพิ่มเติม" };
    return { level: "-", advice: "-" };
  }

  function checkP(value) {
    if (value < 3) return { level: "ต่ำมาก", advice: "แนะนำใส่ปุ๋ย DAP หรือ 18-46-0 เพื่อปรับโครงสร้างดิน หากอยู่ในช่วงต้นฤดูปลูก" };
    if (value >= 3 && value <= 10) return { level: "ต่ำ", advice: "แนะนำใส่ปุ๋ย DAP หรือ 18-46-0 เพื่อปรับโครงสร้างดิน หากอยู่ในช่วงต้นฤดูปลูก" };
    if (value >= 11 && value <= 25) return { level: "ปานกลาง", advice: "แนะนำใส่ปุ๋ยฟอสฟอรัสปริมาณน้อย หรือใช้ปุ๋ยคอกแทน เพื่อคงระดับฟอสฟอรัสให้เหมาะสม" };
    if (value >= 26 && value <= 45) return { level: "สูง", advice: "ปริมาณฟอสฟอรัสสูงหรือเหมาะสม ไม่ต้องใส่เพิ่มเติม หรือไถกลบฟางข้าวเพื่อรักษาระดับในระยะยาว" };
    if (value > 45) return { level: "สูงมาก", advice: "ปริมาณฟอสฟอรัสสูงมาก ไม่ต้องใส่เพิ่มเติม" };
    return { level: "-", advice: "-" };
  }

  function checkK(value) {
    if (value <= 30) return { level: "ต่ำมาก", advice: "ใส่ปุ๋ย KCL หรือ 0-0-60 เพื่อปรับโครงสร้างดิน หากอยู่ในช่วงที่ข้าวต้องการโพแทสเซียมมาก" };
    if (value >= 31 && value <= 60) return { level: "ต่ำ", advice: "ใส่ปุ๋ย KCL หรือ 0-0-60 เพื่อปรับโครงสร้างดิน หากอยู่ในช่วงที่ข้าวต้องการโพแทสเซียมมาก" };
    if (value >= 61 && value <= 90) return { level: "ปานกลาง", advice: "ใช้วิธีไถกลบฟางข้าวลงในแปลง เพื่อรักษาระดับโพแทสเซียมในดินในระยะยาว" };
    if (value >= 91 && value <= 120) return { level: "สูง", advice: "ปริมาณโพแทสเซียมสูงหรือเหมาะสม ไม่ต้องใส่เพิ่มเติม" };
    if (value > 120) return { level: "สูงมาก", advice: "ปริมาณโพแทสเซียมสูงมาก ไม่ต้องใส่เพิ่มเติม" };
    return { level: "-", advice: "-" };
  }

  const N = checkN(nPercent);
  const P = checkP(p_mgPerKg);
  const K = checkK(k_mgPerKg);

  return {
    N,
    P,
    K,
    stageAdvice: getStageAdvice(stage, N, P, K),
  };
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildSensorInput(args) {
  const [nArg, pArg, kArg, arg4, arg5, arg6] = args;

  // Backward compatibility: old signature analyzeSoilAndRice(n, p, k, device_code)
  if (typeof arg4 === "string" && arg5 == null && arg6 == null) {
    return {
      n: toNumberOrNull(nArg),
      p: toNumberOrNull(pArg),
      k: toNumberOrNull(kArg),
      stage: "",
      device_code: arg4,
    };
  }

  // Compatibility: analyzeSoilAndRice(n, p, k, stage, device_code)
  if (arg6 == null) {
    return {
      n: toNumberOrNull(nArg),
      p: toNumberOrNull(pArg),
      k: toNumberOrNull(kArg),
      stage: arg4 || "",
      device_code: arg5,
    };
  }

  // Compatibility: analyzeSoilAndRice(n, p, k, ph, stage, device_code) -> ignore ph
  const ignoredPh = arg4;
  void ignoredPh;

  return {
    n: toNumberOrNull(nArg),
    p: toNumberOrNull(pArg),
    k: toNumberOrNull(kArg),
    stage: arg5 || "",
    device_code: arg6,
  };
}


// ==================== MAIN EXPORT ====================
export const analyzeSoilAndRice = async (n_mgkg, p_mgkg, k_mgkg, stage, device_code) => {

  const n = toNumberOrNull(n_mgkg);
  const p = toNumberOrNull(p_mgkg);
  const k = toNumberOrNull(k_mgkg);

  if (!device_code) return { message: "ไม่พบรหัสอุปกรณ์", isUpdated: false };
  if (n == null || p == null || k == null) return { message: "ข้อมูล N/P/K ไม่ถูกต้อง", isUpdated: false };

  const registration = await prisma.device_registrations.findFirst({
    where: {
      Device: { device_code },
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

  const resolvedStage = await resolveGrowthStage(deviceRegId, stage);
  const result = analyzeSoilFull(n, p, k);
  const stageAdviceText = getStageAdvice(resolvedStage, result.N, result.P, result.K);
  const currentStatus = `${result.N.level}-${result.P.level}-${result.K.level}`;

  // ✅ ใช้ transaction ป้องกัน race condition
  const isUpdated = await prisma.$transaction(async (tx) => {

    // Lock: ดึง log ล่าสุดภายใน transaction
    const lastLog = await tx.logs_Alert.findFirst({
      where: {
        device_registrations_ID: deviceRegId,
        NOT: [
          { type: "Save_Data" },
          { type: "Level_High" },
          { type: "Level_Low" },
        ],
      },
      orderBy: { created_at: "desc" },
    });

    // ถ้าสถานะเหมือนเดิม → ไม่บันทึก
    if (lastLog && currentStatus === lastLog.type) {
      return false;
    }

    // บันทึก log ใหม่ทันทีภายใน transaction
    await tx.logs_Alert.create({
      data: {
        device_registrations_ID: deviceRegId,
        alert_message: `pending:${currentStatus}`, // placeholder ชั่วคราว
        type: currentStatus,
        created_at: new Date(),
      },
    });

    return true;
  });

  // ถ้าไม่มีการเปลี่ยนแปลง → หยุด
  if (!isUpdated) {
    console.log("ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่");
    return { message: "ระดับธาตุอาหารยังคงเดิม ไม่มีการแจ้งเตือนใหม่", isUpdated: false };
  }

  // สร้างข้อความเต็ม
  const fullMessage =
    `Paddy Smart Report
----------------------
รายงานคำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน

ระดับธาตุอาหารปัจจุบัน:
- N (ไนโตรเจน): ${result.N.level}
- P (ฟอสฟอรัส): ${result.P.level}
- K (โพแทสเซียม): ${result.K.level}

คำแนะนำรายธาตุ:
 N: ${result.N.advice}
 P: ${result.P.advice}
 K: ${result.K.advice}

 ระยะการเจริญเติบโต: ${resolvedStage || "ไม่ระบุ"}

 คำแนะนำตามระยะ:
${stageAdviceText}

`;

  // อัปเดต log ด้วยข้อความเต็ม (แทน placeholder)
  await prisma.logs_Alert.updateMany({
    where: {
      device_registrations_ID: deviceRegId,
      alert_message: `pending:${currentStatus}`,
      type: currentStatus,
    },
    data: {
      alert_message: fullMessage,
    },
  });

  // ส่ง LINE
  await sendLineNotify(userId, fullMessage);

  return { message: fullMessage, isUpdated: true };
};