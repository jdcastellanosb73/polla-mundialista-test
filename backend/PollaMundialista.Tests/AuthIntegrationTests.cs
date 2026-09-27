using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaMundialista.Tests;

/// <summary>
/// Module 1 (auth) integration tests: real HTTP pipeline (routing, JWT, error envelope,
/// EF Core) against a fresh database per test. These protect the SECURITY rules,
/// not just the happy path.
/// </summary>
public class AuthIntegrationTests : IDisposable
{
    private readonly TestAppFactory _factory = new();
    private readonly HttpClient _client;

    public AuthIntegrationTests() => _client = _factory.CreateClient();

    public void Dispose() => _factory.Dispose();

    private static async Task<string> ErrorCodeOf(HttpResponseMessage res) =>
        JsonNode.Parse(await res.Content.ReadAsStringAsync())!["error"]!["code"]!.GetValue<string>();

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var res = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Register_NormalizesEmail_AndNeverCreatesAdmin()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "  MiXeD.Case@Mail.COM ", displayName = "Mixed", password = "Password1!" });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        Assert.Equal("mixed.case@mail.com", body["user"]!["email"]!.GetValue<string>());
        Assert.Equal("User", body["user"]!["role"]!.GetValue<string>()); // never Admin via API
        Assert.False(string.IsNullOrEmpty(body["token"]!.GetValue<string>()));
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409_EMAIL_TAKEN()
    {
        await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "dup@test.dev", displayName = "First", password = "Password1!" });

        // Same email, different casing — normalization must make it collide.
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "DUP@test.dev", displayName = "Second", password = "Password1!" });

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("EMAIL_TAKEN", await ErrorCodeOf(res));
    }

    [Theory]
    [InlineData("not-an-email", "Valid Name", "Password1!")] // invalid email
    [InlineData("ok@test.dev", "X", "Password1!")]           // name too short
    public async Task Register_InvalidInput_Returns400_VALIDATION_ERROR(string email, string name, string password)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, displayName = name, password });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await ErrorCodeOf(res));
    }

    // Strong-password policy is SERVER-enforced: length, upper, lower, digit, symbol.
    [Theory]
    [InlineData("Sh0rt!!")]      // 7 chars
    [InlineData("password1!")]   // no uppercase
    [InlineData("PASSWORD1!")]   // no lowercase
    [InlineData("Password!!")]   // no digit
    [InlineData("Password11")]   // no symbol
    public async Task Register_WeakPassword_Returns400_WEAK_PASSWORD(string password)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "weak@test.dev", displayName = "Weak Pass", password });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("WEAK_PASSWORD", await ErrorCodeOf(res));
    }

    [Fact]
    public async Task Login_SeededAdmin_ReturnsAdminRole()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = JsonNode.Parse(await res.Content.ReadAsStringAsync())!;
        Assert.Equal("Admin", body["user"]!["role"]!.GetValue<string>());
    }

    [Fact]
    public async Task Login_NormalizedEmail_Works_RegardlessOfCasing()
    {
        await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "casing@test.dev", displayName = "Casing", password = "Password1!" });

        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "  CASING@Test.DEV ", password = "Password1!" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Login_After5FailedAttempts_LocksAccount_SilentlyEvenWithCorrectPassword()
    {
        await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "lock@test.dev", displayName = "Lock Me", password = "Password1!" });

        for (var i = 0; i < 5; i++)
        {
            var bad = await _client.PostAsJsonAsync("/api/auth/login",
                new { email = "lock@test.dev", password = "wrong-pass!" });
            Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
        }

        // Correct password, but the account is now locked. The response is the SAME
        // 401 INVALID_CREDENTIALS — a distinct "locked" error would leak that the
        // account exists (silent lockout).
        var locked = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "lock@test.dev", password = "Password1!" });
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        Assert.Equal("INVALID_CREDENTIALS", await ErrorCodeOf(locked));
    }

    [Fact]
    public async Task AuthEndpoints_RateLimited_With429_After10RequestsInAMinute()
    {
        HttpResponseMessage? last = null;
        for (var i = 0; i < 11; i++)
            last = await _client.PostAsJsonAsync("/api/auth/login",
                new { email = $"rl{i}@test.dev", password = "whatever1!" });

        Assert.Equal((HttpStatusCode)429, last!.StatusCode);
        Assert.Equal("RATE_LIMITED", await ErrorCodeOf(last));
    }

    [Fact]
    public async Task Login_PortalSegregation_IsServerEnforced_BothDirections()
    {
        await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "portal@test.dev", displayName = "Portal User", password = "Password1!" });

        // Regular account through the ADMIN portal -> 403, no token issued.
        var userOnAdmin = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "portal@test.dev", password = "Password1!", portal = "admin" });
        Assert.Equal(HttpStatusCode.Forbidden, userOnAdmin.StatusCode);
        Assert.Equal("PORTAL_MISMATCH", await ErrorCodeOf(userOnAdmin));

        // Admin account through the USER portal -> 403, no token issued.
        var adminOnUser = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!", portal = "user" });
        Assert.Equal(HttpStatusCode.Forbidden, adminOnUser.StatusCode);
        Assert.Equal("PORTAL_MISMATCH", await ErrorCodeOf(adminOnUser));

        // Matching portals still work.
        var okUser = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "portal@test.dev", password = "Password1!", portal = "user" });
        Assert.Equal(HttpStatusCode.OK, okUser.StatusCode);
        var okAdmin = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "admin@polla.dev", password = "Admin123!", portal = "admin" });
        Assert.Equal(HttpStatusCode.OK, okAdmin.StatusCode);
    }

    [Fact]
    public async Task Login_WrongPassword_And_UnknownEmail_ReturnSameError_NoEnumeration()
    {
        await _client.PostAsJsonAsync("/api/auth/register",
            new { email = "known@test.dev", displayName = "Known", password = "Password1!" });

        var wrongPass = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "known@test.dev", password = "wrong-pass" });
        var unknown = await _client.PostAsJsonAsync("/api/auth/login",
            new { email = "ghost@test.dev", password = "whatever1!" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPass.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        // Same code for both: an attacker can't tell which emails exist.
        Assert.Equal(await ErrorCodeOf(wrongPass), await ErrorCodeOf(unknown));
    }
}
