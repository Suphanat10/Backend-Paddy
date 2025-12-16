import { login, register  , RequestOTP } from "../controllers/auth.controller.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.post("/api/auth/request-otp", RequestOTP);
}
