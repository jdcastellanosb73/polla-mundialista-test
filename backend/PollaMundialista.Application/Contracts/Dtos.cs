namespace PollaMundialista.Application.Contracts;

// ---- Auth (module 1) ----
public record LoginRequest(string Email, string Password, string? Portal = null);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UserDto(Guid Id, string Email, string DisplayName, string Role, bool MustChangePassword);
public record AuthResponse(string Token, UserDto User);

// ---- Participant management (private group: the organizer creates accounts) ----
public record CreateParticipantRequest(string Email, string DisplayName);
public record CreateParticipantResponse(UserDto User, string TempPassword);
public record AdminUserDto(Guid Id, string Email, string DisplayName, bool MustChangePassword, DateTime CreatedAt);

// ---- Predictions (module 2) ----
public record PredictionRequest(int HomeGoals, int AwayGoals);
public record MatchScoreDto(int HomeGoals, int AwayGoals, DateTime LoadedAt);
public record MyPredictionDto(int HomeGoals, int AwayGoals, int? Points);
public record MatchDto(
    int Id, string GroupCode, string HomeTeam, string AwayTeam, DateTime KickoffAt,
    bool IsOpen, MatchScoreDto? Result, MyPredictionDto? MyPrediction);

// ---- Results (module 3) ----
public record ResultRequest(int HomeGoals, int AwayGoals);

// ---- Leaderboard & history (module 4) ----
public record LeaderboardRowDto(Guid UserId, string DisplayName, int Points, int ExactHits, int ScoredPredictions);

public record UserPredictionDto(
    int MatchId, string GroupCode, string HomeTeam, string AwayTeam, DateTime KickoffAt,
    int RealHomeGoals, int RealAwayGoals, int PredictedHomeGoals, int PredictedAwayGoals, int? Points);
public record UserHistoryDto(Guid UserId, string DisplayName, List<UserPredictionDto> Predictions);
