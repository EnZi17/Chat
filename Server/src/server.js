require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const connectDB = require("./config/db");
const cors = require("cors");

// Kết nối DB
connectDB();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Routes (Chỉ sử dụng index.js)
app.use("/", require("./routes/index"));

// Danh sách client connections
const clients = new Map();

// Import socket xử lý sự kiện WebSocket
require("./sockets/socket")(wss, clients);

const PORT = process.env.PORT || 5000;


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
