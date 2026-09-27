using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Infrastructure.Data;
using Xunit;

namespace PollaMundialista.Tests;

/// <summary>
/// Shared plumbing for integration tests: one fresh app + database per test,
/// plus helpers to register users, log in the seeded admin and inspect the
/// standard error envelope.
/// </summary>
public abstract class IntegrationTestBase : IDisposable
{
    protected readonly TestAppFactory Factory = new();
    protected readonly HttpClient Anon;

    protected IntegrationTestBase() => Anon = Factory.CreateClient();

    public void Dispose() => Factory.Dispose();

    protected async Task<(HttpClient Client, string UserId)> RegisterAsync(
        string email = "player@test.dev", string name = "Player One", string password = "Password1!")
    {
        var res = await Anon.PostAsJsonAsync("/api/auth/register",
            new { email, displayName = name, password });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        return (Authed(body["token"]!.GetValue<string>()), body["user"]!["id"]!.GetValue<string>());
    }

    protected async Task<HttpClient> LoginAdminAsync()
    {
        var res = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        return Authed(body["token"]!.GetValue<string>());
    }

    protected HttpClient Authed(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    protected static async Task<string> ErrorCodeOf(HttpResponseMessage res) =>
        JsonNode.Parse(await res.Content.ReadAsStringAsync())!["error"]!["code"]!.GetValue<string>();

    /// <summary>Moves a match's kickoff into the past to exercise the kickoff lock.</summary>
    protected void MakeMatchStarted(int matchId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var match = db.Matches.First(m => m.Id == matchId);
        match.KickoffAt = DateTime.UtcNow.AddMinutes(-5);
        db.SaveChanges();
    }
}
