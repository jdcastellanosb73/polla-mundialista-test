namespace PollaApi.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = null!;       // stored normalized: trim + lowercase
    public string DisplayName { get; set; } = null!;
    public string PasswordHash { get; set; } = null!; // BCrypt
    public string Role { get; set; } = Roles.User;    // "User" | "Admin"
    public DateTime CreatedAt { get; set; }

    public List<Prediction> Predictions { get; set; } = new();
}

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";
}
