import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('FATAL: MONGODB_URI environment variable is not set. Server cannot start.');
        }
        
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
