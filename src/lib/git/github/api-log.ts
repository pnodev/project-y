const LOG_PREFIX = "[git/github]";

/** Log GitHub request payloads in dev or when GITHUB_API_DEBUG=true. */
export function isGitHubApiDebugEnabled(): boolean {
  return (
    process.env.GITHUB_API_DEBUG === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

function redactBody(body: string, maxLen = 120): string {
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen)}…`;
}

export function logGitHubApi(
  operation: string,
  details: Record<string, unknown>
): void {
  if (!isGitHubApiDebugEnabled()) return;
  console.info(LOG_PREFIX, operation, JSON.stringify(details, null, 2));
}

export function logGitHubApiRest(
  operation: string,
  args: {
    method: string;
    url: string;
    payload: Record<string, unknown>;
    status?: number;
    response?: unknown;
    error?: unknown;
  }
): void {
  const body =
    typeof args.payload.body === "string"
      ? redactBody(args.payload.body)
      : args.payload.body;

  logGitHubApi(operation, {
    transport: "rest",
    method: args.method,
    url: args.url,
    payload: { ...args.payload, body },
    status: args.status,
    response: args.response,
    error: formatLogError(args.error),
  });
}

export function logGitHubApiGraphql(
  operation: string,
  args: {
    mutation?: string;
    query?: string;
    variables?: Record<string, unknown>;
    response?: unknown;
    error?: unknown;
  }
): void {
  logGitHubApi(operation, {
    transport: "graphql",
    mutation: args.mutation,
    query: args.query,
    variables: args.variables,
    response: args.response,
    error: formatLogError(args.error),
  });
}

function formatLogError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    const err = error as Error & {
      status?: number;
      response?: { data?: unknown; url?: string };
    };
    return {
      message: err.message,
      status: err.status,
      url: err.response?.url,
      data: err.response?.data,
    };
  }
  return { raw: String(error) };
}
