import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import cartRouter from './cart';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Cart API', () => {
  const originalCheckoutUrl = process.env.PAYMENT_CHECKOUT_URL;

  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Cart supplier']);
    await db.run(
      `INSERT INTO products
         (product_id, supplier_id, name, description, price, sku, unit, img_name, discount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, 'Cat camera', 'A camera for cats', 20, 'CAM-1', 'piece', 'camera.png', 0.25],
    );

    app = express();
    app.use(express.json());
    app.use('/api/cart', cartRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    if (originalCheckoutUrl === undefined) {
      delete process.env.PAYMENT_CHECKOUT_URL;
    } else {
      process.env.PAYMENT_CHECKOUT_URL = originalCheckoutUrl;
    }
    await closeDatabase();
  });

  it('adds, updates, removes items, and recalculates the discounted total', async () => {
    const empty = await request(app).get('/api/cart');
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ items: [], total: 0 });

    const added = await request(app).post('/api/cart').send({ productId: 1, quantity: 2 });
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({
      items: [{ productId: 1, name: 'Cat camera', price: 15, quantity: 2, lineTotal: 30 }],
      total: 30,
    });

    const incremented = await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });
    expect(incremented.body.items[0].quantity).toBe(3);
    expect(incremented.body.total).toBe(45);

    const updated = await request(app).put('/api/cart/1').send({ quantity: 4 });
    expect(updated.body.items[0].quantity).toBe(4);
    expect(updated.body.total).toBe(60);

    const removed = await request(app).delete('/api/cart/1');
    expect(removed.status).toBe(204);
    expect((await request(app).get('/api/cart')).body).toEqual({ items: [], total: 0 });
  });

  it('rejects invalid quantities and unknown products', async () => {
    expect((await request(app).post('/api/cart').send({ productId: 1, quantity: 0 })).status).toBe(400);
    expect((await request(app).post('/api/cart').send({ productId: 999, quantity: 1 })).status).toBe(404);
  });

  it('creates a checkout session using the server-calculated total', async () => {
    process.env.PAYMENT_CHECKOUT_URL = 'https://pay.example.test/checkout';
    await request(app).post('/api/cart').send({ productId: 1, quantity: 2 });

    const response = await request(app).post('/api/cart/checkout');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ amount: 30, currency: 'USD' });
    expect(response.body.sessionId).toEqual(expect.any(String));
    expect(response.body.checkoutUrl).toContain('amount=30.00');
    expect(response.body.checkoutUrl).toContain('currency=USD');
  });

  it('reports missing payment configuration explicitly', async () => {
    delete process.env.PAYMENT_CHECKOUT_URL;
    await request(app).post('/api/cart').send({ productId: 1, quantity: 1 });

    const response = await request(app).post('/api/cart/checkout');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('PAYMENT_NOT_CONFIGURED');
  });
});
