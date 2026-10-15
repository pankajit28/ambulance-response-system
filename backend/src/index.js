require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");
const { attachSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDb(process.env.MONGO_URI);

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  app.set("io", io);
  attachSocket(io);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`API + Socket.IO listening on http://127.0.0.1:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
