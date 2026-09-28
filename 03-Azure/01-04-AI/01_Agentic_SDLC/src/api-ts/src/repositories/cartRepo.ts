import { DatabaseConnection, getDatabase } from '../db/sqlite';
import { Cart } from '../models/cart';
import { DatabaseError, handleDatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { DatabaseRow } from '../utils/sql';

interface CartRow extends DatabaseRow {
  productId: number;
  name: string;
  price: number;
  imgName: string | null;
  quantity: number;
}

const MAX_CART_QUANTITY = 999;

export class CartRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async find(): Promise<Cart> {
    try {
      const rows = await this.db.all<CartRow>(`
        SELECT
          p.product_id AS productId,
          p.name,
          ROUND(p.price * (1 - COALESCE(p.discount, 0)), 2) AS price,
          p.img_name AS imgName,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.product_id = ci.product_id
        ORDER BY p.name, p.product_id
      `);
      const items = rows.map((row) => ({
        productId: row.productId,
        name: row.name,
        price: row.price,
        imgName: row.imgName ?? '',
        quantity: row.quantity,
        lineTotal: roundCurrency(row.price * row.quantity),
      }));
      return {
        items,
        total: roundCurrency(items.reduce((total, item) => total + item.lineTotal, 0)),
      };
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async add(productId: number, quantity: number): Promise<Cart> {
    try {
      const product = await this.db.get<{ product_id: number }>(
        'SELECT product_id FROM products WHERE product_id = ?',
        [productId],
      );
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      const result = await this.db.run(
        `INSERT INTO cart_items (product_id, quantity)
         VALUES (?, ?)
         ON CONFLICT(product_id) DO UPDATE SET quantity = quantity + excluded.quantity
         WHERE quantity + excluded.quantity <= ?`,
        [productId, quantity, MAX_CART_QUANTITY],
      );
      if (result.changes === 0) {
        throw new ValidationError(`Cart item quantity cannot exceed ${MAX_CART_QUANTITY}`);
      }
      return this.find();
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      handleDatabaseError(error);
    }
  }

  async update(productId: number, quantity: number): Promise<Cart> {
    try {
      const result = await this.db.run(
        'UPDATE cart_items SET quantity = ? WHERE product_id = ?',
        [quantity, productId],
      );
      if (result.changes === 0) {
        throw new NotFoundError('Cart item', productId);
      }
      return this.find();
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      handleDatabaseError(error);
    }
  }

  async remove(productId: number): Promise<void> {
    try {
      const result = await this.db.run('DELETE FROM cart_items WHERE product_id = ?', [productId]);
      if (result.changes === 0) {
        throw new NotFoundError('Cart item', productId);
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      handleDatabaseError(error);
    }
  }
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createCartRepository(isTest = false): Promise<CartRepository> {
  return new CartRepository(await getDatabase(isTest));
}

export async function getCartRepository(isTest = false): Promise<CartRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  return createCartRepository(isTestEnv);
}
