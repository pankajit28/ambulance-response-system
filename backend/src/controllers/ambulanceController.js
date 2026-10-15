const Ambulance = require("../models/Ambulance");

async function updateMyStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!["available", "busy"].includes(status)) {
      return res.status(400).json({ message: "status must be available or busy" });
    }

    const ambulance = await Ambulance.findOneAndUpdate(
      { driver: req.user._id },
      { status },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance profile not found" });
    }

    req.io?.emit("ambulance:status", {
      ambulanceId: ambulance._id,
      status: ambulance.status,
    });

    res.json({ ambulance });
  } catch (err) {
    next(err);
  }
}

async function updateMyLocation(req, res, next) {
  try {
    const { lng, lat } = req.body;
    if (typeof lng !== "number" || typeof lat !== "number") {
      return res.status(400).json({ message: "lng and lat must be numbers" });
    }

    const ambulance = await Ambulance.findOneAndUpdate(
      { driver: req.user._id },
      { location: { type: "Point", coordinates: [lng, lat] } },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance profile not found" });
    }

    res.json({ ambulance });
  } catch (err) {
    next(err);
  }
}

async function nearby(req, res, next) {
  try {
    const lng = Number(req.query.lng);
    const lat = Number(req.query.lat);
    const maxDistance = Number(req.query.maxDistance) || 15000;

    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      return res.status(400).json({ message: "lng and lat query params are required" });
    }

    const ambulances = await Ambulance.find({
      status: "available",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance,
        },
      },
    }).populate("driver", "name phone");

    res.json({ ambulances });
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const ambulances = await Ambulance.find().populate("driver", "name phone email");
    res.json({ ambulances });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateMyStatus, updateMyLocation, nearby, listAll };
