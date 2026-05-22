import { logGitHubApiRest } from "./api-log";

/** Comfort-fade preview supports line/side on PR review comments. */
const GITHUB_ACCEPT =
  "application/vnd.github+json, application/vnd.github.comfort-fade-preview+json";

/** POST PR review comment via fetch so the body is not filtered by Octokit OpenAPI types. */
export async function postPullRequestReviewComment(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;
  logGitHubApiRest("POST pull review comment (fetch)", {
    method: "POST",
    url,
    payload,
  });

  const res = await fetch(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: GITHUB_ACCEPT,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
    }
  );

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message =
      typeof data.message === "string" ? data.message : res.statusText;
    const err = Object.assign(new Error(message), {
      status: res.status,
      response: { data, url: res.url },
    });
    logGitHubApiRest("POST pull review comment failed", {
      method: "POST",
      url,
      payload,
      status: res.status,
      response: data,
      error: err,
    });
    throw err;
  }

  logGitHubApiRest("POST pull review comment ok", {
    method: "POST",
    url,
    payload,
    status: res.status,
    response: { id: data.id, pull_request_review_id: data.pull_request_review_id },
  });

  return data;
}
