const fs = require('fs');

const log = (msg) => console.log(msg);

const content = (file) => {
    try { return fs.readFileSync(file, 'utf8'); }
    catch { return ''; }
};

// 1. JWT secret
const authService = content('backend/src/services/auth.service.js');
log(`1. JWT Fallback: ${authService.includes('fallback_secret') ? 'FAIL' : 'PASS'}`);

// 2. JavaScript in Workspace dropdown
const workspace = content('frontend/src/pages/Workspace.jsx');
const jdoodle = content('backend/src/services/jdoodle.service.js');
const wsHasJs = workspace.includes('javascript') || workspace.includes('JavaScript');
const jdoodleHasJs = jdoodle.includes('nodejs') || jdoodle.includes('javascript');
log(`2. JS in UI/Backend: ${wsHasJs && !jdoodleHasJs ? 'FAIL' : 'PASS'}`);

// 3. Gemini model name
const gemini = content('backend/src/services/gemini.service.js');
log(`3. Gemini model: ${gemini.includes('gemini-3.1-flash-lite') ? 'FAIL' : 'PASS'}`);

// 4. Room schema
const roomModel = content('backend/src/models/Room.model.js');
log(`4. Room schema lastModifiedBy: ${roomModel.includes('lastModifiedBy') ? 'PASS' : 'FAIL'}`);

// 5. Refresh token endpoint
const authRoutes = content('backend/src/routes/auth.routes.js');
log(`5. Refresh route: ${authRoutes.includes('/refresh') ? 'PASS' : 'FAIL'}`);

// 6. Token in response body
const authController = content('backend/src/controllers/auth.controller.js');
log(`6. Token in response body: ${authController.match(/token\s*:/) ? 'FAIL (Check manually)' : 'PASS (Check manually)'}`);

// 7. CORS
const index = content('backend/index.js');
log(`7. CORS config: ${index.includes('origin: true') || index.includes("origin: '*'") ? 'FAIL' : 'PASS'}`);

// 8. WebSocket auth
const socketService = content('backend/src/services/socket.service.js');
log(`8. WS Auth: ${socketService.includes('socket.on("join"') && !socketService.includes('middleware') ? 'FAIL (Check manually)' : 'PASS (Check manually)'}`);

// 9. Room ID
const roomController = content('backend/src/controllers/room.controller.js');
log(`9. Room ID: ${roomController.includes('Math.random()') ? 'FAIL' : 'PASS'}`);

// 10. authLimiter
const rateLimiter = content('backend/src/middlewares/rateLimiter.middleware.js');
log(`10. authLimiter: ${rateLimiter.includes('max: 100') ? 'FAIL' : 'PASS'}`);

// 11. socket.off
log(`11. socket.off: ${workspace.includes('socket.off') ? 'PASS' : 'FAIL'}`);

// 12. Socket singleton
log(`12. Socket Singleton: ${workspace.includes('const socket = io') && !workspace.includes('useRef') ? 'FAIL' : 'PASS'}`);

// 13. Map cleanup
log(`13. Map cleanup: ${socketService.includes('rooms.delete') ? 'PASS' : 'FAIL'}`);

// 14. multer
const pkg = content('package.json');
log(`14. multer: ${pkg.includes('multer') ? 'FAIL' : 'PASS'}`);

// 15. body-parser
log(`15. body-parser: ${pkg.includes('body-parser') ? 'FAIL' : 'PASS'}`);

// 16. DS_Store
const dsStore = fs.existsSync('.DS_Store');
const gitignore = content('.gitignore');
log(`16. DS_Store: ${dsStore && !gitignore.includes('.DS_Store') ? 'FAIL' : 'PASS'}`);

// 18. Tests
log(`18. Tests: ${pkg.includes('jest') ? 'PASS' : 'FAIL'}`);

