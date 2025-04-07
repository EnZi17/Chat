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
                    ws.room = new mongoose.Types.ObjectId(messageData.conversationId);
                    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(messageData.id) }, "_id");
                    console.log(`User joined room: ${user}`);
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

                        
                
                        // Gửi tin nhắn đến tất cả client trong room
                        clients.forEach((client) => {
                            if (client !== ws &&
                                client.room?.toString() === conversationId.toString()) {
                                client.send(message.content);
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
