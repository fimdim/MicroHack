import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTheme } from '../context/ThemeContext';
import {
  Cart as CartData,
  createCheckoutSession,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../api/cart';

export default function Cart() {
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const { data: cart, isLoading, error } = useQuery<CartData>('cart', fetchCart);

  const updateMutation = useMutation(
    ({ productId, quantity }: { productId: number; quantity: number }) =>
      updateCartItem(productId, quantity),
    {
      onSuccess: async () => {
        setMessage('Cart updated.');
        await queryClient.invalidateQueries('cart');
      },
      onError: () => setMessage('Could not update the cart. Try again.'),
    },
  );

  const removeMutation = useMutation((productId: number) => removeCartItem(productId), {
    onSuccess: async () => {
      setMessage('Item removed from your cart.');
      await queryClient.invalidateQueries('cart');
    },
    onError: () => setMessage('Could not remove this item. Try again.'),
  });

  const checkoutMutation = useMutation(createCheckoutSession, {
    onSuccess: ({ checkoutUrl }) => {
      window.location.assign(checkoutUrl);
    },
    onError: () => setMessage('Checkout is unavailable right now. Try again in a moment.'),
  });

  const surface = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const primaryText = darkMode ? 'text-light' : 'text-gray-900';
  const secondaryText = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <section className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-24 pb-16 px-4`}>
      <div className="max-w-6xl mx-auto">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span> Continue shopping
        </Link>
        <div className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${secondaryText}`}>OctoCAT Supply</p>
            <h1 className={`mt-2 text-3xl font-bold ${primaryText}`}>Your cart</h1>
          </div>
          <p className={secondaryText}>
            {cart ? `${cart.items.reduce((count, item) => count + item.quantity, 0)} items` : ''}
          </p>
        </div>

        {message && (
          <p role="status" className={`mb-4 text-sm ${secondaryText}`}>
            {message}
          </p>
        )}
        {isLoading ? (
          <p role="status" className={secondaryText}>Loading your cart…</p>
        ) : error ? (
          <div className={`rounded-xl border p-6 ${surface}`} role="alert">
            <p className={`font-semibold ${primaryText}`}>Your cart could not be loaded.</p>
            <p className={`mt-1 text-sm ${secondaryText}`}>Check the connection to the store and try again.</p>
          </div>
        ) : cart && cart.items.length === 0 ? (
          <div className={`rounded-xl border p-10 text-center ${surface}`}>
            <p className={`text-xl font-semibold ${primaryText}`}>Nothing in the carrier yet.</p>
            <p className={`mt-2 ${secondaryText}`}>Find something clever for your cat to bring home.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Browse products
            </Link>
          </div>
        ) : cart ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <ul className="space-y-3">
              {cart.items.map((item) => (
                <li key={item.productId} className={`rounded-xl border p-4 sm:p-5 ${surface}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <img
                      src={`/${item.imgName}`}
                      alt=""
                      className="h-20 w-20 rounded-lg bg-gray-100 object-contain p-2"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className={`font-semibold ${primaryText}`}>{item.name}</h2>
                      <p className={`mt-1 text-sm ${secondaryText}`}>${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        disabled={item.quantity <= 1 || updateMutation.isLoading}
                        onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
                        className={`h-9 w-9 rounded-md border ${surface} ${primaryText} disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                      >
                        −
                      </button>
                      <span className={`min-w-8 text-center ${primaryText}`} aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        disabled={item.quantity >= 999 || updateMutation.isLoading}
                        onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                        className={`h-9 w-9 rounded-md border ${surface} ${primaryText} disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                      >
                        +
                      </button>
                    </div>
                    <p className={`w-20 text-right font-semibold ${primaryText}`}>${item.lineTotal.toFixed(2)}</p>
                    <button
                      type="button"
                      disabled={removeMutation.isLoading}
                      onClick={() => removeMutation.mutate(item.productId)}
                      className="text-sm text-red-600 underline decoration-red-300 underline-offset-4 hover:text-red-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className={`h-fit rounded-xl border p-5 ${surface}`}>
              <h2 className={`text-lg font-semibold ${primaryText}`}>Cart total</h2>
              <div className={`mt-4 flex justify-between border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className={secondaryText}>Subtotal</span>
                <span className={`font-semibold ${primaryText}`}>${cart.total.toFixed(2)}</span>
              </div>
              <p className={`mt-3 text-xs ${secondaryText}`}>Shipping and payment are not included.</p>
              <button
                type="button"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isLoading}
                className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-accent disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {checkoutMutation.isLoading ? 'Preparing secure checkout…' : 'Pay securely'}
              </button>
              <p className={`mt-3 text-xs ${secondaryText}`}>
                Your total is confirmed by the store before payment begins.
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
