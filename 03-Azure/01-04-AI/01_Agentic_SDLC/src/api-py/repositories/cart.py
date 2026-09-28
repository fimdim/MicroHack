from __future__ import annotations

from database.sqlite import get_connection
from models.cart import Cart, CartItem
from utils.errors import NotFoundException, ValidationException

MAX_CART_QUANTITY = 999


class CartRepository:
    async def find(self) -> Cart:
        async with get_connection() as connection:
            cursor = await connection.execute(
                """
                SELECT
                    p.product_id AS productId,
                    p.name,
                    ROUND(p.price * (1 - COALESCE(p.discount, 0)), 2) AS price,
                    p.img_name AS imgName,
                    ci.quantity
                FROM cart_items ci
                JOIN products p ON p.product_id = ci.product_id
                ORDER BY p.name, p.product_id;
                """
            )
            rows = await cursor.fetchall()

        items = [
            CartItem(
                productId=row["productId"],
                name=row["name"],
                price=row["price"],
                imgName=row["imgName"] or "",
                quantity=row["quantity"],
                lineTotal=round(row["price"] * row["quantity"], 2),
            )
            for row in rows
        ]
        return Cart(items=items, total=round(sum(item.lineTotal for item in items), 2))

    async def add(self, product_id: int, quantity: int) -> Cart:
        async with get_connection() as connection:
            cursor = await connection.execute(
                "SELECT product_id FROM products WHERE product_id = ?;",
                (product_id,),
            )
            if await cursor.fetchone() is None:
                raise NotFoundException("Product", product_id)

            cursor = await connection.execute(
                """
                INSERT INTO cart_items (product_id, quantity)
                VALUES (?, ?)
                ON CONFLICT(product_id) DO UPDATE SET quantity = quantity + excluded.quantity
                WHERE quantity + excluded.quantity <= ?;
                """,
                (product_id, quantity, MAX_CART_QUANTITY),
            )
            if cursor.rowcount == 0:
                raise ValidationException(f"Cart item quantity cannot exceed {MAX_CART_QUANTITY}")
            await connection.commit()
        return await self.find()

    async def update(self, product_id: int, quantity: int) -> Cart:
        async with get_connection() as connection:
            cursor = await connection.execute(
                "UPDATE cart_items SET quantity = ? WHERE product_id = ?;",
                (quantity, product_id),
            )
            if cursor.rowcount == 0:
                raise NotFoundException("Cart item", product_id)
            await connection.commit()
        return await self.find()

    async def remove(self, product_id: int) -> None:
        async with get_connection() as connection:
            cursor = await connection.execute(
                "DELETE FROM cart_items WHERE product_id = ?;",
                (product_id,),
            )
            if cursor.rowcount == 0:
                raise NotFoundException("Cart item", product_id)
            await connection.commit()
