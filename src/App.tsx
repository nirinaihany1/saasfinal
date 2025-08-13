import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Customers } from './pages/Customers';
import { Sales } from './pages/Sales';
import { Receipts } from './pages/Receipts';
import { Expenses } from './pages/Expenses';
import { StoreManagement } from './pages/StoreManagement';
import { CashRegisterInterface } from './components/cashregister/CashRegisterInterface';
import { ReportsInterface } from './components/reports/ReportsInterface';
import { SettingsInterface } from './components/settings/SettingsInterface';
import { SubscriptionManagement } from './pages/SubscriptionManagement';
import { PaymentValidationDashboard } from './components/admin/PaymentValidationDashboard';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { loadEmailJSConfig } from './services/emailService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const { initialize, user } = useAuthStore();
  const [isCashRegisterOpen, setIsCashRegisterOpen] = React.useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Charger la configuration EmailJS quand l'utilisateur se connecte
  useEffect(() => {
    const initEmailJS = async () => {
      if (user?.establishmentId) {
        await loadEmailJSConfig(user.establishmentId);
      }
    };
    
    if (user?.establishmentId) {
      initEmailJS();
    }
  }, [user?.establishmentId]);

  return (
    <>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          
          {/* Protected routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <Layout>
                  <POS />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Layout>
                  <Categories />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stores"
            element={
              <ProtectedRoute>
                <Layout>
                  <StoreManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Customers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <Layout>
                  <Sales />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Receipts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-register"
            element={
              <ProtectedRoute>
                <Layout>
                  <CashRegisterInterface 
                    isOpen={isCashRegisterOpen}
                    onToggleRegister={() => setIsCashRegisterOpen(!isCashRegisterOpen)}
                  />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReportsInterface />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsInterface />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute>
                <Layout>
                  <PaymentValidationDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default App;