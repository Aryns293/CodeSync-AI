import { runCode } from '../services/execution.service.js';

export const executeCode = async (req, res, next) => {
    try {
        const { language, code, stdin, roomId } = req.body;
        
        const result = await runCode({
            language,
            code,
            stdin,
            roomId: roomId || 'api-execution',
            userId: req.user ? req.user._id : null
        });

        res.status(200).json({ success: true, run: result });
    } catch (error) {
        next(error);
    }
};
