using OctoSupply.Api.Data;
using OctoSupply.Api.Models;
using OctoSupply.Api.Utils;

namespace OctoSupply.Api.Repositories;

public sealed class CartRepository(SqliteConnectionFactory connectionFactory)
{
    private const int MaxCartQuantity = 999;
    private readonly SqliteConnectionFactory _connectionFactory = connectionFactory;

    public async Task<Cart> FindAsync()
    {
        const string sql = """
            SELECT
                p.product_id,
                p.name,
                ROUND(p.price * (1 - COALESCE(p.discount, 0)), 2) AS price,
                p.img_name,
                ci.quantity
            FROM cart_items ci
            JOIN products p ON p.product_id = ci.product_id
            ORDER BY p.name, p.product_id;
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<CartItem>();
        while (await reader.ReadAsync())
        {
            var price = reader.GetDouble(reader.GetOrdinal("price"));
            var quantity = reader.GetInt32(reader.GetOrdinal("quantity"));
            var imageOrdinal = reader.GetOrdinal("img_name");
            items.Add(new CartItem(
                ProductId: reader.GetInt32(reader.GetOrdinal("product_id")),
                Name: reader.GetString(reader.GetOrdinal("name")),
                Price: price,
                ImgName: reader.IsDBNull(imageOrdinal) ? "" : reader.GetString(imageOrdinal),
                Quantity: quantity,
                LineTotal: RoundCurrency(price * quantity)
            ));
        }

        return new Cart(items, RoundCurrency(items.Sum(item => item.LineTotal)));
    }

    public async Task<Cart> AddAsync(int productId, int quantity)
    {
        const string sql = """
            INSERT INTO cart_items (product_id, quantity)
            VALUES ($productId, $quantity)
            ON CONFLICT(product_id) DO UPDATE SET quantity = quantity + excluded.quantity
            WHERE quantity + excluded.quantity <= $maxQuantity;
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync();
        await using var productCommand = connection.CreateCommand();
        productCommand.CommandText = "SELECT COUNT(*) FROM products WHERE product_id = $productId;";
        productCommand.Parameters.AddWithValue("$productId", productId);
        if (Convert.ToInt32(await productCommand.ExecuteScalarAsync()) == 0)
        {
            throw new NotFoundException("Product", productId);
        }

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$productId", productId);
        cmd.Parameters.AddWithValue("$quantity", quantity);
        cmd.Parameters.AddWithValue("$maxQuantity", MaxCartQuantity);
        if (await cmd.ExecuteNonQueryAsync() == 0)
        {
            throw new ValidationException($"Cart item quantity cannot exceed {MaxCartQuantity}");
        }
        return await FindAsync();
    }

    public async Task<Cart> UpdateAsync(int productId, int quantity)
    {
        const string sql = "UPDATE cart_items SET quantity = $quantity WHERE product_id = $productId;";
        await using var connection = await _connectionFactory.OpenConnectionAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$quantity", quantity);
        cmd.Parameters.AddWithValue("$productId", productId);
        if (await cmd.ExecuteNonQueryAsync() == 0)
        {
            throw new NotFoundException("Cart item", productId);
        }
        return await FindAsync();
    }

    public async Task RemoveAsync(int productId)
    {
        await using var connection = await _connectionFactory.OpenConnectionAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM cart_items WHERE product_id = $productId;";
        cmd.Parameters.AddWithValue("$productId", productId);
        if (await cmd.ExecuteNonQueryAsync() == 0)
        {
            throw new NotFoundException("Cart item", productId);
        }
    }

    private static double RoundCurrency(double value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
