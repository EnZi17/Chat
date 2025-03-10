const mongoose = require("mongoose");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Người dùng tham gia phòng trò chuyện (conversation)
        socket.on("joinRoom", (conversationId) => {
            socket.join(conversationId);
            console.log(`User joined room: ${conversationId}`);
        });

        // Gửi tin nhắn
        socket.on("sendMessage", async (messageData) => {
            try {
                // Tạo một tin nhắn mới và lưu vào database
                const { sender, content, conversationId, attachments } = messageData;

                // Tạo tin nhắn mới với dữ liệu nhận được
                const message = new Message({
                    sender,
                    content,
                    conversation: conversationId,
                    attachments: attachments || [],
                    readBy: [sender] // Khi gửi tin nhắn, người gửi sẽ là người đọc đầu tiên
                });

                // Lưu tin nhắn vào MongoDB
                await message.save();

                // Tìm cuộc trò chuyện (conversation)
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    return socket.emit("error", { message: "Cuộc trò chuyện không tồn tại!" });
                }

                // Phát tin nhắn đến tất cả người dùng trong phòng cuộc trò chuyện
                io.to(conversationId).emit("receiveMessage", message);
            } catch (error) {
                console.error("Error sending message:", error);
                socket.emit("error", { message: "Lỗi khi gửi tin nhắn!" });
            }
        });

        // Khi người dùng ngắt kết nối
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};
