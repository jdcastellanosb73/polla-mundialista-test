using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaMundialista.Tests;

/// <summary>
/// Module 2 integration tests: seeded matches, prediction upsert and the
/// business invariants (validation, kickoff lock, privacy of own predictions).
/// </summary>
public class PredictionsIntegrationTests : IntegrationTestBase
{
    [Fact]
    public async Task Seed_Creates12Matches_In2Groups_AllOpenForPredictions()
    {
        var (user, _) = await CreateParticipantAsync();
        var matches = JsonNode.Parse(await user.GetStringAsync("/api/matches"))!.AsArray();

        Assert.Equal(12, matches.Count);
        Assert.All(matches, m => Assert.True(m!["isOpen"]!.GetValue<bool>()));
        var groups = matches.Select(m => m!["groupCode"]!.GetValue<string>()).Distinct().OrderBy(g => g).ToList();
        Assert.Equal(new[] { "A", "B" }, groups);
        Assert.Equal(6, matches.Count(m => m!["groupCode"]!.GetValue<string>() == "A"));
    }

    [Fact]
    public async Task Matches_And_Predictions_Require_Token()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Anon.GetAsync("/api/matches")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await Anon.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 1, awayGoals = 0 })).StatusCode);
    }

    [Fact]
    public async Task Prediction_Create_Then_Update_Upserts_SingleRow()
    {
        var (user, _) = await CreateParticipantAsync();

        var create = await user.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 2, awayGoals = 1 });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var update = await user.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 0, awayGoals = 0 });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var matches = JsonNode.Parse(await user.GetStringAsync("/api/matches"))!.AsArray();
        var m1 = matches.First(m => m!["id"]!.GetValue<int>() == 1)!;
        Assert.Equal(0, m1["myPrediction"]!["homeGoals"]!.GetValue<int>());
        Assert.Equal(0, m1["myPrediction"]!["awayGoals"]!.GetValue<int>());
        Assert.True(m1["myPrediction"]!["points"] is null); // not scored yet
    }

    [Fact]
    public async Task Matches_NeverExpose_OtherUsers_Predictions()
    {
        var (alice, _) = await CreateParticipantAsync("alice@test.dev", "Alice");
        await alice.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 2, awayGoals = 1 });

        // Bob requests the matches list: he must NOT see Alice's prediction anywhere.
        var (bob, _) = await CreateParticipantAsync("bob@test.dev", "Bob");
        var raw = await bob.GetStringAsync("/api/matches");
        var matches = JsonNode.Parse(raw)!.AsArray();

        var m1 = matches.First(m => m!["id"]!.GetValue<int>() == 1)!;
        Assert.True(m1["myPrediction"] is null); // Bob has no prediction — and sees no one else's
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, 100)]
    public async Task Prediction_GoalsOutOfRange_Returns400(int home, int away)
    {
        var (user, _) = await CreateParticipantAsync();
        var res = await user.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = home, awayGoals = away });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await ErrorCodeOf(res));
    }

    [Fact]
    public async Task Prediction_UnknownMatch_Returns404()
    {
        var (user, _) = await CreateParticipantAsync();
        var res = await user.PutAsJsonAsync("/api/matches/999/prediction", new { homeGoals = 1, awayGoals = 0 });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("MATCH_NOT_FOUND", await ErrorCodeOf(res));
    }

    [Fact]
    public async Task Prediction_AfterKickoff_Returns409_MATCH_ALREADY_STARTED()
    {
        var (user, _) = await CreateParticipantAsync();
        MakeMatchStarted(3);

        var res = await user.PutAsJsonAsync("/api/matches/3/prediction", new { homeGoals = 1, awayGoals = 0 });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("MATCH_ALREADY_STARTED", await ErrorCodeOf(res));
    }
}
