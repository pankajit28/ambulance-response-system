const mongoose = require("mongoose");

const geoPoint = {
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], default: undefined },
};

const emergencyRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ambulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      default: null,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickupLocation: geoPoint,
    destination: geoPoint,
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "accepted", "en_route", "completed"],
      default: "pending",
    },
    acceptedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ pickupLocation: "2dsphere" });
emergencyRequestSchema.index({ status: 1, createdAt: -1 });

const mongooseRequest = mongoose.model("EmergencyRequest", emergencyRequestSchema);
const memory = require("../store/memoryDb");

module.exports = new Proxy(mongooseRequest, {
  get(target, prop) {
    const src = global.dbMode === "memory" ? memory.EmergencyRequest : target;
    const value = src[prop];
    return typeof value === "function" ? value.bind(src) : value;
  },
});
