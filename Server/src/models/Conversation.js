const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], 
    isGroup: { type: Boolean, default: false }, 
  }, { timestamps: true });
  
  module.exports = mongoose.model("Conversation", ConversationSchema);
  