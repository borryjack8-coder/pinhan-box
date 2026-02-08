import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, roles }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // 1. Check Login
    if (!token || !userStr) {
        return <Navigate to="/login" replace />;
    }

    // 2. Check Role
    if (roles && roles.length > 0) {
        const user = JSON.parse(userStr);
        if (!roles.includes(user.role)) {
            // Redirect to their appropriate dashboard if they are lost
            const target = user.role === 'admin' ? '/admin' : '/shop';
            return <Navigate to={target} replace />;
        }
    }

    return children;
};

export default PrivateRoute;
