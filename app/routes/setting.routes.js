import   { getdataSetting, updateSetting }  from "../controllers/setting.controller.js";
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
    "/api/setting/data",
    requireAuthMiddleware,
    getdataSetting
  );


    app.post(
    "/api/setting/update",
    requireAuthMiddleware,
    updateSetting
  );
  



};

