using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Contracts;
using PollaMundialista.Infrastructure.Data;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Application.Common;
using PollaMundialista.Infrastructure.Auth;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")] // brute-force guard: per-IP fixed window (see Program.cs)
public class AuthController(AppDbContext db, TokenService tokens, ILogger<AuthController> logger)
    : ControllerBase
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutWindow = TimeSpan.FromMinutes(15);

    // Verified against when the email does NOT exist, so both failure paths cost one
    // BCrypt comparison — a timing probe can't distinguish unknown email from wrong password.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

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

        // Strong-password policy, SERVER-enforced (the UI checklist is just UX):
        // >= 8 chars with uppercase, lowercase, digit and symbol.
        var weak = PasswordWeakness(req.Password ?? "");
        if (weak is not null)
            throw new AppException(400, "WEAK_PASSWORD", weak);

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

        logger.LogInformation("User registered: {UserId}", user.Id);
        return StatusCode(201, new AuthResponse(tokens.Create(user), ToDto(user)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            // Timing equalization: pay the BCrypt cost anyway.
            BCrypt.Net.BCrypt.Verify(req.Password ?? "", DummyHash);
            throw Invalid();
        }

        // SILENT lockout: same 401 as bad credentials — a distinct "locked" response
        // would confirm to an attacker that the account exists.
        if (user.LockoutUntil is { } until && until > DateTime.UtcNow)
        {
            logger.LogWarning("Login rejected: account {UserId} locked until {Until:u}", user.Id, until);
            throw Invalid();
        }

        if (!BCrypt.Net.BCrypt.Verify(req.Password ?? "", user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
            {
                user.LockoutUntil = DateTime.UtcNow.Add(LockoutWindow);
                user.FailedLoginCount = 0;
                logger.LogWarning("Account {UserId} locked for {Window} after {Max} failed attempts",
                    user.Id, LockoutWindow, MaxFailedAttempts);
            }
            await db.SaveChangesAsync();
            throw Invalid();
        }

        // Successful login clears any accumulated failure state.
        if (user.FailedLoginCount > 0 || user.LockoutUntil != null)
        {
            user.FailedLoginCount = 0;
            user.LockoutUntil = null;
            await db.SaveChangesAsync();
        }

        // Portal segregation, SERVER-enforced: each access page only signs in its
        // own role. Checked after password verification, so this cannot be used
        // to enumerate roles without valid credentials.
        var portalMismatch =
            (req.Portal == "admin" && user.Role != Roles.Admin) ||
            (req.Portal == "user" && user.Role == Roles.Admin);
        if (portalMismatch)
        {
            logger.LogWarning("Login rejected: {UserId} attempted the wrong portal ({Portal})", user.Id, req.Portal);
            throw new AppException(403, "PORTAL_MISMATCH",
                user.Role == Roles.Admin
                    ? "Esta cuenta es de organizador. Usa el acceso para organizadores."
                    : "Esta cuenta no tiene acceso de organizador. Usa el acceso de participantes.");
        }

        logger.LogInformation("Login ok: {UserId}", user.Id);
        return new AuthResponse(tokens.Create(user), ToDto(user));
    }

    /// <summary>Returns a human message describing what the password is missing, or null if strong.</summary>
    private static string? PasswordWeakness(string password)
    {
        var missing = new List<string>();
        if (password.Length < 8) missing.Add("mínimo 8 caracteres");
        if (!password.Any(char.IsUpper)) missing.Add("una mayúscula");
        if (!password.Any(char.IsLower)) missing.Add("una minúscula");
        if (!password.Any(char.IsDigit)) missing.Add("un número");
        if (!password.Any(c => !char.IsLetterOrDigit(c))) missing.Add("un símbolo");
        return missing.Count == 0 ? null : $"La contraseña necesita: {string.Join(", ", missing)}.";
    }

    // Same error for unknown email, wrong password AND locked account — no enumeration.
    private static AppException Invalid() =>
        new(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    private static UserDto ToDto(User u) => new(u.Id, u.Email, u.DisplayName, u.Role);
}
