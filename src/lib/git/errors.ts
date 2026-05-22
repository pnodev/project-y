type GitHubApiErrorBody = {
  message?: string;
  errors?: Array<{ message?: string; code?: string }>;
};

type GitHubRequestError = {
  message?: string;
  status?: number;
  response?: { data?: GitHubApiErrorBody; url?: string };
  request?: { url?: string };
};

const NO_COMMITS_PATTERN = /no commits between/i;
const PENDING_REVIEW_EXISTS_PATTERN =
  /one pending review|user_id can only have one pending review|already submitted a review|review has already been submitted/i;

export function isPendingReviewConflictMessage(message: string): boolean {
  return (
    PENDING_REVIEW_EXISTS_PATTERN.test(message) ||
    /already have a review in progress/i.test(message)
  );
}

export function isDuplicatePendingReviewError(error: unknown): boolean {
  if (!(error && typeof error === "object")) return false;
  const err = error as GitHubRequestError;
  if (err.status !== 422) return false;
  const data = err.response?.data;
  const parts = [
    data?.message,
    ...(data?.errors?.map((e) => e.message) ?? []),
    err.message,
  ]
    .filter(Boolean)
    .join(" ");
  return PENDING_REVIEW_EXISTS_PATTERN.test(parts);
}

function isPullRequestReviewCreationRequest(error: GitHubRequestError): boolean {
  const url = error.response?.url ?? error.request?.url ?? "";
  return /\/pulls\/\d+\/reviews(?:\?|$|\/)/.test(url);
}

export function formatGitHubApiError(error: unknown): string {
  if (!(error && typeof error === "object")) {
    return "Git request failed";
  }

  const err = error as GitHubRequestError;
  const data = err.response?.data;
  const detailMessages =
    data?.errors?.map((e) => e.message).filter(Boolean) ?? [];

  if (detailMessages.some((m) => NO_COMMITS_PATTERN.test(m ?? ""))) {
    return "Push at least one commit to the branch before opening a pull request.";
  }

  const pendingReviewConflict =
    detailMessages.some((m) => PENDING_REVIEW_EXISTS_PATTERN.test(m ?? "")) ||
    PENDING_REVIEW_EXISTS_PATTERN.test(data?.message ?? "");

  if (pendingReviewConflict && isPullRequestReviewCreationRequest(err)) {
    return "You already have a review in progress on this pull request. Use Discard review to cancel it, or continue adding comments.";
  }

  if (detailMessages.length > 0) {
    return detailMessages.join(" ");
  }

  const apiMessage = data?.message?.trim();
  if (apiMessage && !/^validation failed$/i.test(apiMessage)) {
    return apiMessage;
  }

  const raw = err.message?.trim();
  if (raw && !/^validation failed$/i.test(raw)) {
    return raw;
  }

  if (err.status === 422) {
    return "Push at least one commit to the branch before opening a pull request.";
  }

  return "Failed to complete the Git request";
}

/** User-facing message for errors surfaced in toasts (server fn, fetch, etc.). */
export function formatClientError(
  error: unknown,
  fallback = "Something went wrong"
): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !looksLikeSerializedPayload(message)) {
      return message;
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();
    if (message && !looksLikeSerializedPayload(message)) {
      return formatGitHubApiError(error);
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function looksLikeSerializedPayload(message: string): boolean {
  const trimmed = message.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.includes('"issues"')
  );
}
