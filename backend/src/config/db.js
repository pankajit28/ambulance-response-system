const mongoose = require("mongoose");

async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    global.dbMode = "mongo";
    console.log("MongoDB connected");
  } catch (err) {
    global.dbMode = "memory";
    console.warn("MongoDB is not running. Using in-memory data so you can still demo login.");
    console.warn(err.message);
    const { seedMemory } = require("../store/memoryDb");
    await seedMemory();
    console.log("Demo accounts (password: password123):");
    console.log("  patient@demo.com");
    console.log("  driver@demo.com");
    console.log("  dispatcher@demo.com");
  }
}

module.exports = { connectDb };
