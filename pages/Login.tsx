import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
        // Retrieve registered users
        const users = JSON.parse(localStorage.getItem('hg_registered_users') || '[]');
        
        // Check credentials
        const validUser = users.find((u: any) => u.email === email && u.password === password);

        if (validUser) {
            login({ id: validUser.id, username: validUser.username, email: validUser.email });
            navigate('/dashboard');
        } else {
            // Demo fallback if no users exist yet and they try the hint credentials
            if (users.length === 0 && email === 'demo@example.com' && password === 'demo') {
                 login({ id: 'demo', username: 'Demo User', email: 'demo@example.com' });
                 navigate('/dashboard');
                 return;
            }
            
            if (users.length === 0) {
                 setError('No accounts found. Please Sign Up first.');
            } else {
                 setError('Invalid email or password.');
            }
        }
    } catch (err) {
        setError('Login failed due to a system error.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-lg shadow-sm">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-lg mb-4">
             <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sign In</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Welcome back to MediCare</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-md mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <div className="relative">
                <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
                <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            Log In
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Create Account
          </Link>
        </div>
        
        {/* Helper text for demo purposes if no users exist */}
        {!localStorage.getItem('hg_registered_users') && (
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/10 rounded text-xs text-center text-blue-800 dark:text-blue-200">
                <p><strong>Demo Mode:</strong> Sign up first, or use:</p>
                <p className="mt-1">Email: <code>demo@example.com</code> / Pass: <code>demo</code></p>
            </div>
        )}
      </div>
    </div>
  );
}