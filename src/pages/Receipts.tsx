import React from 'react';
import { ReceiptsList } from '../components/sales/ReceiptsList';

export const Receipts: React.FC = () => {
  return (
    <div className="h-full">
      <ReceiptsList />
    </div>
  );
};