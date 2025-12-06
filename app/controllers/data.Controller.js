import { prisma } from "../../lib/prisma.js";



export const getdatastatic = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    const devices = await prisma.device_registrations.findMany({
      where: { user_ID: user_id },
      include: {
        Area: true,
      }
    });

    if (devices.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลสถิติ" });
    }

    const results = [];

    for (const device of devices) {
      const sensorList = await prisma.permanent_Data.findMany({
        where: { device_registrations_ID: device.device_registrations_ID },
        distinct: ["sensor_type"],
        include: { Sensor_Type: true }
      });

      let stats = {};

      for (const sensor of sensorList) {
        const sensorType = sensor.sensor_type;
        const sensorName = sensor.Sensor_Type.name;

        const latest = await prisma.permanent_Data.findFirst({
          where: {
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          include: { Sensor_Type: true },
          orderBy: { measured_at: "desc" }
        });


        const allData = await prisma.permanent_Data.findMany({
          where: {
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          orderBy: { measured_at: "asc" }
        });

 
        const agg = await prisma.permanent_Data.aggregate({
          where: { 
            device_registrations_ID: device.device_registrations_ID,
            sensor_type: sensorType
          },
          _min: { value: true },
          _max: { value: true },
          _avg: { value: true }
        });

        stats[sensorName] = {
          latest: latest?.value || null,
          min: agg._min.value,
          max: agg._max.value,
          avg: agg._avg.value,
          unit: latest?.unit || null,
          all_data: allData.map(d => ({
            value: d.value,
            measured_at: d.measured_at,
            unit: d.unit
          }))
        };
      }

      results.push({
        device_registrations_ID: device.device_registrations_ID,
        device_ID: device.device_ID,
        device_status: device.status,
        area_name: device.Area.area_name,
        stats
      });
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching data static:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
