import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '@/lib/api';
import { Label } from '@/components/ui/label';
import { PressButton } from '@/components/ui/PressButton';
import { Logo } from '@/components/ui/Logo';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, user } = response.data.data;
      login(token, user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: { message: string }[] } } };
      const data = axiosErr.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        setError(data.errors.map((e: { message: string }) => e.message).join(', '));
      } else {
        setError(data?.message || 'Registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gradient-bg flex min-h-screen w-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Logo variant="full" size="lg" />
            <p className="text-sm text-warm-500">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="register-name" className="text-warm-700 dark:text-warm-300 text-sm font-medium">Full Name</Label>
              <input
                id="register-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl bg-white/80 dark:bg-white/5 border border-warm-300/60 dark:border-white/10 text-warm-900 dark:text-cream-50 placeholder:text-warm-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-warm-700 dark:text-warm-300 text-sm font-medium">Email</Label>
              <input
                id="register-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl bg-white/80 dark:bg-white/5 border border-warm-300/60 dark:border-white/10 text-warm-900 dark:text-cream-50 placeholder:text-warm-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-warm-700 dark:text-warm-300 text-sm font-medium">Password</Label>
              <input
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-xl bg-white/80 dark:bg-white/5 border border-warm-300/60 dark:border-white/10 text-warm-900 dark:text-cream-50 placeholder:text-warm-400 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
              />
            </div>

            <PressButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </PressButton>

            <p className="text-center text-sm text-warm-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
