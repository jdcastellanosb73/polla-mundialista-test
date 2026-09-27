using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Auth;

public class TokenService(IConfiguration config)
{
    public string Create(User user)
    {
        var jwt = config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Only id / email / role / name — a JWT payload is decodable by anyone,
        // so nothing sensitive goes in it.
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new("name", user.DisplayName),
        };
        // The forced-change gate reads this claim; issuing a fresh token after the
        // change drops it.
        if (user.MustChangePassword)
            claims.Add(new Claim("pwd_change", "1"));

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
