package com.octocat.supply.model;

import java.util.List;

public final class CartModel {
    private CartModel() {
    }

    public record CartItem(
        int productId,
        String name,
        double price,
        String imgName,
        int quantity,
        double lineTotal
    ) {
    }

    public record Cart(List<CartItem> items, double total) {
    }

    public record AddCartItemRequest(Integer productId, Integer quantity) {
    }

    public record UpdateCartItemRequest(Integer quantity) {
    }
}
