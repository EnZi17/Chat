const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI||"mongodb+srv://enzi:enzi117@cluster0.uomnk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
