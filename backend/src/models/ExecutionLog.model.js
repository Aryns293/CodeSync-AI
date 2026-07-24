import mongoose from 'mongoose';

const executionLogSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional for guest executions
    },
    language: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    output: {
        type: String,
        default: '',
    },
    executionTimeMs: {
        type: Number,
    },
    success: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

export const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);
