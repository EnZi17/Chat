const mongoose = require("mongoose");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

module.exports = (wss, clients) => {
    wss.on("connection", (ws) => {
        console.log("New client connected");

        // Gán ID socket để quản lý danh sách client
        ws.id = new Date().getTime();
        ws.rooms = new Set();
        ws.userId = null;
        clients.set(ws.id, ws);

        // Lắng nghe tin nhắn từ client
        ws.on("message", async (data) => {
            try {
                const messageData = JSON.parse(data);

                if (messageData.type === "identify" && messageData.id) {
                    ws.userId = messageData.id.toString();
                    console.log(`User identified: ${ws.userId}`);
                }

                if (messageData.type === "joinRoom") {
                    if (messageData.id) {
                        ws.userId = messageData.id.toString();
                    }
                    if (messageData.conversationId) {
                        ws.rooms.add(messageData.conversationId.toString());
                    }
                    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(messageData.id) }, "_id");
                    console.log(`User joined room: ${user} -> ${messageData.conversationId}`);
                }
                if (messageData.type === "sendMessage") {
                    try {

                        let { sender, content, conversationId, attachments } = messageData;
                        const conversationIdObject = new mongoose.Types.ObjectId(conversationId);

                        // Tìm người gửi
                        const sendUser = await User.findOne({ _id: new mongoose.Types.ObjectId(sender) }, "_id");

                        if (!sendUser) {
                            return ws.send(JSON.stringify({ type: "error", message: "Người gửi không tồn tại!" }));
                        }

                        // Tạo tin nhắn mới
                        const message = new Message({
                            sender: sendUser._id,
                            content,
                            conversation: conversationIdObject,
                            attachments: attachments || [],
                            readBy: [sendUser._id],
                        });

                        // Lưu tin nhắn vào MongoDB
                        await message.save();



                        // Kiểm tra cuộc trò chuyện
                        const conversation = await Conversation.findById(conversationIdObject);

                        if (!conversation) {
                            return ws.send(JSON.stringify({ type: "error", message: "Cuộc trò chuyện không tồn tại!" }));
                        }



                        // Gửi tin nhắn đến tất cả client trong room hoặc là participant của cuộc trò chuyện
                        const convIdStr = conversationId.toString();
                        const participantIds = new Set(conversation.participants.map((p) => p.toString()));

                        clients.forEach((client) => {
                            if (client.readyState !== 1) return;
                            const inRoom = client.rooms?.has(convIdStr);
                            const isParticipant = client.userId && participantIds.has(client.userId);
                            if (inRoom || isParticipant) {
                                if (client !== ws) {
                                    // Gửi cho người khác trong room
                                    client.send(JSON.stringify({
                                        type: "newMessage",
                                        message
                                    }));
                                } else {
                                    // Gửi lại cho chính người gửi
                                    client.send(JSON.stringify({
                                        type: "myMessage",
                                        message
                                    }));
                                }
                            }
                        });



                    } catch (error) {
                        console.error("Lỗi khi xử lý tin nhắn:", error);
                        ws.send(JSON.stringify({ type: "error", message: "Lỗi server!" }));
                    }
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
