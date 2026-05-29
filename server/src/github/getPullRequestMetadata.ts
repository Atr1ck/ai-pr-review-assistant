import { githubRequest } from './githubClient.js';

type GitHubPullRequestResponse = {
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  base: {
    ref: string;
  };
  head: {
    ref: string;
    sha: string;
  };
};

export type PullRequestMetadata = {
  title: string;
  description: string;
  author: {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
  } | null;
  state: string;
  htmlUrl: string;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  additions: number;
  deletions: number;
  changedFiles: number;
};

type GetPullRequestMetadataInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export async function getPullRequestMetadata({
  owner,
  repo,
  pullNumber,
}: GetPullRequestMetadataInput): Promise<PullRequestMetadata> {
  const pr = await githubRequest<GitHubPullRequestResponse>({
    path: `/repos/${owner}/${repo}/pulls/${pullNumber}`,
  });

  return {
    title: pr.title,
    description: pr.body ?? '',
    author: pr.user
      ? {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
          htmlUrl: pr.user.html_url,
        }
      : null,
    state: pr.state,
    htmlUrl: pr.html_url,
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    headSha: pr.head.sha,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
  };
}