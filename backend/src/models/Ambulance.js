const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["available", "busy"],
      default: "available",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [77.209, 28.6139],
      },
    },
    hospitalName: { type: String, trim: true },
  },
  { timestamps: true }
);

ambulanceSchema.index({ location: "2dsphere" });
ambulanceSchema.index({ status: 1 });

const mongooseAmbulance = mongoose.model("Ambulance", ambulanceSchema);
const memory = require("../store/memoryDb");

module.exports = new Proxy(mongooseAmbulance, {
  get(target, prop) {
    const src = global.dbMode === "memory" ? memory.Ambulance : target;
    const value = src[prop];
    return typeof value === "function" ? value.bind(src) : value;
  },
});
