import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AlertCircle, CheckCircle, Users, Settings, Shield, Database, Loader, RefreshCw } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export const DemoAccountSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    success: boolean;
    message: string;
    createdUsers?: string[];
    step?: string;
    error?: string;
    requiresManualAction?: boolean;
  } | null>(null);

  // Helper function to execute operations with timeout
  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Opération expirée après ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  };

  const handleSetupAccounts = async () => {
    setIsLoading(true);
    setSetupResult(null);

    try {
      console.log('🚀 Début de la configuration des comptes...');
      
      setSetupResult({
        success: false,
        message: 'Initialisation de la configuration...',
        step: 'init'
      });

      // Étape 1: Créer le Super Admin du système (sans établissement)
      setSetupResult({
        success: false,
        message: 'Création du Super Admin système...',
        step: 'super-admin'
      });

      let superAdminUserId = '';
      let wasSuperAdminCreated = false;

      try {
        // D'abord, vérifier si l'utilisateur est déjà connecté et le déconnecter
        if (auth.currentUser) {
          await withTimeout(signOut(auth), 5000);
          console.log('🔓 Déconnexion de l\'utilisateur actuel');
        }

        // Essayer de créer le Super Admin
        console.log('🔐 Tentative de création du Super Admin...');
        const superAdminCredential = await withTimeout(
          createUserWithEmailAndPassword(auth, 'superadmin@saaspos.mg', 'superadmin123'),
          10000
        );

        await withTimeout(
          updateProfile(superAdminCredential.user, { displayName: 'Super Administrateur Système' }),
          5000
        );

        superAdminUserId = superAdminCredential.user.uid;
        wasSuperAdminCreated = true;
        console.log('✅ Nouveau Super Admin créé:', superAdminUserId);

      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log('⚠️ Le Super Admin existe déjà, tentative de connexion...');
          
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const superAdminCredential = await withTimeout(
              signInWithEmailAndPassword(auth, 'superadmin@saaspos.mg', 'superadmin123'),
              10000
            );
            
            superAdminUserId = superAdminCredential.user.uid;
            console.log('✅ Connexion Super Admin réussie:', superAdminUserId);
            
          } catch (loginError: any) {
            console.error('❌ Erreur de connexion Super Admin:', loginError);
            
            if (loginError.code === 'auth/invalid-credential') {
              setSetupResult({
                success: false,
                message: 'Le compte superadmin@saaspos.mg existe déjà avec un mot de passe différent. Veuillez supprimer ce compte de la console Firebase Authentication et réessayer.',
                requiresManualAction: true,
                error: 'Compte existant avec mot de passe différent'
              });
              
              setIsLoading(false);
              return;
            } else {
              throw loginError;
            }
          }
        } else if (error.message?.includes('expirée')) {
          throw new Error('Timeout lors de la création du Super Admin. Vérifiez votre connexion internet et les règles Firestore.');
        } else {
          throw error;
        }
      }

      // Créer le document Super Admin (SANS establishmentId)
      const superAdminUserDoc = {
        id: superAdminUserId,
        email: 'superadmin@saaspos.mg',
        name: 'Super Administrateur Système',
        role: 'admin' as const,
        establishmentId: 'SYSTEM_ADMIN', // Identifiant spécial pour le super admin
        isActive: true,
        isSuperAdmin: true,
        isSystemAdmin: true, // Nouveau flag pour identifier le super admin système
        isClientAdmin: false,
        lastLogin: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      try {
        const existingDoc = await withTimeout(getDoc(doc(db, 'users', superAdminUserId)), 8000);
        if (!existingDoc.exists()) {
          await withTimeout(setDoc(doc(db, 'users', superAdminUserId), superAdminUserDoc), 10000);
          console.log('✅ Document Super Admin créé');
        } else {
          console.log('⚠️ Document Super Admin existe déjà');
          // Mettre à jour le document pour s'assurer que les flags sont corrects
          await withTimeout(updateDoc(doc(db, 'users', superAdminUserId), {
            isSuperAdmin: true,
            isSystemAdmin: true,
            updatedAt: Timestamp.now()
          }), 10000);
          console.log('✅ Document Super Admin mis à jour avec les flags corrects');
        }
      } catch (docError: any) {
        console.error('❌ Erreur lors de la création du document Super Admin:', docError);
        throw new Error(`Impossible de créer le document Super Admin: ${docError.message}`);
      }

      // Étape 2: Créer l'établissement de démonstration pour les clients
      setSetupResult({
        success: false,
        message: 'Création de l\'établissement de démonstration...',
        step: 'establishment'
      });

      const establishmentId = 'demo-establishment-main';
      const establishmentData = {
        id: establishmentId,
        name: 'SaaS POS Madagascar - Demo Client',
        address: 'Antananarivo, Madagascar',
        nif: '1234567890',
        stat: '12345678901234',
        phone: '+261 34 12 345 67',
        email: 'contact@saaspos.mg',
        currency: 'MGA',
        taxRate: 20,
        authorizedUsers: [],
        isDemo: true, // Marquer comme établissement de démo
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      try {
        console.log('📝 Tentative de création de l\'établissement...');
        
        const existingEst = await withTimeout(getDoc(doc(db, 'establishments', establishmentId)), 8000);
        
        if (!existingEst.exists()) {
          console.log('🏢 Création du nouvel établissement...');
          await withTimeout(setDoc(doc(db, 'establishments', establishmentId), establishmentData), 15000);
          console.log('✅ Établissement créé avec succès');
        } else {
          console.log('⚠️ Établissement existe déjà, mise à jour...');
          await withTimeout(setDoc(doc(db, 'establishments', establishmentId), establishmentData, { merge: true }), 10000);
          console.log('✅ Établissement mis à jour');
        }
      } catch (estError: any) {
        console.error('❌ Erreur lors de la création de l\'établissement:', estError);
        console.log('⚠️ Continuons malgré l\'erreur d\'établissement...');
      }

      // Étape 3: Créer les comptes clients (avec établissement)
      setSetupResult({
        success: false,
        message: 'Création des comptes clients de démonstration...',
        step: 'client-users'
      });

      const clientUsers = [
        {
          email: 'admin@saaspos.mg',
          password: 'admin123',
          name: 'Admin Client Demo',
          role: 'admin' as const,
          isClientAdmin: true
        },
        {
          email: 'manager@saaspos.mg',
          password: 'manager123',
          name: 'Gérant Principal',
          role: 'manager' as const,
          isClientAdmin: false
        },
        {
          email: 'cashier@saaspos.mg',
          password: 'cashier123',
          name: 'Marie Caissière',
          role: 'cashier' as const,
          isClientAdmin: false
        },
        {
          email: 'reader@saaspos.mg',
          password: 'reader123',
          name: 'Jean Lecteur',
          role: 'reader' as const,
          isClientAdmin: false
        }
      ];

      const createdUsers = ['superadmin@saaspos.mg'];

      for (const userData of clientUsers) {
        try {
          console.log(`🔐 Création du compte client: ${userData.email}`);
          
          // Déconnecter l'utilisateur actuel avant de créer le suivant
          if (auth.currentUser) {
            await withTimeout(signOut(auth), 5000);
          }
          
          const userCredential = await withTimeout(
            createUserWithEmailAndPassword(auth, userData.email, userData.password),
            10000
          );
          
          await withTimeout(
            updateProfile(userCredential.user, { displayName: userData.name }),
            5000
          );

          const userDoc = {
            id: userCredential.user.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            establishmentId: establishmentId, // Lié à l'établissement client
            isActive: true,
            isSuperAdmin: false,
            isSystemAdmin: false,
            isClientAdmin: userData.isClientAdmin, // Flag pour distinguer admin client
            lastLogin: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          await withTimeout(setDoc(doc(db, 'users', userCredential.user.uid), userDoc), 10000);
          
          createdUsers.push(userData.email);
          console.log(`✅ Compte client créé: ${userData.email}`);
          
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`⚠️ Le compte ${userData.email} existe déjà`);
            createdUsers.push(userData.email);
          } else if (error.code === 'auth/invalid-credential') {
            console.log(`⚠️ Le compte ${userData.email} existe avec un mot de passe différent`);
            createdUsers.push(userData.email);
          } else {
            console.error(`❌ Erreur création ${userData.email}:`, error);
          }
        }
      }

      // Créer un abonnement d'essai SEULEMENT pour l'établissement client
      setSetupResult({
        success: false,
        message: 'Création de l\'abonnement d\'essai pour le client...',
        step: 'subscription'
      });

      try {
        const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const subscriptionData = {
          id: `sub_${establishmentId}`,
          establishmentId: establishmentId,
          establishmentName: 'SaaS POS Madagascar - Demo Client',
          plan: 'trial',
          status: 'trial',
          startDate: Timestamp.now(),
          endDate: Timestamp.fromDate(trialEndDate),
          trialEndDate: Timestamp.fromDate(trialEndDate),
          monthlyPrice: 0,
          nextPaymentDate: Timestamp.fromDate(trialEndDate),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        await setDoc(doc(db, 'subscriptions', `sub_${establishmentId}`), subscriptionData);
        console.log('✅ Abonnement d\'essai créé pour le client');
      } catch (subError) {
        console.log('⚠️ Erreur lors de la création de l\'abonnement, continuons...');
      }

      // Déconnecter après la création des comptes
      if (auth.currentUser) {
        await withTimeout(signOut(auth), 5000);
      }

      // Étape 4: Créer les données de démonstration
      setSetupResult({
        success: false,
        message: 'Création des données de démonstration...',
        step: 'demo-data'
      });

      // Créer les catégories
      const categories = [
        { id: 'beverages', name: 'Boissons', color: 'blue' },
        { id: 'food', name: 'Alimentation', color: 'green' },
        { id: 'household', name: 'Ménage', color: 'purple' },
        { id: 'electronics', name: 'Électronique', color: 'yellow' },
        { id: 'clothing', name: 'Vêtements', color: 'pink' },
        { id: 'health', name: 'Santé & Beauté', color: 'indigo' }
      ];

      for (const category of categories) {
        try {
          const categoryDoc = {
            id: category.id,
            name: category.name,
            color: category.color,
            establishmentId: establishmentId,
            createdAt: Timestamp.now()
          };
          await withTimeout(
            setDoc(doc(db, 'categories', `${establishmentId}_${category.id}`), categoryDoc),
            8000
          );
        } catch (catError) {
          console.log(`⚠️ Catégorie ${category.name} existe peut-être déjà ou timeout`);
        }
      }
      console.log('✅ Catégories créées');

      // Créer les produits
      const products = [
        {
          name: 'Coca Cola 50cl',
          reference: 'CC001',
          salePrice: 1500,
          purchasePrice: 1200,
          stock: 50,
          minStock: 10,
          categoryId: `${establishmentId}_beverages`,
          taxRate: 20,
          unit: 'piece',
          brand: 'Coca-Cola',
          barcode: '123456789012',
          description: 'Boisson gazeuse rafraîchissante'
        },
        {
          name: 'Pain de mie complet',
          reference: 'PM001',
          salePrice: 2500,
          purchasePrice: 2000,
          stock: 5,
          minStock: 15,
          categoryId: `${establishmentId}_food`,
          taxRate: 20,
          unit: 'piece',
          brand: 'Boulangerie Locale',
          barcode: '234567890123',
          description: 'Pain de mie aux céréales complètes'
        },
        {
          name: 'Savon de Marseille',
          reference: 'SM001',
          salePrice: 1200,
          purchasePrice: 800,
          stock: 30,
          minStock: 10,
          categoryId: `${establishmentId}_household`,
          taxRate: 20,
          unit: 'piece',
          brand: 'Le Petit Marseillais',
          barcode: '678901234567',
          description: 'Savon naturel à l\'huile d\'olive'
        }
      ];

      for (let i = 0; i < products.length; i++) {
        try {
          const product = products[i];
          const productDoc = {
            ...product,
            establishmentId: establishmentId,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await withTimeout(
            setDoc(doc(db, 'products', `${establishmentId}_product_${i + 1}`), productDoc),
            8000
          );
        } catch (prodError) {
          console.log(`⚠️ Produit ${products[i].name} existe peut-être déjà ou timeout`);
        }
      }
      console.log('✅ Produits créés');

      // Créer quelques clients
      const customers = [
        {
          name: 'Rakoto Jean',
          email: 'rakoto.jean@email.mg',
          phone: '+261 34 12 345 67',
          address: 'Antananarivo, Madagascar',
          loyaltyPoints: 150,
          totalSpent: 125000
        },
        {
          name: 'Rasoa Marie',
          email: 'rasoa.marie@email.mg',
          phone: '+261 33 98 765 43',
          address: 'Fianarantsoa, Madagascar',
          loyaltyPoints: 89,
          totalSpent: 89300
        }
      ];

      for (let i = 0; i < customers.length; i++) {
        try {
          const customer = customers[i];
          const customerDoc = {
            ...customer,
            establishmentId: establishmentId,
            isActive: true,
            lastPurchase: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await withTimeout(
            setDoc(doc(db, 'customers', `${establishmentId}_customer_${i + 1}`), customerDoc),
            8000
          );
        } catch (custError) {
          console.log(`⚠️ Client ${customers[i].name} existe peut-être déjà ou timeout`);
        }
      }
      console.log('✅ Clients créés');

      // Configuration terminée avec succès
      setSetupResult({
        success: true,
        message: 'Configuration terminée avec succès !',
        createdUsers: createdUsers
      });

      console.log('🎉 Configuration complète terminée !');

    } catch (error: any) {
      console.error('❌ Erreur lors de la configuration:', error);
      
      let errorMessage = error.message || 'Une erreur inattendue s\'est produite';
      
      if (error.message?.includes('Timeout') || error.message?.includes('expirée')) {
        errorMessage = `${error.message}\n\nSuggestions :\n• Vérifiez votre connexion internet\n• Vérifiez les règles Firestore dans la console Firebase\n• Assurez-vous que les règles permettent les opérations d'écriture`;
      }
      
      setSetupResult({
        success: false,
        message: `Erreur: ${errorMessage}`,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setSetupResult(null);
    handleSetupAccounts();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configuration du Système SaaS POS
          </h2>
          <p className="text-gray-600">
            Configurez le Super Admin système et les comptes clients de démonstration
          </p>
        </div>

        {!setupResult && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">Comptes qui seront créés :</p>
                
                <div className="mb-4">
                  <p className="font-semibold text-amber-900 mb-1">🔧 Super Admin Système :</p>
                  <ul className="space-y-1 ml-4">
                    <li>• <strong>superadmin@saaspos.mg</strong> - Super Admin (mot de passe: superadmin123)</li>
                    <li className="text-xs">→ Gère tous les paiements et validations du système</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-amber-900 mb-1">👥 Comptes Clients Demo :</p>
                  <ul className="space-y-1 ml-4">
                    <li>• <strong>admin@saaspos.mg</strong> - Admin Client (mot de passe: admin123)</li>
                    <li>• <strong>manager@saaspos.mg</strong> - Gérant (mot de passe: manager123)</li>
                    <li>• <strong>cashier@saaspos.mg</strong> - Caissier (mot de passe: cashier123)</li>
                    <li>• <strong>reader@saaspos.mg</strong> - Lecteur (mot de passe: reader123)</li>
                    <li className="text-xs">→ Ont un abonnement d'essai et gèrent leur établissement</li>
                  </ul>
                </div>

                <p className="mt-3 text-xs">
                  ⚠️ Cette opération créera également des données de démonstration (produits, catégories, clients).
                </p>
              </div>
            </div>
          </div>
        )}

        {setupResult && (
          <div className={`border rounded-lg p-4 mb-6 ${
            setupResult.success 
              ? 'bg-green-50 border-green-200' 
              : setupResult.requiresManualAction
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              {setupResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              ) : setupResult.requiresManualAction ? (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              )}
              <div className={`text-sm ${
                setupResult.success 
                  ? 'text-green-800' 
                  : setupResult.requiresManualAction
                  ? 'text-yellow-800'
                  : 'text-red-800'
              }`}>
                <p className="font-medium whitespace-pre-line">{setupResult.message}</p>
                {setupResult.success && setupResult.createdUsers && (
                  <div className="mt-3">
                    <p className="mb-2 font-medium">✅ Comptes configurés :</p>
                    <ul className="ml-4 space-y-1">
                      {setupResult.createdUsers.map(email => (
                        <li key={email}>• {email}</li>
                      ))}
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-blue-800 font-medium text-xs mb-2">
                        🎉 Configuration terminée !
                      </p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p><strong>Super Admin :</strong> superadmin@saaspos.mg (gère les validations)</p>
                        <p><strong>Client Demo :</strong> admin@saaspos.mg (a un abonnement d'essai)</p>
                      </div>
                    </div>
                  </div>
                )}
                {setupResult.requiresManualAction && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="text-yellow-800 font-medium text-xs mb-2">
                      🔧 Action manuelle requise :
                    </p>
                    <ol className="text-yellow-800 text-xs ml-4 space-y-1">
                      <li>1. Allez dans la <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">console Firebase</a></li>
                      <li>2. Sélectionnez votre projet</li>
                      <li>3. Allez dans "Authentication" → "Users"</li>
                      <li>4. Supprimez l'utilisateur problématique</li>
                      <li>5. Revenez ici et cliquez sur "Réessayer"</li>
                    </ol>
                  </div>
                )}
                {!setupResult.success && !setupResult.requiresManualAction && setupResult.error && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs">
                    <p><strong>Détail de l'erreur :</strong> {setupResult.error}</p>
                  </div>
                )}
                {isLoading && setupResult.step && (
                  <div className="mt-2 flex items-center">
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Étape en cours: {setupResult.step}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Button
            onClick={handleSetupAccounts}
            disabled={isLoading || (setupResult?.success === true)}
            className="px-8 py-3"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Configuration en cours...
              </>
            ) : setupResult?.success ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Configuration terminée
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Configurer le système
              </>
            )}
          </Button>

          {setupResult && !setupResult.success && !isLoading && (
            <Button
              onClick={handleRetry}
              variant="ghost"
              className="px-6 py-3"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          )}
        </div>

        {setupResult?.success && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Vous pouvez maintenant vous connecter avec les comptes configurés !
            </p>
            <Button
              onClick={() => window.location.href = '/login'}
              variant="ghost"
              className="mt-3"
            >
              Aller à la page de connexion
            </Button>
          </div>
        )}

        {/* Informations sur la séparation des rôles */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">🔧 Architecture du système</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-2">
                <p><strong>Super Admin :</strong> Gère les validations de paiements de tous les clients</p>
                <p><strong>Admin Client :</strong> Gère son établissement et a un abonnement</p>
                <p><strong>Séparation claire :</strong> Le menu "Validation Paiements" n'apparaît que pour le Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};