import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from '@/components/Icon';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLogin(email, password); // Use email for login
    if (!success) {
      setError('Email ou mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-600 to-teal-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <Card className="max-w-md w-full shadow-2xl glass fade-in relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-cyan-600 via-blue-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img src="https://page1.genspark.site/v1/base64_upload/85255e9e3f43d5940a170bdbd6d7b858" alt="Logo CDL" className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">Centre Diagnostic Libreville</CardTitle>
          <CardDescription className="text-base mt-2">Système de Gestion Intégré</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="transition-all duration-200 focus:ring-2 focus:ring-cyan-500"
                placeholder="votre@email.com"
              />
            </div>
            <div className="relative space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Mot de passe</label>
              <Input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="transition-all duration-200 focus:ring-2 focus:ring-cyan-500 pr-10"
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-9 h-7 w-7 hover:bg-gray-100"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'EyeOff' : 'Eye'} className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <Icon name="AlertCircle" className="mr-2 h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200 btn-animate">
              <Icon name="LogIn" className="mr-2 h-5 w-5" /> Se connecter
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              className="text-cyan-600 hover:text-cyan-700 font-medium" 
              onClick={() => setIsForgotPasswordOpen(true)}
            >
              Mot de passe oublié ?
            </Button>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        isOpen={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </div>
  );
};

export default LoginPage;