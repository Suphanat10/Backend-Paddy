const express = require("express");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 8080;

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

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});


require("./app/routes/auth.routes")(app);
require("./app/routes/data.routes")(app);
require("./app/routes/agriculture.routes")(app);