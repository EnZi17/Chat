const mongoose = require("mongoose");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

module.exports = (wss, clients) => {
    wss.on("connection", (ws) => {
        console.log("New client connected");

        // Gán ID socket để quản lý danh sách client
        ws.id = new Date().getTime();
        clients.set(ws.id, ws);

        // Lắng nghe tin nhắn từ client
        ws.on("message", async (data) => {
            try {
                const messageData = JSON.parse(data);

                if (messageData.type === "joinRoom") {
                    // Lưu ID của user vào danh sách clients
                    ws.room = messageData.conversationId;
                    console.log(`User joined room: ${messageData.conversationId}`);
                }

                if (messageData.type === "sendMessage") {
                    const { sender, content, conversationId, attachments } = messageData;

                    // Tạo tin nhắn mới
                    const message = new Message({
                        sender,
                        content,
                        conversation: conversationId,
                        attachments: attachments || [],
                        readBy: [sender],
                    });

                    // Lưu tin nhắn vào MongoDB
                    await message.save();

                    // Tìm cuộc trò chuyện
                    const conversation = await Conversation.findById(conversationId);
                    if (!conversation) {
                        return ws.send(JSON.stringify({ type: "error", message: "Cuộc trò chuyện không tồn tại!" }));
                    }

                    // Gửi tin nhắn đến tất cả client trong room
                    clients.forEach((client) => {
                        if (client !== ws && client.room === conversationId) {
                            client.send(JSON.stringify({ type: "receiveMessage", message }));
                        }
                    });
                }
            } catch (error) {
                console.error("Error processing message:", error);
                ws.send(JSON.stringify({ type: "error", message: "Lỗi khi xử lý tin nhắn!" }));
            }
        });

        // Khi người dùng ngắt kết nối
        ws.on("close", () => {
            console.log("Client disconnected");
            clients.delete(ws.id);
        });
    });
};
