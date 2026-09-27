using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Contracts;
using PollaMundialista.Infrastructure.Data;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Route("api/leaderboard")]
[Authorize]
public class LeaderboardController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Global ranking. Points are materialized per prediction at result-load time,
    /// so this read is a plain aggregation — no scoring recomputation per request.
    /// Ties break by exact hits, then name for a stable order.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<LeaderboardRowDto>>> Get()
    {
        var rows = await db.Users.AsNoTracking()
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                Points = u.Predictions.Where(p => p.Points != null).Sum(p => p.Points) ?? 0,
                ExactHits = u.Predictions.Count(p => p.Points == 3),
                Scored = u.Predictions.Count(p => p.Points != null),
            })
            .ToListAsync();

        return rows
            .OrderByDescending(r => r.Points)
            .ThenByDescending(r => r.ExactHits)
            .ThenBy(r => r.DisplayName)
            .Select(r => new LeaderboardRowDto(r.Id, r.DisplayName, r.Points, r.ExactHits, r.Scored))
            .ToList();
    }
}
