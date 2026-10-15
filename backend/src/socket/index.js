const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Ambulance = require("../models/Ambulance");
const EmergencyRequest = require("../models/EmergencyRequest");

function attachSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id}`);
    if (user.role === "driver") {
      socket.join(`driver:${user._id}`);
    }
    if (user.role === "dispatcher") {
      socket.join("dispatch");
    }

    socket.on("join:user", ({ userId }) => {
      if (String(userId) === String(user._id)) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("join:driver", ({ driverId }) => {
      if (String(driverId) === String(user._id)) {
        socket.join(`driver:${driverId}`);
      }
    });

    socket.on("join:request", ({ requestId }) => {
      if (requestId) socket.join(`request:${requestId}`);
    });

    socket.on("location:update", async (payload = {}) => {
      try {
        const { requestId, lng, lat, ambulanceId } = payload;
        if (typeof lng !== "number" || typeof lat !== "number") {
          socket.emit("error", { message: "lng and lat must be numbers" });
          return;
        }

        let ambulance = null;
        if (user.role === "driver") {
          ambulance = await Ambulance.findOneAndUpdate(
            { driver: user._id },
            { location: { type: "Point", coordinates: [lng, lat] } },
            { new: true }
          );
        } else if (ambulanceId) {
          ambulance = await Ambulance.findByIdAndUpdate(
            ambulanceId,
            { location: { type: "Point", coordinates: [lng, lat] } },
            { new: true }
          );
        }

        const event = {
          lng,
          lat,
          ambulanceId: ambulance?._id || ambulanceId || null,
          driverId: user._id,
          requestId: requestId || null,
          at: new Date().toISOString(),
        };

        io.emit("ambulance:location", event);

        if (requestId) {
          io.to(`request:${requestId}`).emit("ambulance:location", event);
          const request = await EmergencyRequest.findById(requestId);
          if (request?.patient) {
            io.to(`user:${request.patient}`).emit("ambulance:location", event);
          }
        }
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("request:accept", async (payload = {}) => {
      try {
        if (user.role !== "driver") {
          socket.emit("error", { message: "Only drivers can accept requests" });
          return;
        }

        const { requestId } = payload;
        const ambulance = await Ambulance.findOne({ driver: user._id });
        if (!ambulance) {
          socket.emit("error", { message: "Ambulance profile not found" });
          return;
        }

        const request = await EmergencyRequest.findById(requestId);
        if (!request) {
          socket.emit("error", { message: "Request not found" });
          return;
        }
        if (request.status !== "pending") {
          socket.emit("error", { message: "Request is no longer pending" });
          return;
        }

        request.status = "accepted";
        request.driver = user._id;
        request.ambulance = ambulance._id;
        request.acceptedAt = new Date();
        await request.save();

        ambulance.status = "busy";
        await ambulance.save();

        const populated = await request.populate([
          { path: "patient", select: "name phone" },
          { path: "driver", select: "name phone" },
          { path: "ambulance" },
        ]);

        socket.join(`request:${request._id}`);

        const message = { request: populated };
        io.to(`request:${request._id}`).emit("request:accepted", message);
        io.to(`user:${request.patient}`).emit("request:accepted", message);
        io.to(`driver:${user._id}`).emit("request:accepted", message);
        io.to("dispatch").emit("request:accepted", message);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });
  });
}

module.exports = { attachSocket };
