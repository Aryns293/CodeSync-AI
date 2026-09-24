import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workspace = lazy(() => import('./features/workspace/WorkspacePage'));

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#0B0E14] bg-grid">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#0B0E14] bg-grid">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={
                    <div className="h-screen w-screen flex items-center justify-center bg-[#0B0E14] bg-grid">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                }>
                    <Routes>
                        <Route 
                            path="/" 
                            element={<PublicRoute><Landing /></PublicRoute>} 
                        />
                        <Route 
                            path="/login" 
                            element={<PublicRoute><Login /></PublicRoute>} 
                        />
                        <Route 
                            path="/register" 
                            element={<PublicRoute><Register /></PublicRoute>} 
                        />
                        <Route 
                            path="/dashboard" 
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
                        />
                        <Route 
                            path="/room/:roomId" 
                            element={<ProtectedRoute><Workspace /></ProtectedRoute>} 
                        />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}