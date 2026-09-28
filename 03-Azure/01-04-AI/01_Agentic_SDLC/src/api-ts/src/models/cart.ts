/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required: [productId, name, price, imgName, quantity, lineTotal]
 *       properties:
 *         productId:
 *           type: integer
 *         name:
 *           type: string
 *         price:
 *           type: number
 *           description: Current unit price after any product discount
 *         imgName:
 *           type: string
 *         quantity:
 *           type: integer
 *         lineTotal:
 *           type: number
 *     Cart:
 *       type: object
 *       required: [items, total]
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total:
 *           type: number
 */
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
