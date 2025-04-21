const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
    name: { type: String },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], 
    isGroup: { type: Boolean, default: false }, 
  }, { timestamps: true });
  
  module.exports = mongoose.model("Conversation", ConversationSchema);
  