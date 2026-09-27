using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PollaApi.Contracts;
using PollaApi.Data;
using PollaApi.Entities;
using PollaApi.Middleware;
using PollaApi.Services;

namespace PollaApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        // Normalize BEFORE any comparison — same normalization at login.
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var name = (req.DisplayName ?? "").Trim();

        if (!email.Contains('@') || email.Length < 5 || email.Length > 320)
            throw new AppException(400, "VALIDATION_ERROR", "A valid email is required.");
        if (name.Length is < 2 or > 60)
            throw new AppException(400, "VALIDATION_ERROR", "Display name must be 2-60 characters.");
        if ((req.Password ?? "").Length < 8)
            throw new AppException(400, "VALIDATION_ERROR", "Password must be at least 8 characters.");

        // SECURITY DECISION: registration ALWAYS creates role User. There is no way to
        // self-assign Admin through the API — the only admin is seeded from configuration.
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = Roles.User,
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Unique index on email fired — concurrent or repeated registration.
            throw new AppException(409, "EMAIL_TAKEN", "An account with this email already exists.");
        }

        return StatusCode(201, new AuthResponse(tokens.Create(user), ToDto(user)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        // Same error for unknown email and wrong password — no account enumeration.
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password ?? "", user.PasswordHash))
            throw new AppException(401, "INVALID_CREDENTIALS", "Invalid email or password.");

        return new AuthResponse(tokens.Create(user), ToDto(user));
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Email, u.DisplayName, u.Role);
}
