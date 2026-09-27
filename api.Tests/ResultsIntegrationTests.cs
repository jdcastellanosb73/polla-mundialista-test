using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaApi.Tests;

/// <summary>
/// Module 3 integration tests: only the Admin loads results, scoring is
/// materialized for every prediction (3/1/0), corrections recompute
/// idempotently, and predictions lock once a result exists.
/// </summary>
public class ResultsIntegrationTests : IntegrationTestBase
{
    private async Task<int?> MyPointsOnMatch(HttpClient client, int matchId)
    {
        var matches = JsonNode.Parse(await client.GetStringAsync("/api/matches"))!.AsArray();
        var m = matches.First(x => x!["id"]!.GetValue<int>() == matchId)!;
        return m["myPrediction"]?["points"]?.GetValue<int>();
    }

    [Fact]
    public async Task Result_AsRegularUser_Returns403()
    {
        var (user, _) = await RegisterAsync();
        var res = await user.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 1, awayGoals = 0 });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Result_UnknownMatch_Returns404()
    {
        var admin = await LoginAdminAsync();
        var res = await admin.PostAsJsonAsync("/api/matches/999/result", new { homeGoals = 1, awayGoals = 0 });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("MATCH_NOT_FOUND", await ErrorCodeOf(res));
    }

    [Fact]
    public async Task Result_ScoresAllPredictions_3_1_0_AndEachUserSeesTheirOwn()
    {
        var (exact, _) = await RegisterAsync("exact@test.dev", "Exact");
        var (outcome, _) = await RegisterAsync("outcome@test.dev", "Outcome");
        var (miss, _) = await RegisterAsync("miss@test.dev", "Miss");
        var admin = await LoginAdminAsync();

        await exact.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 3, awayGoals = 1 });
        await outcome.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 1, awayGoals = 0 });
        await miss.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 0, awayGoals = 2 });

        var res = await admin.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 3, awayGoals = 1 });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(3, JsonNode.Parse(await res.Content.ReadAsStringAsync())!["predictionsScored"]!.GetValue<int>());

        // "Al guardar el resultado real, cada usuario podrá ver el resultado de su predicción"
        Assert.Equal(3, await MyPointsOnMatch(exact, 1));
        Assert.Equal(1, await MyPointsOnMatch(outcome, 1));
        Assert.Equal(0, await MyPointsOnMatch(miss, 1));
    }

    [Fact]
    public async Task Result_Correction_RecomputesIdempotently_NeverAccumulates()
    {
        var (user, _) = await RegisterAsync();
        var admin = await LoginAdminAsync();

        await user.PutAsJsonAsync("/api/matches/1/prediction", new { homeGoals = 2, awayGoals = 0 });

        await admin.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 2, awayGoals = 0 }); // exact -> 3
        Assert.Equal(3, await MyPointsOnMatch(user, 1));

        // Correction: outcome only. Points must OVERWRITE to 1, never sum to 4.
        await admin.PostAsJsonAsync("/api/matches/1/result", new { homeGoals = 1, awayGoals = 0 });
        Assert.Equal(1, await MyPointsOnMatch(user, 1));
    }

    [Fact]
    public async Task Prediction_AfterResultLoaded_Returns409_RESULT_ALREADY_LOADED()
    {
        var (user, _) = await RegisterAsync();
        var admin = await LoginAdminAsync();
        await admin.PostAsJsonAsync("/api/matches/2/result", new { homeGoals = 1, awayGoals = 1 });

        var res = await user.PutAsJsonAsync("/api/matches/2/prediction", new { homeGoals = 1, awayGoals = 1 });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("RESULT_ALREADY_LOADED", await ErrorCodeOf(res));
    }
}
