import   {  getdatastatic ,   getDevicesByUser  ,  getdataPersonal , getdata_Device , getdata_history , GetData_devicebyID
   ,getData_dashboard , getdata_Growth_Analysis

 }   from   "../controllers/data.Controller.js"  ;
import { requireAuthMiddleware } from "../middleware/authJwt.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });


  app.get(
    "/api/data/devices",
    requireAuthMiddleware,
    getDevicesByUser 
  );



  // app.get(
  //   "/api/data/static",
  //   requireAuthMiddleware,
  //   getdatastatic
  // );


  app.get(
    "/api/data/personal",
    // requireAuthMiddleware,
    getdataPersonal
  );

  app.get(
    "/api/data/device",
    // requireAuthMiddleware,
    getdata_Device
  );


  app.get(
    "/api/data/history",
    requireAuthMiddleware,
    getdata_history
  );

  app.post(
    "/api/data/devicebyID",
    requireAuthMiddleware,
    GetData_devicebyID
  );


  app.get(
    "/api/data/dashboard",
    requireAuthMiddleware,
    getData_dashboard
  );


  app.get(
    "/api/data/growth-analysis",
    requireAuthMiddleware,
    getdata_Growth_Analysis
  );




   

};