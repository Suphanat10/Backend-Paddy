// import cron from 'node-cron';
// import { prisma } from "../../lib/prisma.js";
// import { realtimeService } from "./realtimeService.js";

// const startDeviceStatusMonitor = () => {

//     setInterval(async () => {

//         const devices = await prisma.device_registrations.findMany({
//             where: { status: 'active' },
//             select: {

//                 Device: {
//                     select: {
//                         device_code: true
//                     }
//                 },

//                 User_Settings: {
//                     select: {
//                         growth_analysis_period: true
//                     },
//                     take: 1
//                 },

//                 Growth_Analysis: {
//                     select: {
//                         created_at: true
//                     },
//                     orderBy: { created_at: 'desc' },
//                     take: 1
//                 }

//             }
//         });

//         const today = new Date();

//         for (const reg of devices) {

//             const deviceCode = reg.Device.device_code;
//             const period = reg.User_Settings?.[0]?.growth_analysis_period ?? 3;
//             const lastAnalysis = reg.Growth_Analysis?.[0];

//             let status = 'not_due';
//             let daysSinceLast = null;

//             if (lastAnalysis) {

//                 const lastDate = new Date(lastAnalysis.created_at);

//                 const diffDays = Math.floor(
//                     (today.getTime() - lastDate.getTime()) /
//                     (1000 * 60 * 60 * 24)
//                 );

//                 daysSinceLast = diffDays;

//                 if (diffDays >= period) {
//                     status = 'due';
//                 }

//             } else {
//                 status = 'due';
//             }

//             realtimeService.notifyDeviceScheduleStatus(deviceCode, status, {
//                 growth_period: period,
//                 days_since_last: daysSinceLast,
//                 days_remaining: daysSinceLast === null ? null : period - daysSinceLast
//             });

//         }

//     }, 30000);

// };

// const startRealtimeMonitor = () => {

//     setInterval(() => {

//         const stats = realtimeService.getStats();

//         realtimeService.emitSchedulerLog('heartbeat', {
//             queue: stats.queue,
//             health: stats.health
//         });

//     }, 10000); // ทุก 10 วินาที

// };

// const logDeviceStatus = async (data) => {
//     try {
//         await prisma.scheduler_device_logs.create({
//             data: {
//                 device_id: data.device_id,
//                 device_code: data.device_code,
//                 status: data.status,
//                 growth_period: data.growth_period,
//                 days_since_last: data.days_since_last ?? null,
//                 days_remaining: data.days_remaining ?? null,
//                 message: data.message
//             }
//         });
//     } catch (err) {
//         console.error("Log insert error:", err.message);
//     }
// };


// const initScheduler = () => {

//     cron.schedule("32 14 * * *", async () => {

//         console.log("--- Scheduler Daily Check Started ---");

//         realtimeService.notifySchedulerStart();

//         try {

//             const activeRegistrations = await prisma.device_registrations.findMany({
//                 where: { status: "active" },
//                 select: {

//                     device_registrations_ID: true,

//                     Device: {
//                         select: {
//                             device_ID: true,
//                             device_code: true
//                         }
//                     },

//                     User_Settings: {
//                         select: {
//                             growth_analysis_period: true
//                         },
//                         orderBy: { user_settings_ID: "desc" },
//                         take: 1
//                     },

//                     Growth_Analysis: {
//                         select: {
//                             created_at: true
//                         },
//                         orderBy: { created_at: "desc" },
//                         take: 1
//                     }

//                 }
//             });

//             const today = new Date();

//             let totalDevices = 0;
//             let queuedCount = 0;
//             let notDueCount = 0;
//             let errorCount = 0;

//             for (const reg of activeRegistrations) {

//                 totalDevices++;

//                 const deviceId = reg.Device.device_ID;
//                 const deviceCode = reg.Device.device_code;

//                 const period = reg.User_Settings?.[0]?.growth_analysis_period ?? 3;

//                 realtimeService.notifyDeviceScheduleStatus(deviceCode, "checking", {
//                     growth_period: period
//                 });

//                 await logDeviceStatus({
//                     device_id: deviceId,
//                     device_code: deviceCode,
//                     status: "checking",
//                     growth_period: period,
//                     message: "Scheduler checking device"
//                 });

//                 const lastAnalysis = reg.Growth_Analysis?.[0];

//                 let shouldCapture = false;
//                 let daysSinceLastAnalysis = null;

//                 if (!lastAnalysis) {

//                     shouldCapture = true;

//                     await logDeviceStatus({
//                         device_id: deviceId,
//                         device_code: deviceCode,
//                         status: "never_analyzed",
//                         growth_period: period,
//                         message: "Device never analyzed before"
//                     });

//                 } else {

//                     const lastDate = new Date(lastAnalysis.created_at);

//                     const diffDays = Math.floor(
//                         (today - lastDate) / (1000 * 60 * 60 * 24)
//                     );

//                     daysSinceLastAnalysis = diffDays;

//                     if (diffDays >= period) {
//                         shouldCapture = true;
//                     }

//                 }

//                 if (shouldCapture) {

//                     const result = await realtimeService.takePhoto(deviceCode);

//                     if (result.success) {

//                         queuedCount++;

//                         realtimeService.notifyDeviceScheduleStatus(deviceCode, "queued", {
//                             growth_period: period,
//                             days_since_last: daysSinceLastAnalysis,
//                             command_id: result.commandId
//                         });

//                         await logDeviceStatus({
//                             device_id: deviceId,
//                             device_code: deviceCode,
//                             status: "queued",
//                             growth_period: period,
//                             days_since_last: daysSinceLastAnalysis,
//                             message: "Photo capture command queued"
//                         });

//                     } else {

//                         errorCount++;

//                         await logDeviceStatus({
//                             device_id: deviceId,
//                             device_code: deviceCode,
//                             status: "error",
//                             growth_period: period,
//                             message: result.reason
//                         });

//                     }

//                 } else {

//                     notDueCount++;

//                     realtimeService.notifyDeviceScheduleStatus(deviceCode, "not_due", {
//                         growth_period: period,
//                         days_since_last: daysSinceLastAnalysis,
//                         days_remaining: period - daysSinceLastAnalysis
//                     });

//                     await logDeviceStatus({
//                         device_id: deviceId,
//                         device_code: deviceCode,
//                         status: "not_due",
//                         growth_period: period,
//                         days_since_last: daysSinceLastAnalysis,
//                         days_remaining: period - daysSinceLastAnalysis,
//                         message: "Device not due for analysis"
//                     });

//                 }

//             }

//             realtimeService.notifySchedulerComplete({
//                 total_devices: totalDevices,
//                 queued: queuedCount,
//                 not_due: notDueCount,
//                 errors: errorCount
//             });

//             console.log(
//                 `✅ Scheduler Completed: ${totalDevices} devices (Queued: ${queuedCount}, Not Due: ${notDueCount}, Errors: ${errorCount})`
//             );

//         } catch (error) {

//             console.error("Scheduler Error:", error);

//             realtimeService.emitSchedulerLog("error", {
//                 message: "Scheduler failure",
//                 error: error.message
//             });

//         }

//     });

//     console.log("⏳ Scheduler initialized and waiting for daily execution...");

// };

// export default initScheduler;
import cron from "node-cron";
import pLimit from "p-limit";
import { prisma } from "../../lib/prisma.js";
import { realtimeService } from "./realtimeService.js";

let schedulerTask = null;
let currentCron = null;
let schedulerRunning = false;

const limit = pLimit(5);

/* -----------------------------
DEVICE STATUS LOG
------------------------------*/

const logDeviceStatus = async (data) => {

    try {

        await prisma.scheduler_device_logs.create({
            data: {
                device_id: data.device_id,
                device_code: data.device_code,
                status: data.status,
                growth_period: data.growth_period,
                days_since_last: data.days_since_last ?? null,
                days_remaining: data.days_remaining ?? null,
                message: data.message
            }
        });

    } catch (err) {

        console.error("Log insert error:", err.message);

    }

};


/* -----------------------------
FAST DEVICE FETCH
------------------------------*/

const getActiveDevices = async () => {

    return prisma.$queryRaw`

SELECT
  dr.device_registrations_ID,
  d.device_ID,
  d.device_code,
  COALESCE(us.growth_analysis_period,3) AS period,
  ga.last_analysis

FROM device_registrations dr

JOIN Device d
ON d.device_ID = dr.device_ID

LEFT JOIN (
    SELECT
        device_registrations_ID,
        MAX(created_at) AS last_analysis
    FROM Growth_Analysis
    GROUP BY device_registrations_ID
) ga
ON ga.device_registrations_ID = dr.device_registrations_ID

LEFT JOIN (
    SELECT us1.device_registrations_ID, us1.growth_analysis_period
    FROM User_Settings us1
    JOIN (
        SELECT device_registrations_ID,
        MAX(user_settings_ID) AS latest
        FROM User_Settings
        GROUP BY device_registrations_ID
    ) us2
    ON us1.user_settings_ID = us2.latest
) us
ON us.device_registrations_ID = dr.device_registrations_ID

WHERE dr.status = 'active'

`;

};


/* -----------------------------
PROCESS DEVICE
------------------------------*/

const processDevice = async (dev, today) => {

    const deviceId = dev.device_ID;
    const deviceCode = dev.device_code;
    const period = dev.period;

    let shouldCapture = false;
    let daysSinceLast = null;
    let daysRemaining = null;

    try {

        if (!dev.last_analysis) {

            shouldCapture = true;

        } else {

            const lastDate = new Date(dev.last_analysis);

            const diffDays = Math.floor(
                (today - lastDate) / (1000 * 60 * 60 * 24)
            );

            daysSinceLast = diffDays;
            daysRemaining = period - diffDays;

            if (diffDays >= period) shouldCapture = true;

        }

        /* CAPTURE */

        if (shouldCapture) {


            const result = await realtimeService.takePhoto(deviceCode);

            if (!result.success) {

                await logDeviceStatus({
                    device_id: deviceId,
                    device_code: deviceCode,
                    status: "error",
                    growth_period: period,
                    days_since_last: daysSinceLast,
                    days_remaining: daysRemaining,
                    message: result.reason
                });

                return "error";
            }

            await logDeviceStatus({
                device_id: deviceId,
                device_code: deviceCode,
                status: "queued",
                growth_period: period,
                days_since_last: daysSinceLast,
                days_remaining: daysRemaining,
                message: "Photo capture command queued"
            });

            return "queued";

        }

        await logDeviceStatus({
            device_id: deviceId,
            device_code: deviceCode,
            status: "not_due",
            growth_period: period,
            days_since_last: daysSinceLast,
            days_remaining: daysRemaining,
            message: "Device not due for analysis"
        });

        return "not_due";

    } catch (error) {

        console.error(`❌ Device processing error: ${deviceCode}`, error);

        await logDeviceStatus({
            device_id: deviceId,
            device_code: deviceCode,
            status: "error",
            growth_period: period,
            days_since_last: daysSinceLast,
            days_remaining: daysRemaining,
            message: error.message
        });

        return "error";
    }

};


/* -----------------------------
SCHEDULER JOB
------------------------------*/

const runSchedulerJob = async () => {

    if (schedulerRunning) {
        console.log("Scheduler already running");
        return;
    }

    schedulerRunning = true;

    console.log("Scheduler Started");

    realtimeService.notifySchedulerStart();

    try {

        const devices = await getActiveDevices();
        const today = new Date();

        let queuedCount = 0;
        let notDueCount = 0;
        let errorCount = 0;

        const results = await Promise.all(
            devices.map(dev =>
                limit(() => processDevice(dev, today))
            )
        );

        for (const r of results) {

            if (r === "queued") queuedCount++;
            else if (r === "not_due") notDueCount++;
            else errorCount++;

        }

        realtimeService.notifySchedulerComplete({
            total_devices: devices.length,
            queued: queuedCount,
            not_due: notDueCount,
            errors: errorCount
        });

        console.log(
            `✅ Scheduler Completed | Total:${devices.length} | Queued:${queuedCount} | NotDue:${notDueCount} | Errors:${errorCount}`
        );

    } catch (error) {

        console.error("🔥 Scheduler Fatal Error:", error);

    } finally {

        schedulerRunning = false;

    }

};


/* -----------------------------
LOAD SCHEDULER TIME
------------------------------*/

const loadScheduler = async () => {

    const settings = await prisma.system_settings.findFirst();

    if (!settings?.scheduler_time) return;

    const time = new Date(settings.scheduler_time);

    const hour = time.getUTCHours();
    const minute = time.getUTCMinutes();

    const cronExp = `${minute} ${hour} * * *`;

    if (cronExp === currentCron) return;

    console.log("Updating Scheduler:", cronExp);

    if (schedulerTask) schedulerTask.stop();

    schedulerTask = cron.schedule(
        cronExp,
        runSchedulerJob,
        { timezone: "Asia/Bangkok" }
    );

    currentCron = cronExp;

};


/* -----------------------------
DEVICE STATUS MONITOR
------------------------------*/

const startDeviceStatusMonitor = () => {

    setInterval(async () => {

        const devices = await getActiveDevices();
        const today = new Date();

        await Promise.all(devices.map(async dev => {

            const deviceCode = dev.device_code;
            const period = dev.period;

            let status = "not_due";
            let daysSinceLast = null;

            if (dev.last_analysis) {

                const lastDate = new Date(dev.last_analysis);

                const diffDays = Math.floor(
                    (today - lastDate) / (1000 * 60 * 60 * 24)
                );

                daysSinceLast = diffDays;

                if (diffDays >= period) status = "due";

            } else {

                status = "due";

            }

            realtimeService.notifyDeviceScheduleStatus(deviceCode, status, {
                growth_period: period,
                days_since_last: daysSinceLast,
                days_remaining:
                    daysSinceLast === null ? null : period - daysSinceLast
            });

        }));

    }, 30000);

};


/* -----------------------------
INIT
------------------------------*/

const initScheduler = async () => {

    await loadScheduler();

    setInterval(loadScheduler, 30000);

    startDeviceStatusMonitor();

    console.log("⏳ Dynamic Scheduler initialized");

};

export default initScheduler;