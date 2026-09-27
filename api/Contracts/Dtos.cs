namespace PollaApi.Contracts;

// ---- Auth (module 1) ----
public record RegisterRequest(string Email, string DisplayName, string Password);
public record LoginRequest(string Email, string Password);
public record UserDto(Guid Id, string Email, string DisplayName, string Role);
public record AuthResponse(string Token, UserDto User);
