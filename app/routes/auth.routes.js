import { login, register  , RequestOTP , line_login , line_reg  ,  logout } from "../controllers/auth.controller.js";

export default function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/auth/login", login);
  app.post("/api/auth/line-login", line_login);
  app.post("/api/auth/line-register", line_reg);
  app.post("/api/auth/register", register);
  app.post("/api/auth/logout", logout);

  app.post("/api/auth/request-otp", RequestOTP);
}
