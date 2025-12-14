import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongo DB connected !! DB host :",connectionInstance.connection.host);


    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1);
    }
}

export default connectDB;