interface Subscription {
  id: string;
  establishmentId: string;
  establishmentName: string;
  plan: 'starter' | 'business' | 'enterprise';
  status: 'trial' | 'active' | 'suspended' | 'expired' | 'pending_payment';
  startDate: Date;
  endDate: Date;
  trialEndDate?: Date;
  monthlyPrice: number;
  paymentMethod: 'mvola' | 'orange_money' | 'airtel_money' | 'bank_transfer' | 'cash';
  lastPaymentDate?: Date;
  nextPaymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequest {
  id: string;
  subscriptionId: string;
  establishmentId: string;
  establishmentName: string;
  amount: number;
  paymentMethod: 'mvola' | 'orange_money' | 'airtel_money' | 'bank_transfer' | 'cash';
  paymentReference: string;
  paymentProof?: string; // URL vers la preuve de paiement
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxUsers: number;
  maxProducts: number;
  features: string[];
  isPopular?: boolean;
}