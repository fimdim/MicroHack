package com.octocat.supply.repository;

import com.octocat.supply.exception.NotFoundException;
import com.octocat.supply.exception.ValidationException;
import com.octocat.supply.model.CartModel.Cart;
import com.octocat.supply.model.CartModel.CartItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CartRepository {
    private static final int MAX_CART_QUANTITY = 999;
    private final JdbcTemplate jdbcTemplate;

    public CartRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Cart find() {
        List<CartItem> items = jdbcTemplate.query(
            """
                SELECT
                    p.product_id,
                    p.name,
                    ROUND(p.price * (1 - COALESCE(p.discount, 0)), 2) AS price,
                    p.img_name,
                    ci.quantity
                FROM cart_items ci
                JOIN products p ON p.product_id = ci.product_id
                ORDER BY p.name, p.product_id
                """,
            (rs, rowNum) -> {
                double price = rs.getDouble("price");
                int quantity = rs.getInt("quantity");
                return new CartItem(
                    rs.getInt("product_id"),
                    rs.getString("name"),
                    price,
                    rs.getString("img_name") == null ? "" : rs.getString("img_name"),
                    quantity,
                    roundCurrency(price * quantity)
                );
            }
        );
        return new Cart(items, roundCurrency(items.stream().mapToDouble(CartItem::lineTotal).sum()));
    }

    public Cart add(int productId, int quantity) {
        if (jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM products WHERE product_id = ?",
            Integer.class,
            productId
        ) == 0) {
            throw new NotFoundException("Product not found");
        }
        int changes = jdbcTemplate.update(
            """
                INSERT INTO cart_items (product_id, quantity)
                VALUES (?, ?)
                ON CONFLICT(product_id) DO UPDATE SET quantity = quantity + excluded.quantity
                WHERE quantity + excluded.quantity <= ?
                """,
            productId,
            quantity,
            MAX_CART_QUANTITY
        );
        if (changes == 0) {
            throw new ValidationException("Cart item quantity cannot exceed " + MAX_CART_QUANTITY);
        }
        return find();
    }

    public Cart update(int productId, int quantity) {
        int changes = jdbcTemplate.update(
            "UPDATE cart_items SET quantity = ? WHERE product_id = ?",
            quantity,
            productId
        );
        if (changes == 0) {
            throw new NotFoundException("Cart item not found");
        }
        return find();
    }

    public void remove(int productId) {
        if (jdbcTemplate.update("DELETE FROM cart_items WHERE product_id = ?", productId) == 0) {
            throw new NotFoundException("Cart item not found");
        }
    }

    private static double roundCurrency(double value) {
        return Math.round((value + Math.ulp(value)) * 100) / 100.0;
    }
}
