/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the current cart and its total
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Current cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *   post:
 *     summary: Add a quantity of a product to the cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: integer }
 *               quantity: { type: integer, minimum: 1, maximum: 999 }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Invalid quantity
 *       404:
 *         description: Product not found
 * /api/cart/{productId}:
 *   put:
 *     summary: Set a cart item's quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1, maximum: 999 }
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart item not found
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Cart item removed
 *       404:
 *         description: Cart item not found
 */
import express from 'express';
import { randomUUID } from 'node:crypto';
import { getCartRepository } from '../repositories/cartRepo';
import { ValidationError } from '../utils/errors';

const router = express.Router();

function requireQuantity(quantity: unknown): asserts quantity is number {
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  ) {
    throw new ValidationError('quantity must be an integer between 1 and 999');
  }
}

router.get('/', async (_req, res, next) => {
  try {
    res.json(await (await getCartRepository()).find());
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Create a payment checkout session for the current cart
 *     tags: [Cart]
 *     responses:
 *       201:
 *         description: Checkout session created
 *       400:
 *         description: Cart is empty
 *       503:
 *         description: Payment checkout is not configured
 */
router.post('/checkout', async (_req, res, next) => {
  try {
    const cart = await (await getCartRepository()).find();
    if (cart.items.length === 0) {
      throw new ValidationError('Cannot start checkout with an empty cart');
    }

    const checkoutBaseUrl = process.env.PAYMENT_CHECKOUT_URL;
    if (!checkoutBaseUrl) {
      res.status(503).json({
        error: {
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'Payment checkout is not configured',
        },
      });
      return;
    }

    const sessionId = randomUUID();
    const checkoutUrl = new URL(checkoutBaseUrl);
    checkoutUrl.searchParams.set('session_id', sessionId);
    checkoutUrl.searchParams.set('amount', cart.total.toFixed(2));
    checkoutUrl.searchParams.set('currency', 'USD');

    res.status(201).json({
      sessionId,
      checkoutUrl: checkoutUrl.toString(),
      amount: cart.total,
      currency: 'USD',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw new ValidationError('Request body must be an object');
    }
    const { productId, quantity } = req.body as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
      throw new ValidationError('productId must be a positive integer');
    }
    requireQuantity(quantity);
    res.json(await (await getCartRepository()).add(productId, quantity));
  } catch (error) {
    next(error);
  }
});

router.put('/:productId', async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ValidationError('productId must be a positive integer');
    }
    requireQuantity(req.body?.quantity);
    res.json(await (await getCartRepository()).update(productId, req.body.quantity));
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ValidationError('productId must be a positive integer');
    }
    await (await getCartRepository()).remove(productId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
