// jest.globalSetup.js — runs once before any test modules are imported.
// Sets required env vars so auth.service.js doesn't throw at module-load time.
export default async function globalSetup() {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_do_not_use_in_prod';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_do_not_use_in_prod';
    process.env.NODE_ENV = 'test';
}
