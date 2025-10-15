import { Layers } from 'lucide-react';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Login failed - but you can still continue!');
      // still navigate in dev mode
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // quick login for dev
  const handleQuickLogin = async () => {
    setIsLoading(true);
    try {
      await login('demo@racksmith.com', 'demo');
      toast.success('Welcome!');
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg glow">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold gradient-text">RackSmith</h1>
            </div>
            <p className="text-gray-400">Network Infrastructure Manager</p>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader className='pt-8'>
            <CardTitle className="text-white text-center">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className='p-8'>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="glass border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="gradient"
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0d1117] px-2 text-gray-500">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="w-full"
              >
                Quick Demo Login
              </Button>

              <p className="text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-4">
          Development Mode: Click any button to continue
        </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}