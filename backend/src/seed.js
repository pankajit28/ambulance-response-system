require("dotenv").config();

const { connectDb } = require("./config/db");
const User = require("./models/User");
const Ambulance = require("./models/Ambulance");
const EmergencyRequest = require("./models/EmergencyRequest");

async function seed() {
  await connectDb(process.env.MONGO_URI);

  await Promise.all([
    User.deleteMany({}),
    Ambulance.deleteMany({}),
    EmergencyRequest.deleteMany({}),
  ]);

  const patient = await User.create({
    name: "Demo Patient",
    email: "patient@demo.com",
    password: "password123",
    role: "patient",
    phone: "9000000001",
  });

  const driver = await User.create({
    name: "Demo Driver",
    email: "driver@demo.com",
    password: "password123",
    role: "driver",
    phone: "9000000002",
  });

  const dispatcher = await User.create({
    name: "Demo Dispatcher",
    email: "dispatcher@demo.com",
    password: "password123",
    role: "dispatcher",
    phone: "9000000003",
  });

  await Ambulance.create({
    vehicleNumber: "DL-01-AMB-1001",
    driver: driver._id,
    hospitalName: "City General Hospital",
    status: "available",
    location: { type: "Point", coordinates: [77.2295, 28.6129] },
  });

  console.log("Seeded users:");
  console.log("  patient@demo.com / password123");
  console.log("  driver@demo.com / password123");
  console.log("  dispatcher@demo.com / password123");
  console.log({ patient: patient.email, driver: driver.email, dispatcher: dispatcher.email });

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
