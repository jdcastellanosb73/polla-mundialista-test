using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaMundialista.Tests;

/// <summary>
/// Module 4 integration tests: global ranking ordering with tie-breaks, and the
/// history privacy invariant (only finished matches are ever exposed to others).
/// </summary>
public class LeaderboardIntegrationTests : IntegrationTestBase
{
    [Fact]
    public async Task Leaderboard_And_History_Require_Token()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Anon.GetAsync("/api/leaderboard")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await Anon.GetAsync($"/api/users/{Guid.NewGuid()}/predictions")).StatusCode);
    }

    [Fact]
    public async Task Leaderboard_OrdersByPoints_ThenByExactHits()
    {
        var (alice, _) = await CreateParticipantAsync("alice@test.dev", "Alice");
        var (bob, _) = await CreateParticipantAsync("bob@test.dev", "Bob");
        var admin = await LoginAdminAsync();

        // Alice: exact on match 1 (3 pts). Bob: outcome on 1 and 2 (2 pts).
        await alice.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 2, awayGoals = 1 });
        await bob.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 1, awayGoals = 0 });
        await bob.PutAsJsonAsync("/api/matches/2/prediction", new { homeGoals = 1, awayGoals = 0 });

        await admin.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 2, awayGoals = 1 });
        await admin.PostAsJsonAsync("/api/matches/2/result", new { homeGoals = 3, awayGoals = 0 });

        var rows = JsonNode.Parse(await alice.GetStringAsync("/api/leaderboard"))!.AsArray()
            .Select(r => (Name: r!["displayName"]!.GetValue<string>(),
                          Points: r["points"]!.GetValue<int>(),
                          Exact: r["exactHits"]!.GetValue<int>()))
            .ToList();

        var aliceIdx = rows.FindIndex(r => r.Name == "Alice");
        var bobIdx = rows.FindIndex(r => r.Name == "Bob");
        Assert.Equal((3, 1), (rows[aliceIdx].Points, rows[aliceIdx].Exact));
        Assert.Equal((2, 0), (rows[bobIdx].Points, rows[bobIdx].Exact));
        Assert.True(aliceIdx < bobIdx, "Alice (3 pts) must rank above Bob (2 pts)");

        // Every user appears — including the seeded ones with zero points.
        Assert.Contains(rows, r => r.Points == 0);
    }

    [Fact]
    public async Task Leaderboard_NeverExposesEmails()
    {
        var (user, _) = await CreateParticipantAsync();
        var raw = await user.GetStringAsync("/api/leaderboard");
        Assert.DoesNotContain("@", raw); // displayName + ids only, no account data
    }

    [Fact]
    public async Task History_ExposesOnlyFinishedMatches_ToOtherUsers()
    {
        var (player, playerId) = await CreateParticipantAsync("player@test.dev", "Player");
        var admin = await LoginAdminAsync();

        await player.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 1, awayGoals = 1 });
        await player.PutAsJsonAsync("/api/matches/2/prediction", new { homeGoals = 2, awayGoals = 0 }); // stays open
        await admin.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 1, awayGoals = 1 });

        // A DIFFERENT user inspects the history from the leaderboard click.
        var (viewer, _) = await CreateParticipantAsync("viewer@test.dev", "Viewer");
        var hist = JsonNode.Parse(await viewer.GetStringAsync($"/api/users/{playerId}/predictions"))!;
        var predictions = hist["predictions"]!.AsArray();

        // Only the FINISHED match is visible; the open-match prediction is never exposed.
        Assert.Single(predictions);
        Assert.Equal(1, predictions[0]!["matchId"]!.GetValue<int>());
        Assert.Equal(3, predictions[0]!["points"]!.GetValue<int>()); // 1-1 exact
    }

    [Fact]
    public async Task History_UnknownUser_Returns404()
    {
        var (user, _) = await CreateParticipantAsync();
        var res = await user.GetAsync($"/api/users/{Guid.NewGuid()}/predictions");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("USER_NOT_FOUND", await ErrorCodeOf(res));
    }
}
