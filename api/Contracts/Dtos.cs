namespace PollaApi.Contracts;

// ---- Auth (module 1) ----
public record RegisterRequest(string Email, string DisplayName, string Password);
public record LoginRequest(string Email, string Password);
public record UserDto(Guid Id, string Email, string DisplayName, string Role);
public record AuthResponse(string Token, UserDto User);

// ---- Predictions (module 2) ----
public record PredictionRequest(int HomeGoals, int AwayGoals);
public record MatchScoreDto(int HomeGoals, int AwayGoals);
public record MyPredictionDto(int HomeGoals, int AwayGoals, int? Points);
public record MatchDto(
    int Id, string GroupCode, string HomeTeam, string AwayTeam, DateTime KickoffAt,
    bool IsOpen, MatchScoreDto? Result, MyPredictionDto? MyPrediction);

// ---- Results (module 3) ----
public record ResultRequest(int HomeGoals, int AwayGoals);
