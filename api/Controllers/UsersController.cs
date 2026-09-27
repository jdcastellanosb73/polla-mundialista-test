using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PollaApi.Contracts;
using PollaApi.Data;
using PollaApi.Middleware;

namespace PollaApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// A user's prediction history — reached from the leaderboard.
    /// PRIVACY INVARIANT: only predictions for matches whose real result is loaded.
    /// Predictions for open matches are never exposed to other users (otherwise the
    /// leaderboard becomes a copy-other-players tool). Enforced here, not in the UI.
    /// </summary>
    [HttpGet("{id:guid}/predictions")]
    public async Task<ActionResult<UserHistoryDto>> GetHistory(Guid id)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "USER_NOT_FOUND", "User does not exist.");

        var predictions = await db.Predictions.AsNoTracking()
            .Where(p => p.UserId == id && p.Match.ResultLoadedAt != null)
            .OrderBy(p => p.Match.KickoffAt)
            .Select(p => new UserPredictionDto(
                p.MatchId, p.Match.GroupCode, p.Match.HomeTeam, p.Match.AwayTeam, p.Match.KickoffAt,
                p.Match.HomeGoals!.Value, p.Match.AwayGoals!.Value,
                p.HomeGoals, p.AwayGoals, p.Points))
            .ToListAsync();

        return new UserHistoryDto(user.Id, user.DisplayName, predictions);
    }
}
