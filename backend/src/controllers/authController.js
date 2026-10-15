const User = require("../models/User");
const Ambulance = require("../models/Ambulance");
const { signToken } = require("../middleware/auth");

async function register(req, res, next) {
  try {
    const { name, email, password, role, phone, vehicleNumber, hospitalName } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }

    const allowedRoles = ["patient", "driver", "dispatcher"];
    const resolvedRole = allowedRoles.includes(role) ? role : "patient";

    if (resolvedRole === "driver" && !vehicleNumber) {
      return res.status(400).json({ message: "Drivers must provide a vehicleNumber" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: resolvedRole,
      phone,
    });

    if (user.role === "driver") {
      await Ambulance.create({
        vehicleNumber,
        driver: user._id,
        hospitalName,
        status: "available",
        location: { type: "Point", coordinates: [77.209, 28.6139] },
      });
    }

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    let ambulance = null;
    if (req.user.role === "driver") {
      ambulance = await Ambulance.findOne({ driver: req.user._id });
    }
    res.json({ user: req.user.toSafeJSON(), ambulance });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
