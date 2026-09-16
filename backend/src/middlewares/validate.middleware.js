import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            // Redact sensitive fields before logging so plaintext passwords
            // never appear in server logs (e.g. on a failed login attempt).
            const { password, ...safeBody } = req.body ?? {};
            console.error('ZOD VALIDATION ERROR:', JSON.stringify(error.errors, null, 2), 'REQUEST BODY:', safeBody);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: error.errors,
            });
        }
        next(error);
    }
};
