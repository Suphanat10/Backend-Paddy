import express from "express";
import cors from "cors";
const app = express();
import authRoutes from "./app/routes/auth.routes.js";
import profileRoutes from "./app/routes/profile.routes.js";



const PORT = process.env.PORT || 8000;

app.set("trust proxy", true);
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "*",  
  credentials: true
}));

authRoutes(app);
profileRoutes(app);


app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});


