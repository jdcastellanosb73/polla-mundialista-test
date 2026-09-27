using Microsoft.Extensions.Configuration;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Data;

/// <summary>
/// Idempotent startup seeder: creates the schema's initial data only when missing.
/// - 12 group-stage matches (2 groups × 4 teams, full round-robin), kickoffs in the future
///   so predictions are OPEN during review. Same data as db/seed.sql.
/// - Admin + demo user from configuration (BCrypt hashes generated at runtime).
///   Registration never creates admins — the seeded admin is the only one.
/// </summary>
public static class DbSeeder
{
    public static void Seed(AppDbContext db, IConfiguration config)
    {
        if (!db.Matches.Any())
        {
            db.Matches.AddRange(BuildMatches());
            db.SaveChanges();
        }

        if (!db.Users.Any())
        {
            var seed = config.GetSection("Seed");
            db.Users.AddRange(
                BuildUser(seed["AdminEmail"] ?? "admin@polla.dev",
                          seed["AdminName"] ?? "Admin",
                          seed["AdminPassword"] ?? "Admin123!",
                          Roles.Admin),
                BuildUser(seed["DemoEmail"] ?? "user@polla.dev",
                          seed["DemoName"] ?? "Usuario Demo",
                          seed["DemoPassword"] ?? "User123!",
                          Roles.User));
            db.SaveChanges();
        }
    }

    private static User BuildUser(string email, string name, string password, string role) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Trim().ToLowerInvariant(),
        DisplayName = name,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Role = role,
        CreatedAt = DateTime.UtcNow,
    };

    private static List<Match> BuildMatches()
    {
        Match M(int id, string group, string home, string away, int day, int hour) => new()
        {
            Id = id, GroupCode = group, HomeTeam = home, AwayTeam = away,
            KickoffAt = new DateTime(2026, 11, day, hour, 0, 0, DateTimeKind.Utc),
        };

        return new List<Match>
        {
            // Group A: México, Alemania, Escocia, Uruguay
            M( 1, "A", "México",    "Alemania",  10, 18),
            M( 2, "A", "Escocia",   "Uruguay",   10, 21),
            M( 3, "A", "México",    "Escocia",   13, 18),
            M( 4, "A", "Alemania",  "Uruguay",   13, 21),
            M( 5, "A", "México",    "Uruguay",   16, 18),
            M( 6, "A", "Alemania",  "Escocia",   16, 21),
            // Group B: Argentina, Francia, Japón, Marruecos
            M( 7, "B", "Argentina", "Francia",   11, 18),
            M( 8, "B", "Japón",     "Marruecos", 11, 21),
            M( 9, "B", "Argentina", "Japón",     14, 18),
            M(10, "B", "Francia",   "Marruecos", 14, 21),
            M(11, "B", "Argentina", "Marruecos", 17, 18),
            M(12, "B", "Francia",   "Japón",     17, 21),
        };
    }
}
