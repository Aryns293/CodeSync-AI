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

// TTL index: auto-delete logs after 30 days.
// Without this, the collection grows forever (full code + output per run,
// including guest sessions with no userId). 30 days gives useful audit history
// while preventing unbounded accumulation and data-retention liability.
executionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);
