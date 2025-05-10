const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const CryptoJS = require("crypto-js"); // dùng để mã hóa AES
const User = require("../models/User");
const router = express.Router();


const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Group = require("../models/Group");



// Secret key để mã hóa AES (giống trong Java)
const SECRET_KEY = "D9fSg6Y4N7hZ1K2p"; // Khóa mạnh hơn
const IV = "1234567890123456"; // IV giống như trong Java

function generateStrongPassword(length = 16) {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+[]{}|;:,.<>?";
    const all = uppercase + lowercase + numbers + specialChars;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    while (password.length < length) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

function encryptAES(plainText) {
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);  // IV giống nhau
    const encrypted = CryptoJS.AES.encrypt(plainText, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return encrypted.toString();
}

// Route gửi email reset password
router.post("/users/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        // Kiểm tra email có được gửi lên trong request không
        if (!email) {
            return res.status(400).json({ message: "Vui lòng cung cấp email" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng với email này" });
        }

        // Tạo mật khẩu mới
        const newPassword = generateStrongPassword(8);
        const encryptedPassword = encryptAES(newPassword); // mã hóa AES

        // Cấu hình nodemailer với Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "vominhthong117@gmail.com",  // hardcode email của bạn
                pass: "sxva pggr joiq ojua"        // hardcode mật khẩu ứng dụng
            }
        });

        // Cấu hình email
        const mailOptions = {
            from: '"Your App" <vominhthong117@gmail.com>',  // Địa chỉ email của bạn
            to: email,  // Gửi đến email nhận được trong body của request
            subject: "Mật khẩu mới từ hệ thống",
            text: `Mật khẩu mới của bạn là: ${newPassword}`
        };

        console.log(newPassword)

        // Gửi email
        await transporter.sendMail(mailOptions);

        // Lưu mật khẩu mã hóa vào database
        user.password = encryptedPassword;
        await user.save();

        res.json({ message: "✅ Mật khẩu mới đã được gửi qua email" });
    } catch (error) {
        console.error("❌ Lỗi:", error);
        res.status(500).json({ message: "❌ Có lỗi xảy ra khi gửi mật khẩu", error });
    }
});

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

// Đăng nhập người dùng bằng email
router.post("/users/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại" });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: "Mật khẩu không đúng" });
        }

        res.json(user);
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
        const { participants, isGroup, name } = req.body;

        // Lấy thông tin người dùng từ danh sách ID
        const users = await User.find({ _id: { $in: participants } }, "_id");

        // Kiểm tra nếu có ID nào không tồn tại
        const participantIds = users.map(user => user._id.toString()); // Chuyển đổi ObjectId thành chuỗi để so sánh
        if (participantIds.length !== participants.length) {
            return res.status(400).json({ message: "Có ID người dùng không tồn tại" });
        }

        // Tạo cuộc trò chuyện
        const conversation = new Conversation({
            participants: participantIds,
            isGroup,
            name: name || null // name là tùy chọn, nếu không có thì để null
        });

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
        res.status(501).json({ message: "Lỗi khi lấy cuộc trò chuyện", error });
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

// Cập nhật trạng thái online/offline
router.post("/users/status", async (req, res) => {
    try {
        const { userId, isOnline } = req.body;

        if (!userId || typeof isOnline !== "boolean") {
            return res.status(400).json({ message: "Thiếu userId hoặc isOnline không hợp lệ" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                isOnline,
                lastOnline: isOnline ? null : new Date()
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        res.json({ message: "Cập nhật trạng thái thành công", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái", error });
    }
});

// Lấy danh sách tin nhắn theo conversation ID
router.get("/messages/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;

        const messages = await Message.find({ conversation: conversationId })
            .populate("sender", "username") // nếu bạn muốn kèm thông tin người gửi
            .sort({ createdAt: 1 }); // sắp xếp theo thời gian tăng dần

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy tin nhắn", error });
    }
});

router.get("/users/status/by-conversation/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "Thiếu userId trong query" });
        }

        const conversation = await Conversation.findById(conversationId)
            .populate("participants", "username isOnline lastOnline");

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        if (conversation.participants.length !== 2) {
            return res.status(400).json({ message: "Không phải cuộc trò chuyện 1-1" });
        }

        // Tìm người còn lại
        const otherUser = conversation.participants.find(user => user._id.toString() !== userId);

        if (!otherUser) {
            return res.status(404).json({ message: "Không tìm thấy người còn lại" });
        }

        res.json({
            userId: otherUser._id,
            username: otherUser.username,
            isOnline: otherUser.isOnline,
            lastOnline: otherUser.lastOnline
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi khi lấy trạng thái người dùng", error });
    }
});

// Lấy thông tin người dùng theo ID
router.get("/users/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // Tìm người dùng theo ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng", error });
    }
});
// Lấy thông tin người dùng theo email
router.get("/users/by-email/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // Tìm người dùng theo email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng với email này" });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng", error });
    }
});
router.get("/conversations/info/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.query;

        const conversation = await Conversation.findById(conversationId)
            .populate("participants", "avatar username email isOnline lastOnline");

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        if (conversation.isGroup) {
            return res.json({ group: true, avatar: "group" });
        }

        // Nếu là cuộc trò chuyện 1-1, trả về thông tin người còn lại
        const otherParticipant = conversation.participants.find(
            user => user._id.toString() !== userId
        );

        if (!otherParticipant) {
            return res.status(404).json({ message: "Không tìm thấy người còn lại trong cuộc trò chuyện" });
        }

        res.json(otherParticipant); // Trả về toàn bộ thông tin người còn lại

    } catch (error) {
        console.error("Lỗi khi lấy thông tin conversation:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});



// Cập nhật avatar cho người dùng
router.post("/users/update-avatar/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { avatarUrl } = req.body;

        // Kiểm tra avatarUrl có được gửi lên trong body không
        if (!avatarUrl) {
            return res.status(400).json({ message: "Vui lòng cung cấp URL của avatar" });
        }

        // Tìm người dùng theo userId
        const user = await User.findById(userId);
        console.log(userId)

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        // Cập nhật avatar
        user.avatar = avatarUrl;

        // Lưu lại thay đổi
        await user.save();

        res.json({ message: "✅ Avatar đã được cập nhật", user });
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật avatar:", error);
        res.status(500).json({ message: "❌ Có lỗi xảy ra khi cập nhật avatar", error });
    }
});

router.post("/users/update-username/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { newName } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        // Cập nhật avatar
        user.username = newName;

        // Lưu lại thay đổi
        await user.save();

        res.json({ message: "Username đã được cập nhật", user });
    } catch (error) {
        console.error("Lỗi khi cập nhật tên:", error);
        res.status(500).json({ message: "Có lỗi xảy ra", error });
    }
});

module.exports = router;