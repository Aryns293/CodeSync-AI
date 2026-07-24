import { executeInSandbox, sandboxSupportsLanguage } from './docker.service.js';
import { executeWithJDoodle, jdoodleIsConfigured } from './jdoodle.service.js';
import { ExecutionLog } from '../models/ExecutionLog.model.js';

export const runCode = async ({ language, code, stdin, roomId, userId }) => {
    const USE_DOCKER_SANDBOX = process.env.USE_DOCKER_SANDBOX !== "false";
    const startTime = Date.now();
    let result = null;

    try {
        if (USE_DOCKER_SANDBOX && sandboxSupportsLanguage(language)) {
            result = await executeInSandbox({ language, code, stdin });
            
            if (
                result.output?.includes("Error: sandbox unavailable") ||
                result.output?.includes("failed to connect to the docker API") ||
                result.output?.includes("Is the docker daemon running?")
            ) {
                if (jdoodleIsConfigured()) {
                    console.warn("Docker sandbox unavailable, falling back to JDoodle");
                    result = await executeWithJDoodle({ language, code, stdin });
                } else {
                    result = { output: "Error: Docker is not running on the server, and JDoodle fallback is not configured. Please start Docker." };
                }
            }
        } else if (jdoodleIsConfigured()) {
            result = await executeWithJDoodle({ language, code, stdin });
        } else {
            result = { output: `Error: no execution provider configured for "${language}"` };
        }

        const executionTimeMs = Date.now() - startTime;
        const success = !result.output?.startsWith("Error:");

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
