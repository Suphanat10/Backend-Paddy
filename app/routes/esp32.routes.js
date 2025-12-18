import { connectDevice , generateDeviceToken } from "../controllers/esp32.controller.js";
import { iSESp32 } from "../middleware/authJwt.js";

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


}