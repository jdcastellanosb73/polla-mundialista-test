using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PollaMundialista.Infrastructure.Data;
using PollaMundialista.Api.Middleware;
using PollaMundialista.Domain.Services;
using PollaMundialista.Infrastructure.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<TokenService>();
builder.Services.AddSingleton<ScoringService>();

var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

// Brute-force guard on /api/auth/*: fixed window of 10 requests per IP per minute.
// Applied via [EnableRateLimiting("auth")] on AuthController; rejections use the
// same error envelope as the rest of the API.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            """{"error":{"code":"RATE_LIMITED","message":"Too many requests. Try again in a minute."}}""", ct);
    };
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

// CORS: only the known web origin(s) — configurable for the hosted environment.
var webOrigins = (builder.Configuration["WebOrigin"] ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(webOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Bootstrap: create schema if missing (mirrors db/schema.sql) and seed initial data.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    DbSeeder.Seed(db, app.Configuration);
}

app.UseMiddleware<ErrorHandlingMiddleware>();

// Security headers on every response.
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();

// Forced password-change gate: organizer-created accounts carry a pwd_change
// claim until they set their own password. While it is present, every endpoint
// except the change itself is refused — enforced server-side, not just in the UI.
app.Use(async (ctx, next) =>
{
    var mustChange = ctx.User.Identity?.IsAuthenticated == true
                     && ctx.User.HasClaim("pwd_change", "1");
    var allowed = ctx.Request.Path.StartsWithSegments("/api/auth/change-password")
                  || ctx.Request.Path.StartsWithSegments("/health");
    if (mustChange && !allowed)
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        await ctx.Response.WriteAsJsonAsync(new
        {
            error = new
            {
                code = "PASSWORD_CHANGE_REQUIRED",
                message = "Debes cambiar tu contraseña temporal antes de continuar.",
            },
        });
        return;
    }
    await next();
});

app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

// Exposes the implicit Program class to the integration test project (WebApplicationFactory<Program>).
public partial class Program { }
