import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { StoreManagement as StoreManagerComponent } from '../components/stores/StoreManagement';
import { StockTransferList } from '../components/stores/StockTransferList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Store, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const StoreManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stores');
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'reader';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion Multi-Magasins</h1>
        <p className="text-gray-600 mt-1">
          Gérez vos différents points de vente et les transferts de stock entre eux
        </p>
      </div>

      {isReadOnly && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les magasins et les transferts mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stores" className="flex items-center">
            <Store className="w-4 h-4 mr-2" />
            Magasins
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transferts de stock
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="stores" className="mt-6">
          <StoreManagerComponent readOnly={isReadOnly} />
        </TabsContent>
        
        <TabsContent value="transfers" className="mt-6">
          <StockTransferList readOnly={isReadOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
};