import { CheckCircle, Eye, EyeOff, Layers, Loader2, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { getPasswordStrength, validateEmail, validateName, validatePassword, validatePasswordMatch } from '../../utils/validation';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (touched.name) {
      const validation = validateName(value);
      setErrors({ ...errors, name: validation.error || '' });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const validation = validateEmail(value);
      setErrors({ ...errors, email: validation.error || '' });
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);

    if (touched.password) {
      setErrors({ ...errors, password: validation.error || '' });
    }

    // Revalidate confirm password if it's been touched
    if (touched.confirmPassword && confirmPassword) {
      const matchValidation = validatePasswordMatch(value, confirmPassword);
      setErrors({ ...errors, password: validation.error || '', confirmPassword: matchValidation.error || '' });
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const validation = validatePasswordMatch(password, value);
      setErrors({ ...errors, confirmPassword: validation.error || '' });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    // Validate all fields
    const nameValidation = validateName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validatePasswordMatch(password, confirmPassword);

    const newErrors = {
      name: nameValidation.error || '',
      email: emailValidation.error || '',
      password: passwordValidation.error || '',
      confirmPassword: confirmPasswordValidation.error || ''
    };

    setErrors(newErrors);

    // Check if there are any errors
    if (Object.values(newErrors).some(error => error !== '')) {
      const firstError = Object.values(newErrors).find(error => error !== '');
      toast.error(firstError || 'Please fix the errors');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
    }
  };

  const getStrengthWidth = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak':
        return 'w-1/3';
      case 'medium':
        return 'w-2/3';
      case 'strong':
        return 'w-full';
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
            <p className="text-gray-400">Create your account</p>
          </div>

        <Card className="glass-card border-white/10">
          <CardHeader className='pt-8'>
            <CardTitle className="text-white text-center">Get Started</CardTitle>
          </CardHeader>
          <CardContent className='p-8'>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => {
                    setTouched({ ...touched, name: true });
                    const validation = validateName(name);
                    setErrors({ ...errors, name: validation.error || '' });
                  }}
                  placeholder="John Doe"
                  className={`glass border-white/10 text-white placeholder:text-gray-500 ${
                    errors.name && touched.name ? 'border-red-500/50' : ''
                  }`}
                  disabled={isLoading}
                />
                {errors.name && touched.name && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    setTouched({ ...touched, email: true });
                    const validation = validateEmail(email);
                    setErrors({ ...errors, email: validation.error || '' });
                  }}
                  placeholder="you@example.com"
                  className={`glass border-white/10 text-white placeholder:text-gray-500 ${
                    errors.email && touched.email ? 'border-red-500/50' : ''
                  }`}
                  disabled={isLoading}
                />
                {errors.email && touched.email && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => {
                      setTouched({ ...touched, password: true });
                      const validation = validatePassword(password);
                      setErrors({ ...errors, password: validation.error || '' });
                    }}
                    placeholder="••••••••"
                    className={`glass border-white/10 text-white placeholder:text-gray-500 pr-10 ${
                      errors.password && touched.password ? 'border-red-500/50' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength ? getStrengthColor(passwordStrength) : ''
                          } ${passwordStrength ? getStrengthWidth(passwordStrength) : 'w-0'}`}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 capitalize">
                      Password strength: <span className={
                        passwordStrength === 'strong' ? 'text-green-400' :
                        passwordStrength === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }>{passwordStrength}</span>
                    </p>
                  </div>
                )}

                {errors.password && touched.password && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    onBlur={() => {
                      setTouched({ ...touched, confirmPassword: true });
                      const validation = validatePasswordMatch(password, confirmPassword);
                      setErrors({ ...errors, confirmPassword: validation.error || '' });
                    }}
                    placeholder="••••••••"
                    className={`glass border-white/10 text-white placeholder:text-gray-500 pr-10 ${
                      errors.confirmPassword && touched.confirmPassword ? 'border-red-500/50' :
                      confirmPassword && !errors.confirmPassword && touched.confirmPassword ? 'border-green-500/50' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && touched.confirmPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword && !errors.confirmPassword && touched.confirmPassword && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="gradient"
                className="w-full"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
