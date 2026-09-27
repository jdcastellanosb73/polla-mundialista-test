using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace PollaApi.Tests;

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
    [InlineData("ok@test.dev", "Valid Name", "short")]       // weak password
    public async Task Register_InvalidInput_Returns400_VALIDATION_ERROR(string email, string name, string password)
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, displayName = name, password });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await ErrorCodeOf(res));
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
