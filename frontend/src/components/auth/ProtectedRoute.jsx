import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const auth = useStore(state => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.role && !allowedRoles.includes(auth.role)) {
      alert("Permission Denied: Manager or Owner access required.");
      navigate('/pos');
    }
  }, [auth.role, allowedRoles, navigate]);

  if (!auth.token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(auth.role)) {
    return null; // Will redirect via useEffect
  }

  return children;
}
