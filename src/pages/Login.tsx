import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignUpForm } from '../components/auth/SignUpForm';
import { useAuthStore } from '../store/authStore';
import { Settings, AlertTriangle, Shield, Lock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { user, signIn, signUp, error, isLoading, clearError } = useAuthStore();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);
  const [demoPassword, setDemoPassword] = useState('');
  const [showDemoPasswordPrompt, setShowDemoPasswordPrompt] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (email: string, password: string) => {
    clearError();
    try {
      await signIn({ email, password });
      toast.success('Connexion réussie !');
      setShowSetupPrompt(false);
    } catch (error: any) {
      // Check if it's an invalid credential error and suggest setup
      if (error.message.includes('auth/invalid-credential') || error.message.includes('Email ou mot de passe incorrect')) {
        // Check if it's a demo account
        const demoEmails = ['superadmin@saaspos.mg', 'admin@saaspos.mg', 'manager@saaspos.mg', 'cashier@saaspos.mg', 'reader@saaspos.mg'];
        if (demoEmails.includes(email)) {
          setShowSetupPrompt(true);
          toast.error('Comptes de démonstration non configurés. Veuillez configurer le système d\'abord.');
        } else {
          toast.error('Email ou mot de passe incorrect');
        }
      } else {
        toast.error(error.message || 'Erreur de connexion');
      }
    }
  };

  const handleSignUp = async (email: string, password: string, name: string, establishmentName: string) => {
    clearError();
    try {
      await signUp({ email, password, name, establishmentName });
      toast.success('Compte créé avec succès ! Bienvenue !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du compte');
    }
  };

  const handleForgotPassword = async (email: string) => {
    clearError();
    setForgotPasswordLoading(true);
    
    try {
      // Configuration supplémentaire pour l'envoi d'email
      const actionCodeSettings = {
        url: window.location.origin + '/login', // URL de redirection après réinitialisation
        handleCodeInApp: false
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      console.log(`Email de réinitialisation envoyé à: ${email}`);
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception et vos spams.');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi de l\'email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte trouvé avec cette adresse email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format d\'email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = error.message || 'Erreur lors de l\'envoi de l\'email';
      }
      
      toast.error(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleDemoRoleSelect = (role: string) => {
    setSelectedDemoRole(role);
    setShowDemoPasswordPrompt(true);
    setDemoPassword('');
  };

  const handleDemoLogin = () => {
    if (!selectedDemoRole) return;
    
    // Vérifier le mot de passe de démonstration
    const demoSecurityPassword = 'demo2025';
    
    if (demoPassword !== demoSecurityPassword) {
      toast.error('Mot de passe de démonstration incorrect');
      return;
    }
    
    const demoCredentials = {
      admin: { email: 'admin@saaspos.mg', password: 'admin123' },
      manager: { email: 'manager@saaspos.mg', password: 'manager123' },
      cashier: { email: 'cashier@saaspos.mg', password: 'cashier123' },
      reader: { email: 'reader@saaspos.mg', password: 'reader123' }
    };

    const credentials = demoCredentials[selectedDemoRole as keyof typeof demoCredentials];
    if (credentials) {
      handleLogin(credentials.email, credentials.password);
    }
    
    setShowDemoPasswordPrompt(false);
    setSelectedDemoRole(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {isSignUpMode ? (
          <SignUpForm 
            onSubmit={handleSignUp} 
            onSwitchToLogin={() => setIsSignUpMode(false)}
            isLoading={isLoading} 
          />
        ) : (
          <LoginForm 
            onSubmit={handleLogin} 
            onSwitchToSignUp={() => setIsSignUpMode(true)}
            onForgotPassword={handleForgotPassword}
            isLoading={isLoading || forgotPasswordLoading} 
          />
        )}
        
        {/* Setup Prompt - Show when demo accounts don't exist */}
        {showSetupPrompt && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  Configuration requise
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  Les comptes de démonstration n'existent pas encore dans votre projet Firebase. 
                  Vous devez d'abord configurer le système pour créer ces comptes.
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/setup"
                    className="inline-flex items-center px-3 py-2 border border-amber-300 shadow-sm text-sm leading-4 font-medium rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurer le système
                  </Link>
                  <button
                    onClick={() => setShowSetupPrompt(false)}
                    className="text-sm text-amber-600 hover:text-amber-800 px-2 py-1"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && !showSetupPrompt && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            {(error.includes('auth/invalid-credential') || error.includes('Email ou mot de passe incorrect')) && (
              <div className="mt-3">
                <Link
                  to="/setup"
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurer le système
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Demo Access Button */}
        {!isSignUpMode && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowDemoOptions(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Accéder à la démonstration
            </button>
          </div>
        )}

        {/* Demo Options Modal */}
        {showDemoOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md" padding="lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Accès à la démonstration</h3>
                <p className="text-gray-600 mt-2">
                  Sélectionnez un rôle pour explorer les fonctionnalités du système
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleDemoRoleSelect('admin')}
                  className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-blue-900">Admin Client</p>
                    <p className="text-sm text-blue-700">Gestion complète</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Accès sécurisé
                  </span>
                </button>
                
                <button
                  onClick={() => handleDemoRoleSelect('manager')}
                  className="w-full flex justify-between items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-green-900">Gérant</p>
                    <p className="text-sm text-green-700">Gestion établissement</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Accès sécurisé
                  </span>
                </button>
                
                <button
                  onClick={() => handleDemoRoleSelect('cashier')}
                  className="w-full flex justify-between items-center p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-yellow-900">Caissier</p>
                    <p className="text-sm text-yellow-700">Ventes uniquement</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                    Accès sécurisé
                  </span>
                </button>
                
                <button
                  onClick={() => handleDemoRoleSelect('reader')}
                  className="w-full flex justify-between items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-purple-900">Lecteur</p>
                    <p className="text-sm text-purple-700">Consultation seule</p>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                    Accès sécurisé
                  </span>
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Environnement de démonstration</p>
                    <p className="mt-1">Ces comptes vous permettent d'explorer les fonctionnalités du système dans un environnement isolé et sécurisé.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setShowDemoOptions(false)}>
                  Fermer
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Demo Password Prompt */}
        {showDemoPasswordPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md" padding="lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Authentification requise</h3>
                <p className="text-gray-600 mt-2">
                  Veuillez saisir le mot de passe de démonstration pour accéder au compte
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe de démonstration
                  </label>
                  <input
                    type="password"
                    value={demoPassword}
                    onChange={(e) => setDemoPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Entrez le mot de passe de démonstration"
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Information</p>
                      <p className="mt-1">Le mot de passe de démonstration est : <strong>demo2025</strong></p>
                      <p className="mt-1">Ce mot de passe est requis pour protéger l'accès aux comptes de démonstration.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowDemoPasswordPrompt(false);
                    setSelectedDemoRole(null);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleDemoLogin}
                  disabled={!demoPassword}
                >
                  Accéder à la démo
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};