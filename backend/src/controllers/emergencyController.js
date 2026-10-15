const EmergencyRequest = require("../models/EmergencyRequest");
const Ambulance = require("../models/Ambulance");

function pointFromBody(body) {
  if (typeof body.lng !== "number" || typeof body.lat !== "number") return null;
  return { type: "Point", coordinates: [body.lng, body.lat] };
}

async function create(req, res, next) {
  try {
    const pickupLocation = pointFromBody(req.body);
    if (!pickupLocation) {
      return res.status(400).json({ message: "lng and lat are required numbers" });
    }

    const dest =
      typeof req.body.destLng === "number" && typeof req.body.destLat === "number"
        ? { type: "Point", coordinates: [req.body.destLng, req.body.destLat] }
        : undefined;

    const request = await EmergencyRequest.create({
      patient: req.user._id,
      pickupLocation,
      destination: dest,
      notes: req.body.notes,
      status: "pending",
    });

    const populated = await request.populate("patient", "name phone");

    req.io?.emit("request:new", { request: populated });

    res.status(201).json({ request: populated });
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const filter =
      req.user.role === "patient"
        ? { patient: req.user._id }
        : req.user.role === "driver"
          ? { driver: req.user._id }
          : {};

    const requests = await EmergencyRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("patient", "name phone")
      .populate("driver", "name phone")
      .populate("ambulance");

    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function pending(req, res, next) {
  try {
    const requests = await EmergencyRequest.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("patient", "name phone");
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const request = await EmergencyRequest.findById(req.params.id)
      .populate("patient", "name phone")
      .populate("driver", "name phone")
      .populate("ambulance");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ["accepted", "en_route", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (req.user.role === "driver") {
      const ambulance = await Ambulance.findOne({ driver: req.user._id });
      if (!ambulance) {
        return res.status(404).json({ message: "Ambulance profile not found" });
      }
      if (request.driver && String(request.driver) !== String(req.user._id)) {
        return res.status(403).json({ message: "This request belongs to another driver" });
      }
      if (!request.driver) {
        request.driver = req.user._id;
        request.ambulance = ambulance._id;
        request.acceptedAt = new Date();
        ambulance.status = "busy";
        await ambulance.save();
      }
      if (status === "completed") {
        ambulance.status = "available";
        await ambulance.save();
        request.completedAt = new Date();
      }
    }

    request.status = status;
    await request.save();

    const populated = await request.populate([
      { path: "patient", select: "name phone" },
      { path: "driver", select: "name phone" },
      { path: "ambulance" },
    ]);

    req.io?.to(`request:${request._id}`).emit("request:status", {
      request: populated,
    });
    req.io?.to(`user:${request.patient}`).emit("request:status", {
      request: populated,
    });
    if (request.driver) {
      req.io?.to(`driver:${request.driver}`).emit("request:status", {
        request: populated,
      });
    }

    res.json({ request: populated });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, mine, pending, getOne, updateStatus };
