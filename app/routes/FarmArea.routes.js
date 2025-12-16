import {  getFarmAreas , createFarmArea , updateFarmArea , deleteFarmArea , createSubArea , deleteSubArea , updateSubArea , registerDeviceToFarmArea , transferDevice
   , deleteDevice
 } from "../controllers/FarmArea.Controller.js";
import { requireAuthMiddleware } from "../middleware/authJwt.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/farm-area/create",
    requireAuthMiddleware,
    createFarmArea
  );

  app.post(
    "/api/farm-area/update",
    requireAuthMiddleware,
    updateFarmArea
  );


  app.get(
    "/api/farm-area/list",
    requireAuthMiddleware,
    getFarmAreas
  );

  app.post(
    "/api/farm-area/delete",
    requireAuthMiddleware,
    deleteFarmArea
  );

  app.post(
    "/api/farm-area/create-sub-area",
    requireAuthMiddleware,
    createSubArea
  );  


  app.post(
    "/api/farm-area/delete-sub-area",
    requireAuthMiddleware,
    deleteSubArea
  );
  

  app.post(
    "/api/farm-area/update-sub-area",
    requireAuthMiddleware,
    updateSubArea
  );


  app.post(
    "/api/register-device",
    requireAuthMiddleware,
    registerDeviceToFarmArea
  );


  app.post(
    "/api/transfer-device",
    requireAuthMiddleware,
    transferDevice
  );

  app.post(
    "/api/delete-device",
    requireAuthMiddleware,
    deleteDevice
  );

 

}
