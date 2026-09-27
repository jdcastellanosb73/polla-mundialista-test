using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Contracts;
using PollaMundialista.Infrastructure.Data;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Application.Common;
using PollaMundialista.Domain.Services;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Route("api/matches")]
[Authorize]
public class MatchesController(AppDbContext db, ScoringService scoring) : ControllerBase
{
    /// <summary>
    /// All 12 matches with the caller's OWN prediction attached.
    /// PRIVACY: other users' predictions are never returned by this endpoint —
    /// a User can only ever see their own picks for open matches.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<MatchDto>>> GetMatches()
    {
        var userId = CurrentUserId();
        var now = DateTime.UtcNow;

        var matches = await db.Matches.AsNoTracking()
            .OrderBy(m => m.KickoffAt).ThenBy(m => m.Id)
            .ToListAsync();

        var mine = await db.Predictions.AsNoTracking()
            .Where(p => p.UserId == userId)
            .ToDictionaryAsync(p => p.MatchId);

        var result = matches.Select(m => new MatchDto(
            m.Id, m.GroupCode, m.HomeTeam, m.AwayTeam, m.KickoffAt,
            IsOpen: m.IsOpenForPredictions(now),
            Result: m.ResultLoadedAt != null
                ? new MatchScoreDto(m.HomeGoals!.Value, m.AwayGoals!.Value)
                : null,
            MyPrediction: mine.TryGetValue(m.Id, out var p)
                ? new MyPredictionDto(p.HomeGoals, p.AwayGoals, p.Points)
                : null)).ToList();

        return result;
    }

    /// <summary>
    /// Upsert the caller's prediction for a match.
    /// Invariants: locked once the real result is loaded, locked at kickoff (server UTC),
    /// one prediction per user per match (DB unique constraint backs the code).
    /// </summary>
    [HttpPut("{id:int}/prediction")]
    public async Task<ActionResult<MyPredictionDto>> UpsertPrediction(int id, PredictionRequest req)
    {
        ValidateGoals(req.HomeGoals, req.AwayGoals);
        var userId = CurrentUserId();

        var match = await db.Matches.FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new AppException(404, "MATCH_NOT_FOUND", $"Match {id} does not exist.");

        if (match.ResultLoadedAt != null)
            throw new AppException(409, "RESULT_ALREADY_LOADED", "The real result for this match is already loaded.");
        if (match.KickoffAt <= DateTime.UtcNow)
            throw new AppException(409, "MATCH_ALREADY_STARTED", "Predictions close at kickoff.");

        var now = DateTime.UtcNow;
        var existing = await db.Predictions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == id);

        if (existing is null)
        {
            var created = new Prediction
            {
                Id = Guid.NewGuid(), UserId = userId, MatchId = id,
                HomeGoals = req.HomeGoals, AwayGoals = req.AwayGoals,
                CreatedAt = now, UpdatedAt = now,
            };
            db.Predictions.Add(created);
            try
            {
                await db.SaveChangesAsync();
                return new MyPredictionDto(created.HomeGoals, created.AwayGoals, created.Points);
            }
            catch (DbUpdateException)
            {
                // Concurrent insert for the same (user, match): the unique constraint fired.
                // Recover by updating the row that won the race — check-then-act alone races;
                // the DB constraint is what makes this safe.
                db.Entry(created).State = EntityState.Detached;
                existing = await db.Predictions
                    .FirstAsync(p => p.UserId == userId && p.MatchId == id);
            }
        }

        existing.HomeGoals = req.HomeGoals;
        existing.AwayGoals = req.AwayGoals;
        existing.UpdatedAt = now;
        await db.SaveChangesAsync();
        return new MyPredictionDto(existing.HomeGoals, existing.AwayGoals, existing.Points);
    }

    /// <summary>
    /// Module 3 (admin): load or CORRECT the final result. Scoring runs for every
    /// prediction of the match and is idempotent — a correction re-runs the
    /// computation and overwrites, it never accumulates points.
    /// </summary>
    [HttpPost("{id:int}/result")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<object>> LoadResult(int id, ResultRequest req)
    {
        ValidateGoals(req.HomeGoals, req.AwayGoals);

        var match = await db.Matches.FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new AppException(404, "MATCH_NOT_FOUND", $"Match {id} does not exist.");

        match.HomeGoals = req.HomeGoals;
        match.AwayGoals = req.AwayGoals;
        match.ResultLoadedAt = DateTime.UtcNow;

        var predictions = await db.Predictions.Where(p => p.MatchId == id).ToListAsync();
        foreach (var p in predictions)
            p.Points = scoring.Score(p.HomeGoals, p.AwayGoals, req.HomeGoals, req.AwayGoals);

        await db.SaveChangesAsync();
        return new { matchId = id, predictionsScored = predictions.Count };
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    internal static void ValidateGoals(int home, int away)
    {
        if (home is < 0 or > 99 || away is < 0 or > 99)
            throw new AppException(400, "VALIDATION_ERROR", "Goals must be between 0 and 99.");
    }
}
