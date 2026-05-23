require("dotenv").config();

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  const warningName = typeof warning === "string" ? args[0]?.type : warning?.name;
  const warningMessage = typeof warning === "string" ? warning : warning?.message;

  if (warningName === "ExperimentalWarning" && String(warningMessage || "").includes("SQLite")) {
    return;
  }

  return originalEmitWarning(warning, ...args);
};

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createServer } = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");

const { initializeDatabase, databasePath } = require("./config/db");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "trucks-up-local-secret";
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true
};
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions
});

initializeDatabase();
app.set("io", io);

app.use(
  cors(corsOptions)
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: databasePath
  });
});

app.use("/api/trucks", require("./routes/truckRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/loads", require("./routes/loadRoutes"));

const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const hasFrontendBuild = require("node:fs").existsSync(path.join(frontendDistPath, "index.html"));

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  if (!hasFrontendBuild) {
    return res.status(404).json({ message: "Frontend build not found. API is running." });
  }

  return res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error("UNHANDLED SERVER ERROR:", err);
  res.status(500).json({ message: "Unexpected server error." });
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token is required."));
    }

    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error("Invalid socket token."));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;
  socket.join(`user:${user.id}`);

  if (user.role === "driver") {
    socket.join("drivers");
    socket.join(`driver:${user.id}`);
  }

  if (user.role === "admin") {
    socket.join("admins");
  }
});

httpServer.listen(PORT, () => {
  console.log(`Trucks Up backend running on port ${PORT}`);
  console.log(`SQLite database ready at ${databasePath}`);
});
