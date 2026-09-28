namespace OctoSupply.Api.Models;

public sealed record CartItem(
    int ProductId,
    string Name,
    double Price,
    string ImgName,
    int Quantity,
    double LineTotal);

public sealed record Cart(IReadOnlyList<CartItem> Items, double Total);

public sealed class AddCartItemRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public sealed class UpdateCartItemRequest
{
    public int Quantity { get; set; }
}
