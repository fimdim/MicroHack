using Microsoft.AspNetCore.Mvc;
using OctoSupply.Api.Models;
using OctoSupply.Api.Repositories;
using OctoSupply.Api.Utils;

namespace OctoSupply.Api.Controllers;

[ApiController]
[Route("api/cart")]
public sealed class CartController(CartRepository repository) : ControllerBase
{
    private readonly CartRepository _repository = repository;

    [HttpGet]
    public async Task<ActionResult<Cart>> GetCart() => Ok(await _repository.FindAsync());

    [HttpPost]
    public async Task<ActionResult<Cart>> AddItem([FromBody] AddCartItemRequest request)
    {
        ValidateProductId(request.ProductId);
        ValidateQuantity(request.Quantity);
        return Ok(await _repository.AddAsync(request.ProductId, request.Quantity));
    }

    [HttpPut("{productId:int}")]
    public async Task<ActionResult<Cart>> UpdateItem(
        int productId,
        [FromBody] UpdateCartItemRequest request)
    {
        ValidateProductId(productId);
        ValidateQuantity(request.Quantity);
        return Ok(await _repository.UpdateAsync(productId, request.Quantity));
    }

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> RemoveItem(int productId)
    {
        ValidateProductId(productId);
        await _repository.RemoveAsync(productId);
        return NoContent();
    }

    private static void ValidateProductId(int productId)
    {
        if (productId <= 0)
        {
            throw new ValidationException("productId must be a positive integer");
        }
    }

    private static void ValidateQuantity(int quantity)
    {
        if (quantity is < 1 or > 999)
        {
            throw new ValidationException("quantity must be an integer between 1 and 999");
        }
    }
}
