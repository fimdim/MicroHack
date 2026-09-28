from __future__ import annotations

from fastapi import APIRouter

from models.cart import AddCartItemRequest, Cart, UpdateCartItemRequest
from repositories.cart import CartRepository
from utils.errors import ValidationException

router = APIRouter(prefix="/api/cart", tags=["Cart"])
repository = CartRepository()


def require_quantity(quantity: int) -> None:
    if quantity < 1 or quantity > 999:
        raise ValidationException("quantity must be an integer between 1 and 999")


@router.get("", response_model=Cart)
async def get_cart() -> Cart:
    return await repository.find()


@router.post("", response_model=Cart)
async def add_item(request: AddCartItemRequest) -> Cart:
    if request.productId <= 0:
        raise ValidationException("productId must be a positive integer")
    require_quantity(request.quantity)
    return await repository.add(request.productId, request.quantity)


@router.put("/{product_id}", response_model=Cart)
async def update_item(product_id: int, request: UpdateCartItemRequest) -> Cart:
    if product_id <= 0:
        raise ValidationException("productId must be a positive integer")
    require_quantity(request.quantity)
    return await repository.update(product_id, request.quantity)


@router.delete("/{product_id}", status_code=204)
async def remove_item(product_id: int) -> None:
    if product_id <= 0:
        raise ValidationException("productId must be a positive integer")
    await repository.remove(product_id)
