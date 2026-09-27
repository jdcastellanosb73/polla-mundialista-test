namespace PollaMundialista.Application.Common;

/// <summary>
/// Domain error with a machine-readable code. Clients program against codes
/// (EMAIL_TAKEN, RESULT_ALREADY_LOADED, ...), never against message text.
/// </summary>
public class AppException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
