const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true }, 
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
  attachments: [{ type: String }], 
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);
