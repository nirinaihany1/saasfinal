import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: (email: string) => Promise<void>;
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSubmit, 
  onSwitchToSignUp, 
  onForgotPassword,
  isLoading = false 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'L\'email est requis';
    if (!password) newErrors.password = 'Le mot de passe est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(email, password);
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      setErrors({ email: 'L\'email est requis pour réinitialiser le mot de passe' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setErrors({ email: 'Format d\'email invalide' });
      return;
    }
    
    setIsSendingReset(true);
    
    try {
      if (onForgotPassword) {
        await onForgotPassword(forgotPasswordEmail);
      }
      setShowForgotPassword(false);
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" padding="lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Connexion Sécurisée</h2>
        <p className="text-gray-600 mt-2">Accédez à votre espace SaaS POS</p>
      </div>

      {!showForgotPassword ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Adresse email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
            placeholder="votre@email.com"
            error={errors.email}
            required
            disabled={isLoading}
          />

          <Input
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-5 h-5 text-gray-400" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            placeholder="••••••••"
            error={errors.password}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
            className="mt-8"
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              Entrez votre adresse email ci-dessous. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>
          
          <Input
            label="Adresse email"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
            placeholder="votre@email.com"
            error={errors.email}
            required
            disabled={isSendingReset}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={isSendingReset}
              onClick={() => setShowForgotPassword(false)}
            >
              Annuler
            </Button>
            
            <Button
              type="submit"
              fullWidth
              disabled={isSendingReset}
            >
              {isSendingReset ? 'Envoi en cours...' : 'Envoyer le lien'}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center">
        {!showForgotPassword && (
          <button 
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={isLoading}
            onClick={() => {
              setShowForgotPassword(true);
              setForgotPasswordEmail(email);
            }}
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>

      {onSwitchToSignUp && !showForgotPassword && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <button 
              type="button"
              onClick={onSwitchToSignUp}
              className="text-blue-600 hover:text-blue-700 font-medium"
              disabled={isLoading}
            >
              Créer un compte
            </button>
          </p>
        </div>
      )}

      <div className="mt-4 text-center text-xs text-gray-500">
        <p>🔒 Connexion sécurisée avec Firebase Authentication</p>
      </div>
    </Card>
  );
};