using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Contracts;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Infrastructure.Auth;
using PollaMundialista.Infrastructure.Data;

namespace PollaMundialista.Api.Controllers;

// PRIVATE-GROUP MODEL: there is NO public registration. The organizer creates
// every participant (AdminUsersController) with a temp password; the first
// sign-in is forced through the change-password flow below.

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

    /// <summary>
    /// Change the caller's password (required on first sign-in of organizer-created
    /// accounts; available to anyone afterwards). Verifies the current password,
    /// applies the strong policy and issues a FRESH token without the change-pending
    /// claim.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> ChangePassword(ChangePasswordRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FirstAsync(u => u.Id == userId);

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword ?? "", user.PasswordHash))
            throw new AppException(401, "INVALID_CREDENTIALS", "La contraseña actual no es correcta.");

        var weak = PasswordPolicy.Weakness(req.NewPassword ?? "");
        if (weak is not null)
            throw new AppException(400, "WEAK_PASSWORD", weak);

        if (BCrypt.Net.BCrypt.Verify(req.NewPassword, user.PasswordHash))
            throw new AppException(400, "SAME_PASSWORD", "La nueva contraseña no puede ser igual a la temporal.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.MustChangePassword = false;
        await db.SaveChangesAsync();

        logger.LogInformation("Password changed: {UserId}", user.Id);
        return new AuthResponse(tokens.Create(user), ToDto(user));
    }

    // Same error for unknown email, wrong password AND locked account — no enumeration.
    private static AppException Invalid() =>
        new(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    internal static UserDto ToDto(User u) =>
        new(u.Id, u.Email, u.DisplayName, u.Role, u.MustChangePassword);
}
