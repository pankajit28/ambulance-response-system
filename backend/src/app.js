const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const ambulanceRoutes = require("./routes/ambulances");
const emergencyRoutes = require("./routes/emergencies");
const { notFound, errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());

  app.use((req, res, next) => {
    req.io = req.app.get("io");
    next();
  });

  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "ambulance-response-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/ambulances", ambulanceRoutes);
  app.use("/api/emergencies", emergencyRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
