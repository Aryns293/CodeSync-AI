import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn("MONGODB_URI is missing, running in memory-only mode without persistence.");
            return;
        }
        
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
