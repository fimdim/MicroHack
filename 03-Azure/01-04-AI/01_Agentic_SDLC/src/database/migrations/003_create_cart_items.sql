-- Persist the demo cart's product quantities.
CREATE TABLE cart_items (
    product_id INTEGER PRIMARY KEY,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 999),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
