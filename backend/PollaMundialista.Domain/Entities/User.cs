namespace PollaMundialista.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = null!;       // stored normalized: trim + lowercase
    public string DisplayName { get; set; } = null!;
    public string PasswordHash { get; set; } = null!; // BCrypt
    public string Role { get; set; } = Roles.User;    // "User" | "Admin"
    public DateTime CreatedAt { get; set; }

    // Brute-force protection: after N failed logins the account locks temporarily.
    // The lockout is SILENT (same 401) — revealing it would reveal the account exists.
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutUntil { get; set; }

    public List<Prediction> Predictions { get; set; } = new();
}

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";
}
