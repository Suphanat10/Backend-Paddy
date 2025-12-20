// import { requireAuthMiddleware } from "../middleware/authJwt.js";
import { get_user ,  add_user  , delete_user , updateProfile , createFarmArea , updateFarmArea , createSubArea , updateSubArea , deleteSubArea , getFarmAreas , transferDevice , getData_Growth_Analysis , getDashboardOverview
    , getDevices  , createDevice , deleteDevice , updateDevice , getDeviceRegistrations , GetData_devicebyID , GetdataLog  , GetdataLog_Logs_Alert   , update_system_settings , get_system_settings} from "../controllers/admin.controller.js";


import { requireAuthMiddleware , isAdmin } from "../middleware/authJwt.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });


  app.get(
    "/api/admin/user",
    requireAuthMiddleware,
    isAdmin,
    get_user
  );


  app.post(
    "/api/admin/create_user",
    requireAuthMiddleware,
    isAdmin,
    add_user
  );

  app.post(
    "/api/admin/delete_user",
    requireAuthMiddleware,
    isAdmin,
    delete_user
  );


  app.post(
    "/api/admin/update_profile",
    requireAuthMiddleware,
    isAdmin,
    updateProfile
  );


  app.post(
    "/api/admin/farm/create",
    requireAuthMiddleware,
    isAdmin,
    createFarmArea
  );



  app.post(
    "/api/admin/farm/update",
    requireAuthMiddleware,
    isAdmin,
    updateFarmArea
  );

  app.post(
    "/api/admin/area/create",
    requireAuthMiddleware,
    isAdmin,
    createSubArea
  );


  app.post(
    "/api/admin/area/update",
    requireAuthMiddleware,
    isAdmin,
    updateSubArea
  );

  app.post(
    "/api/admin/area/delete",
    requireAuthMiddleware,
    isAdmin,
    deleteSubArea
  );

  app.get(
    "/api/admin/devices",
    requireAuthMiddleware,
    isAdmin,
    getDevices
  );

  app.post(
    "/api/admin/device/create",
    requireAuthMiddleware,
    isAdmin,
    createDevice
  );


  app.post(
    "/api/admin/device/delete",
    requireAuthMiddleware,
    isAdmin,
    deleteDevice
  );


  app.post(
    "/api/admin/device/update",
    requireAuthMiddleware,
    isAdmin,
     updateDevice
  );

  app.get(
    "/api/admin/device_registrations",
    requireAuthMiddleware,
    isAdmin,
    getDeviceRegistrations
  );

  app.post(
    "/api/admin/devicebyID",
    requireAuthMiddleware,
    isAdmin,
    GetData_devicebyID
  );


  app.get(
    "/api/admin/log",
    requireAuthMiddleware,
    isAdmin,
    GetdataLog
  );


  app.get(
    "/api/admin/log_alert",
    requireAuthMiddleware,
    isAdmin,
    GetdataLog_Logs_Alert
  );

  app.post(
    "/api/admin/update_system_settings",
    requireAuthMiddleware,
    isAdmin,
    update_system_settings
  );

  app.get(
    "/api/admin/get_system_settings",
    requireAuthMiddleware,
    isAdmin,
    get_system_settings
  );

  app.post(
    "/api/admin/get_farm_areas",
    requireAuthMiddleware,
    isAdmin,
    getFarmAreas
  );

  app.post(
    "/api/admin/transfer_device",
    requireAuthMiddleware,
    isAdmin,
    transferDevice
  );

  app.get(
    "/api/admin/get_data_growth_analysis",
    requireAuthMiddleware,
    isAdmin,
    getData_Growth_Analysis
  );

  app.get(
    "/api/admin/get_dashboard_overview",
    requireAuthMiddleware,
    isAdmin,
    getDashboardOverview
  );
 



};