from __future__ import annotations

from pydantic import BaseModel


class CartItem(BaseModel):
    productId: int
    name: str
    price: float
    imgName: str
    quantity: int
    lineTotal: float


class Cart(BaseModel):
    items: list[CartItem]
    total: float


class AddCartItemRequest(BaseModel):
    productId: int
    quantity: int


class UpdateCartItemRequest(BaseModel):
    quantity: int
