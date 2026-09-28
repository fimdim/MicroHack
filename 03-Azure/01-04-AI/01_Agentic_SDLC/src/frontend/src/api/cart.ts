import axios from 'axios';
import { api } from './config';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imgName: string;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: 'USD';
}

export async function fetchCart(): Promise<Cart> {
  const { data } = await axios.get<Cart>(`${api.baseURL}${api.endpoints.cart}`);
  return data;
}

export async function addCartItem(productId: number, quantity: number): Promise<Cart> {
  const { data } = await axios.post<Cart>(`${api.baseURL}${api.endpoints.cart}`, {
    productId,
    quantity,
  });
  return data;
}

export async function updateCartItem(productId: number, quantity: number): Promise<Cart> {
  const { data } = await axios.put<Cart>(
    `${api.baseURL}${api.endpoints.cart}/${productId}`,
    { quantity },
  );
  return data;
}

export async function removeCartItem(productId: number): Promise<void> {
  await axios.delete(`${api.baseURL}${api.endpoints.cart}/${productId}`);
}

export async function createCheckoutSession(): Promise<CheckoutSession> {
  const { data } = await axios.post<CheckoutSession>(
    `${api.baseURL}${api.endpoints.cart}/checkout`,
  );
  return data;
}
