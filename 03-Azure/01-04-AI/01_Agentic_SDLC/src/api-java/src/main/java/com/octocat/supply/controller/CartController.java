package com.octocat.supply.controller;

import com.octocat.supply.exception.ValidationException;
import com.octocat.supply.model.CartModel.AddCartItemRequest;
import com.octocat.supply.model.CartModel.Cart;
import com.octocat.supply.model.CartModel.UpdateCartItemRequest;
import com.octocat.supply.repository.CartRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {
    private final CartRepository repository;

    public CartController(CartRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Cart getCart() {
        return repository.find();
    }

    @PostMapping
    public Cart addItem(@RequestBody AddCartItemRequest request) {
        requirePositive(request.productId(), "productId");
        requireQuantity(request.quantity());
        return repository.add(request.productId(), request.quantity());
    }

    @PutMapping("/{productId}")
    public Cart updateItem(
        @PathVariable int productId,
        @RequestBody UpdateCartItemRequest request
    ) {
        requirePositive(productId, "productId");
        requireQuantity(request.quantity());
        return repository.update(productId, request.quantity());
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeItem(@PathVariable int productId) {
        requirePositive(productId, "productId");
        repository.remove(productId);
    }

    private static void requirePositive(Integer value, String field) {
        if (value == null || value <= 0) {
            throw new ValidationException(field + " must be a positive integer");
        }
    }

    private static void requireQuantity(Integer quantity) {
        if (quantity == null || quantity < 1 || quantity > 999) {
            throw new ValidationException("quantity must be an integer between 1 and 999");
        }
    }
}
