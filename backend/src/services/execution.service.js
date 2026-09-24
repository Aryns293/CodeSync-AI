import { executeInSandbox, sandboxSupportsLanguage } from './docker.service.js';
import { executeWithJDoodle, jdoodleIsConfigured } from './jdoodle.service.js';
import { ExecutionLog } from '../models/ExecutionLog.model.js';

export const runCode = async ({ language, code, stdin, roomId, userId }) => {
    const USE_DOCKER_SANDBOX = process.env.USE_DOCKER_SANDBOX !== "false";
    const startTime = Date.now();
    let result = null;

    try {
        if (code && code.length > 100 * 1024) {
            result = { output: "Error: Code exceeds maximum allowed length of 100KB.", isError: true };
        } else if (USE_DOCKER_SANDBOX && sandboxSupportsLanguage(language)) {
            result = await executeInSandbox({ language, code, stdin });
            
            if (result.sandboxUnavailable) {
                if (jdoodleIsConfigured()) {
                    console.warn("Docker sandbox unavailable, falling back to JDoodle");
                    result = await executeWithJDoodle({ language, code, stdin });
                } else {
                    result = { output: "Error: Docker is not running on the server, and JDoodle fallback is not configured. Please start Docker.", isError: true };
                }
            }
        } else if (jdoodleIsConfigured()) {
            result = await executeWithJDoodle({ language, code, stdin });
        } else {
            result = { output: `Error: no execution provider configured for "${language}"`, isError: true };
        }

        const executionTimeMs = Date.now() - startTime;
        const success = result.isError ? false : true;

        // Save execution log
        await ExecutionLog.create({
            roomId,
            user: userId || null,
            language,
            code,
            output: result.output,
            executionTimeMs,
            success
        });

        return result;
    } catch (error) {
        console.error("runCode error:", error);
        
        await ExecutionLog.create({
            roomId,
            user: userId || null,
            language,
            code,
            output: `Error: ${error.message}`,
            executionTimeMs: Date.now() - startTime,
            success: false
        });

        return { output: `Error: ${error.message}` };
    }
};
