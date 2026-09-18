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
            const issues = error.issues;
            // Redact sensitive fields before logging so plaintext passwords
            // never appear in server logs (e.g. on a failed login attempt).
            const { password, ...safeBody } = req.body ?? {};
            if (process.env.NODE_ENV !== 'test') {
                console.error('ZOD VALIDATION ERROR:', JSON.stringify(issues, null, 2), 'REQUEST BODY:', safeBody);
            }
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: issues,
            });
        }
        next(error);
    }
};
