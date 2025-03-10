const express = require("express");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Group = require("../models/Group");

const router = express.Router();

// Đăng ký người dùng
router.post("/users/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi đăng ký", error });
    }
});

// Đăng nhập người dùng
router.post("/users/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: "Tên đăng nhập không tồn tại" });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: "Mật khẩu không đúng" });
        }

        res.json({ userId: user._id });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi đăng nhập", error });
    }
});

// Lấy danh sách người dùng
router.get("/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng", error });
    }
});

// Tạo cuộc trò chuyện
router.post("/conversations", async (req, res) => {
    try {
        const { participants, isGroup } = req.body;

        const users = await User.find({ username: { $in: participants } }, "_id");
        const participantIds = users.map(user => user._id);

        if (participantIds.length !== participants.length) {
            return res.status(400).json({ message: "Có username không tồn tại" });
        }

        const conversation = new Conversation({ participants: participantIds, isGroup });
        await conversation.save();

        res.status(201).json(conversation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi khi tạo cuộc trò chuyện", error });
    }
});

// Lấy danh sách cuộc trò chuyện của một người dùng
router.get("/conversations/:userId", async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.params.userId });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy cuộc trò chuyện", error });
    }
});


// Tạo nhóm
router.post("/groups", async (req, res) => {
    try {
        const { name, members } = req.body;
        const group = new Group({ name, members });
        await group.save();
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tạo nhóm", error });
    }
});


module.exports = router;
