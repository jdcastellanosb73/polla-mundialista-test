using System.Security.Cryptography;

namespace PollaMundialista.Application.Common;

/// <summary>
/// Strong-password policy shared by the change-password flow and the
/// organizer-created temp passwords: >= 8 chars, upper, lower, digit, symbol.
/// </summary>
public static class PasswordPolicy
{
    /// <summary>Human message describing what the password is missing, or null if strong.</summary>
    public static string? Weakness(string password)
    {
        var missing = new List<string>();
        if (password.Length < 8) missing.Add("mínimo 8 caracteres");
        if (!password.Any(char.IsUpper)) missing.Add("una mayúscula");
        if (!password.Any(char.IsLower)) missing.Add("una minúscula");
        if (!password.Any(char.IsDigit)) missing.Add("un número");
        if (!password.Any(c => !char.IsLetterOrDigit(c))) missing.Add("un símbolo");
        return missing.Count == 0 ? null : $"La contraseña necesita: {string.Join(", ", missing)}.";
    }

    private const string Uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O para evitar confusiones
    private const string Lowers = "abcdefghjkmnpqrstuvwxyz";  // sin i/l/o
    private const string Digits = "23456789";                 // sin 0/1

    /// <summary>Readable one-time password that always satisfies the policy, e.g. "Kwm4Tqz7!".</summary>
    public static string GenerateTemp()
    {
        static char Pick(string set) => set[RandomNumberGenerator.GetInt32(set.Length)];
        Span<char> body = stackalloc char[8];
        body[0] = Pick(Uppers);
        for (var i = 1; i < 4; i++) body[i] = Pick(Lowers);
        body[4] = Pick(Uppers);
        for (var i = 5; i < 8; i++) body[i] = Pick(Digits);
        return new string(body) + "!";
    }
}
