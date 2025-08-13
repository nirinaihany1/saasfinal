import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Building, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface SignUpFormProps {
  onSubmit: (email: string, password: string, name: string, establishmentName: string) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ 
  onSubmit, 
  onSwitchToLogin, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    establishmentName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.email.trim()) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Format d\'email invalide';
    
    if (!formData.password) newErrors.password = 'Le mot de passe est requis';
    else if (formData.password.length < 6) newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmez votre mot de passe';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    
    if (!formData.establishmentName.trim()) newErrors.establishmentName = 'Le nom de l\'établissement est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData.email, formData.password, formData.name, formData.establishmentName);
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" padding="lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Créer votre compte</h2>
        <p className="text-gray-600 mt-2">Démarrez avec SaaS POS Madagascar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nom complet *"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          leftIcon={<User className="w-5 h-5 text-gray-400" />}
          placeholder="Votre nom complet"
          error={errors.name}
          required
          disabled={isLoading}
        />

        <Input
          label="Nom de l'établissement *"
          type="text"
          value={formData.establishmentName}
          onChange={(e) => handleChange('establishmentName', e.target.value)}
          leftIcon={<Building className="w-5 h-5 text-gray-400" />}
          placeholder="Ex: Mon Commerce"
          error={errors.establishmentName}
          required
          disabled={isLoading}
        />

        <Input
          label="Adresse email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
          placeholder="votre@email.com"
          error={errors.email}
          required
          disabled={isLoading}
        />

        <Input
          label="Mot de passe *"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
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

        <Input
          label="Confirmer le mot de passe *"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          leftIcon={<Lock className="w-5 h-5 text-gray-400" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          placeholder="••••••••"
          error={errors.confirmPassword}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
          className="mt-8"
        >
          {isLoading ? 'Création du compte...' : 'Créer mon compte'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Vous avez déjà un compte ?{' '}
          <button 
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
            disabled={isLoading}
          >
            Se connecter
          </button>
        </p>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        <p>🔒 Données sécurisées avec Firebase</p>
        <p className="mt-1">En créant un compte, vous acceptez nos conditions d'utilisation</p>
      </div>
    </Card>
  );
};