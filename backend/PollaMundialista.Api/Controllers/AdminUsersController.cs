using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Contracts;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Infrastructure.Data;

namespace PollaMundialista.Api.Controllers;

/// <summary>
/// Participant management for the PRIVATE-GROUP model: only the organizer
/// creates accounts. Each new participant gets a generated temp password
/// (returned exactly once) and must change it on first sign-in.
/// </summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = Roles.Admin)]
public class AdminUsersController(AppDbContext db, ILogger<AdminUsersController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminUserDto>>> List() =>
        await db.Users.AsNoTracking()
            .Where(u => u.Role == Roles.User)
            .OrderBy(u => u.DisplayName)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.DisplayName, u.MustChangePassword, u.CreatedAt))
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult<CreateParticipantResponse>> Create(CreateParticipantRequest req)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var name = (req.DisplayName ?? "").Trim();

        if (!email.Contains('@') || email.Length < 5 || email.Length > 320)
            throw new AppException(400, "VALIDATION_ERROR", "A valid email is required.");
        if (name.Length is < 2 or > 60)
            throw new AppException(400, "VALIDATION_ERROR", "Display name must be 2-60 characters.");

        var tempPassword = PasswordPolicy.GenerateTemp();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            Role = Roles.User,           // organizer-created accounts are ALWAYS participants
            MustChangePassword = true,   // first sign-in is forced through change-password
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new AppException(409, "EMAIL_TAKEN", "An account with this email already exists.");
        }

        logger.LogInformation("Participant created by organizer: {UserId}", user.Id);
        // The temp password travels in this response ONLY — it is never retrievable again.
        return StatusCode(201, new CreateParticipantResponse(AuthController.ToDto(user), tempPassword));
    }
}
