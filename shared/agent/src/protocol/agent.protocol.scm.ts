"use strict";
import { Range, RequestType } from "vscode-languageserver-protocol";
import { SendPasswordResetEmailRequest } from "./agent.protocol.auth";
import { ModifiedFile } from "./api.protocol";
// import { GitCommit } from "./agent.protocol";

export interface GetBranchesRequest {
	uri: string;
}
export interface GetBranchesResponse {
	scm?: {
		branches: string[];
		current: string;
	};
	error?: string;
}
export const GetBranchesRequestType = new RequestType<
	GetBranchesRequest,
	GetBranchesResponse,
	void,
	void
>("codestream/scm/branches");

export interface CreateBranchRequest {
	uri: string;
	branch: string;
}
export interface CreateBranchResponse {
	scm?: {
		result: boolean;
	};
	error?: string;
}
export const CreateBranchRequestType = new RequestType<
	CreateBranchRequest,
	CreateBranchResponse,
	void,
	void
>("codestream/scm/create-branch");

export interface GetCommitScmInfoRequest {
	revision: string;
	repoPath?: string;
	repoId?: string;
}
export interface GetCommitScmInfoResponse {
	scm?: {
		repoPath: string;
		revision: string;
		message: string;
		shortMessage: string;
		author: string;
		authorDate: Date;
		// committer: string;
		// committerDate: string;
	};
	error?: string;
}
export const GetCommitScmInfoRequestType = new RequestType<
	GetCommitScmInfoRequest,
	GetCommitScmInfoResponse,
	void,
	void
>("codestream/scm/commit");

export interface GetRepoScmStatusRequest {
	/**
	 * This can be a file or a folder uri, with a `file` scheme
	 */
	uri: string;
	startCommit?: string;
	/**
	 * If set, the hard-start to a commit list: don't return commits before this
	 */
	prevEndCommit?: string;
	reviewId?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	currentUserEmail: string;
}

export interface CoAuthors {
	email: string;
	stomped: number;
	commits: number;
}

export interface RepoScmStatus {
	repoPath: string;
	repoId?: string;
	branch?: string;
	commits?: { sha: string; info: {}; localOnly: boolean }[];
	modifiedFiles: ModifiedFile[];
	savedFiles: string[];
	stagedFiles: string[];
	startCommit: string;
	// authors whose code i have changed, or who have pushed to this branch
	authors: CoAuthors[];
	remotes: { name: string; url: string }[];
	// this is just the total number of lines modified so that
	// we can throw up a warning if it's too many ("shift left")
	totalModifiedLines: number;
}

export interface GetRepoScmStatusResponse {
	uri: string;
	scm?: RepoScmStatus;
	error?: string;
}
export const GetRepoScmStatusRequestType = new RequestType<
	GetRepoScmStatusRequest,
	GetRepoScmStatusResponse,
	void,
	void
>("codestream/scm/repo/status");

export interface GetRepoScmStatusesRequest {
	currentUserEmail: string;
}
export interface GetRepoScmStatusesResponse {
	scm?: RepoScmStatus[];
	error?: string;
}
export const GetRepoScmStatusesRequestType = new RequestType<
	GetRepoScmStatusesRequest,
	GetRepoScmStatusesResponse,
	void,
	void
>("codestream/scm/repo/statuses");

export interface ReposScm {
	id?: string;
	path: string;
	/*
		This is the folder of the workspace
	*/
	folder: { uri: string; name: string };
	root?: boolean;
}

export interface GetReposScmRequest {}

export interface GetReposScmResponse {
	repositories?: ReposScm[];
	error?: string;
}

export const GetReposScmRequestType = new RequestType<
	GetReposScmRequest,
	GetReposScmResponse,
	void,
	void
>("codestream/scm/repos");

export interface GetFileScmInfoRequest {
	uri: string;
}
export interface GetFileScmInfoResponse {
	uri: string;
	scm?: {
		file: string;
		repoPath: string;
		repoId?: string;
		revision: string;
		remotes: { name: string; url: string }[];
		branch?: string;
	};
	error?: string;
}
export const GetFileScmInfoRequestType = new RequestType<
	GetFileScmInfoRequest,
	GetFileScmInfoResponse,
	void,
	void
>("codestream/scm/file/info");

export interface GetRangeScmInfoRequest {
	uri: string;
	range: Range;
	dirty?: boolean;
	contents?: string;
	skipBlame?: boolean;
}
export interface BlameAuthor {
	email: string;
	id?: string;
	username?: string;
}
export interface GetRangeScmInfoResponse {
	uri: string;
	range: Range;
	contents: string;
	scm?: {
		file: string;
		repoPath: string;
		repoId?: string;
		revision: string;
		/**
		 * authors come from git blame. we enrich the list with IDs
		 * and usernames if the git blame email addresses match members
		 * of your team.
		 */
		authors: BlameAuthor[];
		remotes: { name: string; url: string }[];
		branch?: string;
	};
	error?: string;
}
export const GetRangeScmInfoRequestType = new RequestType<
	GetRangeScmInfoRequest,
	GetRangeScmInfoResponse,
	void,
	void
>("codestream/scm/range/info");

export interface GetRangeSha1Request {
	uri: string;
	range: Range;
}
export interface GetRangeSha1Response {
	sha1: string | undefined;
}
export const GetRangeSha1RequestType = new RequestType<
	GetRangeSha1Request,
	GetRangeSha1Response,
	void,
	void
>("codestream/scm/range/sha1");

export interface GetUserInfoRequest {}
export interface GetUserInfoResponse {
	email: string;
	name: string;
	username: string;
}
export const GetUserInfoRequestType = new RequestType<
	GetUserInfoRequest,
	GetUserInfoResponse,
	void,
	void
>("codestream/scm/user/info");

export interface GetLatestCommittersRequest {}
export interface GetLatestCommittersResponse {
	scm?: {
		[email: string]: string;
	};
	error?: string;
}
export const GetLatestCommittersRequestType = new RequestType<
	GetLatestCommittersRequest,
	GetLatestCommittersResponse,
	void,
	void
>("codestream/scm/latestCommitters");
