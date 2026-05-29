import { githubRequest } from './githubClient.js';

type GitHubPullRequestFileResponse = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  blobUrl: string;
  rawUrl: string;
  contentsUrl: string;
};

type GetPullRequestFilesInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export async function getPullRequestFiles({
  owner,
  repo,
  pullNumber,
}: GetPullRequestFilesInput): Promise<PullRequestFile[]> {
  const files: GitHubPullRequestFileResponse[] = [];
  let page = 1;

  while (true) {
    const pageFiles = await githubRequest<GitHubPullRequestFileResponse[]>({
      path: `/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100&page=${page}`,
    });

    files.push(...pageFiles);

    if (pageFiles.length < 100) {
      break;
    }

    page += 1;
  }

  return files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch ?? '',
    blobUrl: file.blob_url,
    rawUrl: file.raw_url,
    contentsUrl: file.contents_url,
  }));
}