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
            console.error("ZOD VALIDATION ERROR:", JSON.stringify(error.errors, null, 2), "REQUEST BODY:", req.body);
            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: error.errors,
            });
        }
        next(error);
    }
};
