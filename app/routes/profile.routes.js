import {
  changePassword,
  getProfile,
  updateProfile,
  getdataPofile_notification
} from "../controllers/profile.controller.js";
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
    "/api/profile/change-password",
    requireAuthMiddleware,
    changePassword
  );

  app.get("/api/profile", requireAuthMiddleware, getProfile);
  app.post("/api/profile/update", updateProfile);

  app.get("/api/auth/me", requireAuthMiddleware, getdataPofile_notification);
}
