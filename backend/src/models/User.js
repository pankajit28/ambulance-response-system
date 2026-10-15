const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["patient", "driver", "dispatcher"],
      default: "patient",
    },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
  };
};

const mongooseUser = mongoose.model("User", userSchema);
const memory = require("../store/memoryDb");

module.exports = new Proxy(mongooseUser, {
  get(target, prop) {
    const src = global.dbMode === "memory" ? memory.User : target;
    const value = src[prop];
    return typeof value === "function" ? value.bind(src) : value;
  },
});
