// import { requireAuthMiddleware } from "../middleware/authJwt.js";
import { get_user ,  add_user  , delete_user , updateProfile , createFarmArea , updateFarmArea , createSubArea , updateSubArea , deleteSubArea
    , getDevices  , createDevice , deleteDevice , updateDevice , getDeviceRegistrations , GetData_devicebyID , GetdataLog  , GetdataLog_Logs_Alert   , update_system_settings , get_system_settings} from "../controllers/admin.controller.js";

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
    get_user
  );


  app.post(
    "/api/admin/create_user",
    add_user
  );

  app.post(
    "/api/admin/delete_user",
    delete_user
  );


  app.post(
    "/api/admin/update_profile",
    updateProfile
  );


  app.post(
    "/api/admin/farm/create",
    createFarmArea
  );



  app.post(
    "/api/admin/farm/update",
    updateFarmArea
  );

  app.post(
    "/api/admin/area/create",
    createSubArea
  );


  app.post(
    "/api/admin/area/update",
    updateSubArea
  );

  app.post(
    "/api/admin/area/delete",
    deleteSubArea
  );

  app.get(
    "/api/admin/devices",
    getDevices
  );

  app.post(
    "/api/admin/device/create",
    createDevice
  );


  app.post(
    "/api/admin/device/delete",
    deleteDevice
  );


  app.post(
    "/api/admin/device/update",
     updateDevice
  );

  app.get(
    "/api/admin/device_registrations",
    getDeviceRegistrations
  );

  app.post(
    "/api/admin/devicebyID",
    GetData_devicebyID
  );


  app.get(
    "/api/admin/log",
    GetdataLog
  );


  app.get(
    "/api/admin/log_alert",
    GetdataLog_Logs_Alert
  );

  app.post(
    "/api/admin/update_system_settings",
    update_system_settings
  );

  app.get(
    "/api/admin/get_system_settings",
    get_system_settings
  );



};