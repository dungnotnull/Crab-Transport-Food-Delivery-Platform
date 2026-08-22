import type { PaymentMethod } from '../types/trip.types';

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'CREDIT_CARD', label: 'Thẻ' },
  { value: 'E_WALLET', label: 'Ví điện tử' },
];

