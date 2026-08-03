require("dotenv").config();

require("./config/firebaseService");

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");

const userRoutes = require("./routes/userRoutes");
const busRoutes = require("./routes/busRoutes");
const routeRoutes = require("./routes/routeRoutes");
const terminalRoutes = require("./routes/terminalRoutes");
const provinceRoutes = require("./routes/provinceRoutes");
const cityRoutes = require("./routes/cityRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const driverRoutes = require("./routes/driverRoutes");
const monitoringRoutes = require("./routes/monitoringRoutes");
const checkpointRoutes = require("./routes/checkpointRoutes");
const companyRoutes = require("./routes/companyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const driverDashboardRoutes = require("./routes/driverDashboardRoutes");
const locationRoutes = require("./routes/locationRoutes");
const driverTrackingRoutes = require("./routes/driverTrackingRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const passengerTrackingRoutes = require("./routes/passengerTrackingRoutes");
const passengerHomeRoutes = require("./routes/passengerHomeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const http = require("http"); 
const app = express(); 
const server = http.createServer(app); 
const io = require("socket.io")(server, { 
  cors: { origin: "*"
  } 
}); 
global.io = io; 

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/buses",busRoutes);
app.use("/api/routes", (req, res, next) => {
  console.log(
    "ROUTE API:",
    req.method,
    req.originalUrl
  );

  next();
}, routeRoutes);
app.use("/api/terminals", terminalRoutes);
app.use("/api/provinces",provinceRoutes);
app.use("/api/cities",cityRoutes);
app.use("/api/schedules",scheduleRoutes);
app.use( "/api/drivers", driverRoutes );
app.use("/api/monitoring",monitoringRoutes);
app.use("/api/checkpoints",checkpointRoutes);
app.use("/api/companies",companyRoutes);
app.use("/api/reports",reportRoutes);
app.use("/api/driver/dashboard",driverDashboardRoutes);
app.use("/api/location",locationRoutes);
app.use("/api/driver",driverTrackingRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/passenger/tracking",passengerTrackingRoutes);
app.use("/api/passenger/home",passengerHomeRoutes);
app.use("/api/notification",notificationRoutes);

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW()"
    );

    res.json({
      success: true,
      server_time: result.rows[0]
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(
//     `Server running on port ${PORT}`
//   );
// });
