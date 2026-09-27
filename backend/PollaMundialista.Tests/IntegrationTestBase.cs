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
/// plus helpers that exercise the PRIVATE-GROUP account flow end to end —
/// the organizer creates each participant, who signs in with the temp password
/// and is forced through change-password before doing anything else.
/// </summary>
public abstract class IntegrationTestBase : IDisposable
{
    protected readonly TestAppFactory Factory = new();
    protected readonly HttpClient Anon;
    private HttpClient? _adminCache;

    protected IntegrationTestBase() => Anon = Factory.CreateClient();

    public void Dispose() => Factory.Dispose();

    protected async Task<HttpClient> LoginAdminAsync()
    {
        if (_adminCache is not null) return _adminCache;
        var res = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        return _adminCache = Authed(body["token"]!.GetValue<string>());
    }

    /// <summary>
    /// Full participant onboarding: organizer creates the account, the user signs
    /// in with the temp password and completes the forced password change.
    /// Returns a client authenticated with the user's OWN password.
    /// </summary>
    protected async Task<(HttpClient Client, string UserId)> CreateParticipantAsync(
        string email = "player@test.dev", string name = "Player One", string password = "Password1!")
    {
        var admin = await LoginAdminAsync();

        var created = await admin.PostAsJsonAsync("/api/admin/users",
            new { email, displayName = name });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var createdBody = JsonNode.Parse(await created.Content.ReadAsStringAsync())!;
        var temp = createdBody["tempPassword"]!.GetValue<string>();
        var userId = createdBody["user"]!["id"]!.GetValue<string>();

        var login = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email, password = temp });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var tempToken = JsonNode.Parse(await login.Content.ReadAsStringAsync())!["token"]!.GetValue<string>();

        var change = await Authed(tempToken).PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = temp, newPassword = password });
        Assert.Equal(HttpStatusCode.OK, change.StatusCode);
        var freshToken = JsonNode.Parse(await change.Content.ReadAsStringAsync())!["token"]!.GetValue<string>();

        return (Authed(freshToken), userId);
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
