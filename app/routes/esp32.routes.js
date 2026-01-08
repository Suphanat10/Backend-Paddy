import { connectDevice , generateDeviceToken  , openPump  , checkPump , updatePump , deletePump} from "../controllers/esp32.controller.js";
import { iSESp32 , requireAuthMiddleware } from "../middleware/authJwt.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
 

  app.post("/api/esp32/generate-token", 
    generateDeviceToken);


  app.post("/api/esp32/connect", 
    iSESp32,
   connectDevice);


   app.post("/api/esp32/open-pump", 

   openPump);

   app.post("/api/esp32/check-pump", 
    requireAuthMiddleware,
   checkPump);

   app.post("/api/esp32/update-pump", 
    requireAuthMiddleware,
   updatePump);


   app.post("/api/esp32/delete-pump", 
    requireAuthMiddleware,
   deletePump);


   

}