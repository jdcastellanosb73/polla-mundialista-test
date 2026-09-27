using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaMundialista.Tests;

/// <summary>
/// Auth + account-management integration tests for the PRIVATE-GROUP model:
/// no public registration, organizer-created accounts with one-time temp
/// passwords, a server-enforced first-login password change, silent lockout,
/// rate limiting, portal segregation and no account enumeration.
/// </summary>
public class AuthIntegrationTests : IntegrationTestBase
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        var res = await Anon.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task PublicRegistration_DoesNotExist()
    {
        // Private group: accounts are created by the organizer only.
        var res = await Anon.PostAsJsonAsync("/api/auth/register",
            new { email = "outsider@test.dev", displayName = "Outsider", password = "Password1!" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Organizer_CreatesParticipant_TempPasswordAndNormalizedEmail()
    {
        var admin = await LoginAdminAsync();
        var res = await admin.PostAsJsonAsync("/api/admin/users",
            new { email = "  MiXeD.Case@Mail.COM ", displayName = "Mixed Case" });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        Assert.Equal("mixed.case@mail.com", body["user"]!["email"]!.GetValue<string>());
        Assert.Equal("User", body["user"]!["role"]!.GetValue<string>());
        Assert.True(body["user"]!["mustChangePassword"]!.GetValue<bool>());

        // The one-time temp password satisfies the strong policy.
        var temp = body["tempPassword"]!.GetValue<string>();
        Assert.True(temp.Length >= 8);
        Assert.Contains(temp, c => char.IsUpper(c));
        Assert.Contains(temp, c => char.IsLower(c));
        Assert.Contains(temp, c => char.IsDigit(c));
        Assert.Contains(temp, c => !char.IsLetterOrDigit(c));
    }

    [Fact]
    public async Task NonAdmin_CannotCreateParticipants()
    {
        var (player, _) = await CreateParticipantAsync();
        var res = await player.PostAsJsonAsync("/api/admin/users",
            new { email = "sneaky@test.dev", displayName = "Sneaky" });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task CreateParticipant_DuplicateEmail_Returns409()
    {
        var admin = await LoginAdminAsync();
        await admin.PostAsJsonAsync("/api/admin/users", new { email = "dup@test.dev", displayName = "First" });
        var res = await admin.PostAsJsonAsync("/api/admin/users", new { email = "DUP@test.dev", displayName = "Second" });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("EMAIL_TAKEN", await ErrorCodeOf(res));
    }

    [Theory]
    [InlineData("not-an-email", "Valid Name")]
    [InlineData("ok@test.dev", "X")]
    public async Task CreateParticipant_InvalidInput_Returns400(string email, string name)
    {
        var admin = await LoginAdminAsync();
        var res = await admin.PostAsJsonAsync("/api/admin/users", new { email, displayName = name });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await ErrorCodeOf(res));
    }

    [Fact]
    public async Task TempAccount_IsGated_UntilPasswordChange()
    {
        var admin = await LoginAdminAsync();
        var created = await admin.PostAsJsonAsync("/api/admin/users",
            new { email = "gated@test.dev", displayName = "Gated User" });
        var temp = JsonNode.Parse(await created.Content.ReadAsStringAsync())!["tempPassword"]!.GetValue<string>();

        var login = await Anon.PostAsJsonAsync("/api/auth/login", new { email = "gated@test.dev", password = temp });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var tempClient = Authed(JsonNode.Parse(await login.Content.ReadAsStringAsync())!["token"]!.GetValue<string>());

        // SERVER-enforced gate: nothing but change-password works with the temp session.
        var blocked = await tempClient.GetAsync("/api/matches");
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Equal("PASSWORD_CHANGE_REQUIRED", await ErrorCodeOf(blocked));

        // Weak new password rejected; reusing the temp rejected.
        var weak = await tempClient.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = temp, newPassword = "facilita" });
        Assert.Equal("WEAK_PASSWORD", await ErrorCodeOf(weak));
        var same = await tempClient.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = temp, newPassword = temp });
        Assert.Equal("SAME_PASSWORD", await ErrorCodeOf(same));

        // Proper change issues a fresh token and lifts the gate.
        var ok = await tempClient.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = temp, newPassword = "MiPropia123!" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var body = JsonNode.Parse(await ok.Content.ReadAsStringAsync())!;
        Assert.False(body["user"]!["mustChangePassword"]!.GetValue<bool>());

        var fresh = Authed(body["token"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.OK, (await fresh.GetAsync("/api/matches")).StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns401()
    {
        var (player, _) = await CreateParticipantAsync();
        var res = await player.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = "no-es-esta", newPassword = "OtraFuerte1!" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_SeededAdmin_ReturnsAdminRole()
    {
        var res = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        Assert.Equal("Admin", body["user"]!["role"]!.GetValue<string>());
        Assert.False(body["user"]!["mustChangePassword"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Login_NormalizedEmail_Works_RegardlessOfCasing()
    {
        var res = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "  ADMIN@Polla.DEV ", password = "Admin123!" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Login_WrongPassword_And_UnknownEmail_ReturnSameError_NoEnumeration()
    {
        var wrongPass = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "user@polla.dev", password = "wrong-pass" }); // seeded demo account
        var unknown = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "ghost@test.dev", password = "whatever1!" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPass.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(await ErrorCodeOf(wrongPass), await ErrorCodeOf(unknown));
    }

    [Fact]
    public async Task Login_After5FailedAttempts_LocksAccount_SilentlyEvenWithCorrectPassword()
    {
        for (var i = 0; i < 5; i++)
        {
            var bad = await Anon.PostAsJsonAsync("/api/auth/login",
                new { email = "user@polla.dev", password = "wrong-pass!" });
            Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
        }

        // Correct password, but the account is now locked — SAME 401 (silent lockout).
        var locked = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "user@polla.dev", password = "User123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        Assert.Equal("INVALID_CREDENTIALS", await ErrorCodeOf(locked));
    }

    [Fact]
    public async Task AuthEndpoints_RateLimited_With429_After10RequestsInAMinute()
    {
        HttpResponseMessage? last = null;
        for (var i = 0; i < 11; i++)
            last = await Anon.PostAsJsonAsync("/api/auth/login",
                new { email = $"rl{i}@test.dev", password = "whatever1!" });

        Assert.Equal((HttpStatusCode)429, last!.StatusCode);
        Assert.Equal("RATE_LIMITED", await ErrorCodeOf(last));
    }

    [Fact]
    public async Task Login_PortalSegregation_IsServerEnforced_BothDirections()
    {
        // Regular account through the ADMIN portal -> 403, no token issued.
        var userOnAdmin = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "user@polla.dev", password = "User123!", portal = "admin" });
        Assert.Equal(HttpStatusCode.Forbidden, userOnAdmin.StatusCode);
        Assert.Equal("PORTAL_MISMATCH", await ErrorCodeOf(userOnAdmin));

        // Admin account through the USER portal -> 403, no token issued.
        var adminOnUser = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!", portal = "user" });
        Assert.Equal(HttpStatusCode.Forbidden, adminOnUser.StatusCode);
        Assert.Equal("PORTAL_MISMATCH", await ErrorCodeOf(adminOnUser));

        // Matching portals still work.
        var okUser = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "user@polla.dev", password = "User123!", portal = "user" });
        Assert.Equal(HttpStatusCode.OK, okUser.StatusCode);
        var okAdmin = await Anon.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!", portal = "admin" });
        Assert.Equal(HttpStatusCode.OK, okAdmin.StatusCode);
    }
}
