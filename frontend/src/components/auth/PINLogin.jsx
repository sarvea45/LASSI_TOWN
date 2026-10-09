import React, { useState, useEffect } from 'react';
import api from '../../api';
import useStore from '../../store/useStore';

export default function PINLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const setAuth = useStore((state) => state.setAuth);

  const handlePress = (num) => {
    if (pin.length < 4) setPin(pin + num);
  };

  const handleDel = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setPin(prev => prev.length < 4 ? prev + e.key : prev);
      } else if (e.key === 'Backspace') {
        handleDel();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) handleLogin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleLogin = async () => {
    try {
      setError('');
      const res = await api.post('/api/auth/login/pos', { pin_code: pin });
      
      // Parse JWT payload for basic user info
      const token = res.data.access_token;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      setAuth({
        token,
        user_id: payload.user_id,
        role: payload.role,
        branch_id: payload.branch_id
      });
    } catch (err) {
      setError('Invalid PIN');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Lassi Town POS</h2>
        
        <div className="flex justify-center mb-6">
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handlePress(num.toString())}
              className="h-16 text-2xl font-semibold bg-gray-50 rounded-lg shadow active:bg-gray-200 touch-manipulation"
            >
              {num}
            </button>
          ))}
          <button onClick={handleDel} className="h-16 text-xl font-semibold bg-red-50 text-red-600 rounded-lg shadow active:bg-red-100 touch-manipulation">
            DEL
          </button>
          <button onClick={() => handlePress('0')} className="h-16 text-2xl font-semibold bg-gray-50 rounded-lg shadow active:bg-gray-200 touch-manipulation">
            0
          </button>
          <button 
            onClick={handleLogin}
            disabled={pin.length !== 4}
            className="h-16 text-xl font-semibold bg-blue-600 text-white rounded-lg shadow disabled:opacity-50 active:bg-blue-700 touch-manipulation"
          >
            GO
          </button>
        </div>
      </div>
    </div>
  );
}
