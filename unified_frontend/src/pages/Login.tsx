import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Connects directly to the backend /api/v1/auth/login endpoint
      // as mandated by the Senior Frontend Engineering Master Prompt.
      const response = await apiClient.post('/api/v1/auth/login', { username, password });
      
      if (response.data.code === 200 && response.data.data?.token) {
        login(response.data.data.token, response.data.data.userinfo);
        navigate('/app/dashboard');
      } else {
        setError(response.data.msg || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || err.response?.data?.message || 'Network error connecting to Unified API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-xl shadow-lg mb-4" />
        <h2 className="text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          CalculatedRisk
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300">Username</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 bg-gray-800 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 bg-gray-800 rounded-md shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
