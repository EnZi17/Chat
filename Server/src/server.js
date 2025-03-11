require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const cors = require("cors");

// Kết nối DB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes (Chỉ sử dụng index.js)
app.use("/", require("./routes/index"));

// Socket.IO setup
require("./sockets/socket")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
