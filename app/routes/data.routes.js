import   {  getdatastatic }   from   "../controllers/data.Controller.js"  ;
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
    "/api/data/static",
    requireAuthMiddleware,
    getdatastatic
  );

   

};