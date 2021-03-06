"use strict";
import { createPatch, ParsedDiff, parsePatch } from "diff";
import * as fs from "fs";
import * as path from "path";
import { CommitsChangedData } from "protocol/agent.protocol";
import { Disposable, Event } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Logger } from "../logger";
import { FileStatus } from "../protocol/api.protocol.models";
import { CodeStreamSession } from "../session";
import { Iterables, log, Strings } from "../system";
import { xfs } from "../xfs";
import { git, GitErrors, GitWarnings } from "./git";
import { GitAuthor, GitCommit, GitNumStat, GitRemote, GitRepository } from "./models/models";
import { GitAuthorParser } from "./parsers/authorParser";
import { GitBlameRevisionParser, RevisionEntry } from "./parsers/blameRevisionParser";
import { GitBranchParser } from "./parsers/branchParser";
import { GitLogParser } from "./parsers/logParser";
import { GitRemoteParser } from "./parsers/remoteParser";
import { GitRepositories } from "./repositories";

export * from "./models/models";

const cygwinRegex = /\/cygdrive\/([a-zA-Z])/;

export interface BlameOptions {
	ref?: string;
	contents?: string;
	startLine?: number;
	endLine?: number;
	retryWithTrimmedEndOnFailure?: boolean;
}

export interface TrackingBranch {
	fullName?: string;
	shortName?: string;
}

export interface IGitService extends Disposable {
	getFileAuthors(uri: URI, options?: BlameOptions): Promise<GitAuthor[]>;
	getFileAuthors(path: string, options?: BlameOptions): Promise<GitAuthor[]>;
	// getFileAuthors(uriOrPath: Uri | string, options?: { ref?: string, contents?: string, startLine?: number, endLine?: number }): Promise<GitAuthor[]>;

	getFileCurrentRevision(uri: URI): Promise<string | undefined>;
	getFileCurrentRevision(path: string): Promise<string | undefined>;
	// getFileCurrentSha(uriOrPath: Uri | string): Promise<string | undefined>;

	getFileForRevision(uri: URI, ref: string): Promise<string | undefined>;
	getFileForRevision(path: string, ref: string): Promise<string | undefined>;
	// getFileRevision(uriOrPath: Uri | string, ref: string): Promise<string | undefined>;

	getFileContentForRevision(uri: URI, ref: string): Promise<string | undefined>;
	getFileContentForRevision(path: string, ref: string): Promise<string | undefined>;
	// getFileRevisionContent(uriOrPath: Uri | string, ref: string): Promise<string | undefined>;

	getRepoFirstCommits(repoUri: URI): Promise<string[]>;
	getRepoFirstCommits(repoPath: string): Promise<string[]>;
	// getRepoFirstCommits(repoUriOrPath: Uri | string): Promise<string[]>;

	getRepoCommitHistory(repoUri: URI): Promise<string[]>;
	getRepoCommitHistory(repoPath: string): Promise<string[]>;
	// getRepoCommitHistory(repoUriOrPath: URI | string): Promise<string[]> {

	getRepoBranchForkCommits(repoUri: URI): Promise<string[]>;
	getRepoBranchForkCommits(repoPath: string): Promise<string[]>;
	// getRepoBranchForkCommits(repoUriOrPath: Uri | string): Promise<string[]>;

	getRepoHeadRevision(repoUri: URI): Promise<string | undefined>;
	getRepoHeadRevision(repoPath: string): Promise<string | undefined>;

	getRepoRemote(repoUri: URI): Promise<GitRemote | undefined>;
	getRepoRemote(repoPath: string): Promise<GitRemote | undefined>;
	// getRepoRemote(repoUriOrPath: Uri | string): Promise<GitRemote | undefined>;

	getRepoRoot(uri: URI): Promise<string | undefined>;
	getRepoRoot(path: string): Promise<string | undefined>;

	getRepositories(): Promise<Iterable<GitRepository>>;
	getRepositoryById(id: string): Promise<GitRepository | undefined>;
	getRepositoryByFilePath(filePath: string): Promise<GitRepository | undefined>;

	isValidReference(repoUri: URI, ref: string): Promise<boolean>;
	isValidReference(repoPath: string, ref: string): Promise<boolean>;

	resolveRef(uri: URI, ref: string): Promise<string | undefined>;
	resolveRef(path: string, ref: string): Promise<string | undefined>;
	//   resolveRef(uriOrPath: Uri | string, ref: string): Promise<string | undefined> {

	getCommittersForRepo(repoPath: string, since: number): Promise<{ [email: string]: string }>;
}

export class GitService implements IGitService, Disposable {
	private _disposable: Disposable | undefined;
	private readonly _repositories: GitRepositories;

	constructor(public readonly session: CodeStreamSession) {
		this._repositories = new GitRepositories(this, session);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	ensureSearchComplete() {
		return this._repositories.ensureSearchComplete();
	}

	get onRepositoryCommitHashChanged(): Event<GitRepository> {
		return this._repositories.onCommitHashChanged;
	}

	/**
	 * Fires anytime there's a change to the underlying git repository
	 */
	get onRepositoryChanged(): Event<CommitsChangedData> {
		return this._repositories.onGitChanged;
	}

	async getFileAuthors(uri: URI, options?: BlameOptions): Promise<GitAuthor[]>;
	async getFileAuthors(path: string, options?: BlameOptions): Promise<GitAuthor[]>;
	async getFileAuthors(uriOrPath: URI | string, options: BlameOptions): Promise<GitAuthor[]> {
		try {
			const data = await this.getRawBlame(uriOrPath, options);
			return GitAuthorParser.parse(data);
		} catch (error) {
			if (options.retryWithTrimmedEndOnFailure && this._isRangeOutOfBoundsError(error.message)) {
				const actualLength = this._getFileLengthFromOutOfBoundsError(error.message);
				if (actualLength === 0) return [];
				if (actualLength !== undefined) {
					const maxLine = actualLength - 1;
					return this.getFileAuthors(uriOrPath as any, {
						...options,
						startLine: options.startLine && Math.min(options.startLine, maxLine),
						endLine: maxLine,
						retryWithTrimmedEndOnFailure: false
					});
				}
			}
			throw error;
		}
	}

	async getBlameRevisions(uri: URI, options?: BlameOptions): Promise<RevisionEntry[]>;
	async getBlameRevisions(path: string, options?: BlameOptions): Promise<RevisionEntry[]>;
	async getBlameRevisions(
		uriOrPath: URI | string,
		options: BlameOptions = {}
	): Promise<RevisionEntry[]> {
		try {
			const data = await this.getRawBlame(uriOrPath, options);
			return GitBlameRevisionParser.parse(data);
		} catch (error) {
			const { message } = error;
			if (options.retryWithTrimmedEndOnFailure && this._isRangeOutOfBoundsError(message)) {
				const actualLength = this._getFileLengthFromOutOfBoundsError(message);
				if (actualLength === 0) return [];
				if (actualLength !== undefined) {
					const maxLine = actualLength - 1;
					return this.getBlameRevisions(uriOrPath as any, {
						...options,
						startLine: options.startLine && Math.min(options.startLine, maxLine),
						endLine: maxLine,
						retryWithTrimmedEndOnFailure: false
					});
				}
			}
			throw error;
		}
	}

	private _isRangeOutOfBoundsError(message: string) {
		return /((fatal: file )(\S+)\s(has only )\d+\s(lines))/.test(message);
	}

	private _getFileLengthFromOutOfBoundsError(message: string) {
		const lengthString = message.substring(message.indexOf("fatal: file")).match(/\d+/)?.[0];
		return lengthString ? parseInt(lengthString, 10) : undefined;
	}

	private async getRawBlame(
		uriOrPath: URI | string,
		options: { ref?: string; contents?: string; startLine?: number; endLine?: number } = {}
	): Promise<string> {
		const [dir, filename] = Strings.splitPath(
			typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath
		);

		const params = ["blame", "--root", "--incremental", "-w"];

		if (options.startLine != null && options.endLine != null) {
			params.push(`-L ${options.startLine + 1},${options.endLine + 1}`);
		}

		let stdin;
		if (options.ref) {
			params.push(options.ref);
		} else if (options.contents) {
			params.push("--contents", "-");
			// Pipe the blame contents to stdin
			stdin = options.contents;
		}

		return git({ cwd: dir, stdin: stdin }, ...params, "--", filename);
	}

	async getFileCurrentRevision(uri: URI): Promise<string | undefined>;
	async getFileCurrentRevision(path: string): Promise<string | undefined>;
	async getFileCurrentRevision(uriOrPath: URI | string): Promise<string | undefined> {
		const [dir, filename] = Strings.splitPath(
			typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath
		);

		const data = (await git({ cwd: dir }, "log", "-n1", "--format=%H", "--", filename)).trim();
		return data ? data : undefined;
	}

	async getFileContentForRevision(uri: URI, ref: string): Promise<string | undefined>;
	async getFileContentForRevision(path: string, ref: string): Promise<string | undefined>;
	async getFileContentForRevision(
		uriOrPath: URI | string,
		ref: string
	): Promise<string | undefined> {
		const fsPath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		const repo = await this.getRepositoryByFilePath(fsPath);
		if (!repo) return undefined;

		let fileRelativePath = Strings.normalizePath(path.relative(repo.path, fsPath));
		if (fileRelativePath[0] === "/") {
			fileRelativePath = fileRelativePath.substr(1);
		}

		try {
			const data = await git(
				{ cwd: repo.path, encoding: "utf8" },
				"show",
				`${ref}:./${fileRelativePath}`,
				"--"
			);
			return data;
		} catch (ex) {
			const msg = ex && ex.toString();
			if (
				GitErrors.badRevision.test(msg) ||
				GitWarnings.notFound.test(msg) ||
				GitWarnings.foundButNotInRevision.test(msg)
			) {
				return undefined;
			}

			throw ex;
		}
	}

	async getDefaultBranch(repoPath: string, remote: string): Promise<string | undefined> {
		try {
			const data = await git(
				{ cwd: repoPath, env: { GIT_TERMINAL_PROMPT: "0" }, throwRawExceptions: true },
				"remote",
				"show",
				remote
			);
			const headBranchLine = data
				.trim()
				.split("\n")
				.find(line => line.indexOf("HEAD branch:") >= 0);

			return headBranchLine ? headBranchLine.split(":")[1].trim() : undefined;
		} catch (ex) {
			Logger.debug(ex.message);
			return undefined;
		}
	}

	async fetchAllRemotes(repoPath: string): Promise<boolean> {
		try {
			await git(
				{ cwd: repoPath, env: { GIT_TERMINAL_PROMPT: "0" }, throwRawExceptions: true },
				"fetch",
				"--all"
			);
			return true;
		} catch {
			Logger.log("Could not fetch all remotes");
			return false;
		}
	}

	async getDiffBetweenCommits(
		initialCommitHash: string,
		finalCommitHash: string,
		filePath: string,
		fetchIfCommitNotFound: boolean = false
	): Promise<ParsedDiff | undefined> {
		const [dir, filename] = Strings.splitPath(filePath);
		let data;
		try {
			data = await git(
				{ cwd: dir },
				"diff",
				"--no-ext-diff",
				initialCommitHash,
				finalCommitHash,
				"--",
				filename
			);
		} catch (err) {
			if (fetchIfCommitNotFound) {
				Logger.log("Commit not found - fetching all remotes");
				const didFetch = await this.fetchAllRemotes(dir);
				if (didFetch) {
					return this.getDiffBetweenCommits(initialCommitHash, finalCommitHash, filePath, false);
				}
			}

			Logger.error(err);
			Logger.warn(
				`Error getting diff from ${initialCommitHash} to ${finalCommitHash} for ${filename}`
			);
			return;
		}

		const patches = parsePatch(data);
		if (patches.length > 1) {
			Logger.warn("Parsed diff generated multiple patches");
		}
		return patches[0];
	}

	async getDiffFromHead(filePath: string): Promise<ParsedDiff> {
		const [dir, filename] = Strings.splitPath(filePath);
		let data;
		try {
			data = await git({ cwd: dir }, "diff", "--no-ext-diff", "HEAD", "--", filename);
		} catch (err) {
			Logger.warn(`Error getting diff from HEAD to working directory for ${filename}`);
			throw err;
		}

		const patches = parsePatch(data);
		if (patches.length > 1) {
			Logger.warn("Parsed diff generated multiple patches");
		}
		return patches[0];
	}

	async getDiffs(
		repoPath: string,
		opts: {
			includeSaved: boolean;
			includeStaged: boolean;
			reverse?: boolean;
		},
		ref1?: string,
		ref2?: string
	): Promise<ParsedDiff[]> {
		let data: string | undefined;
		const { includeSaved, includeStaged, reverse } = opts;
		try {
			const options = ["diff", "--no-ext-diff", "--no-prefix"];
			if (reverse === true) options.push("-R");
			if (includeStaged && !includeSaved) options.push("--staged");
			if (ref1 && ref1.length) options.push(ref1);
			if (ref2 && ref2.length) options.push(ref2);
			if ((!includeStaged && !ref1) || (!includeSaved && !includeStaged && !ref2)) {
				options.push("HEAD");
			}
			options.push("--");
			data = await git({ cwd: repoPath }, ...options);
		} catch (err) {
			Logger.warn(
				`Error getting diff from ${repoPath}:${includeSaved}:${includeStaged}:${ref1}:${ref2}`
			);
			throw err;
		}

		const patches = parsePatch(data);
		return patches;
	}

	// this isn't technically a git operation, but we leave it here since it's
	// pretending to be one
	async getNewDiff(
		repoPath: string,
		file: string,
		opts?: { reverse?: boolean }
	): Promise<ParsedDiff> {
		let data: ParsedDiff | undefined;
		try {
			let contents = await xfs.readText(path.join(repoPath, file));
			if (contents == null) {
				Logger.warn(`Error reading file in getNewDiff: ${repoPath}:${file}`);
				contents = "";
			}
			contents = Strings.normalizeFileContents(contents);
			// we would like to use structuredPatch here but it doesn't seem to work
			// no idea why! but this works. https://github.com/kpdecker/jsdiff/issues/157
			const patch =
				opts && opts.reverse
					? createPatch(file, contents, "", "", "")
					: createPatch(file, "", contents, "", "");
			data = parsePatch(patch)[0];
		} catch (err) {
			Logger.warn(`Error getting new file diff from ${repoPath}:${file}`);
			throw err;
		}

		return data;
	}

	async getFileForRevision(uri: URI, ref: string): Promise<string | undefined>;
	async getFileForRevision(path: string, ref: string): Promise<string | undefined>;
	async getFileForRevision(uriOrPath: URI | string, ref: string): Promise<string | undefined> {
		const [dir, filename] = Strings.splitPath(
			typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath
		);

		let data: string | undefined;
		try {
			data = await git({ cwd: dir, encoding: "binary" }, "show", `${ref}:./${filename}`);
		} catch (ex) {
			const msg = ex && ex.toString();
			if (!GitWarnings.notFound.test(msg) && GitWarnings.foundButNotInRevision.test(msg)) throw ex;
		}

		if (!data) return undefined;

		const suffix = Strings.sanitizeForFileSystem(ref.substr(0, 8)).substr(0, 50);
		const ext = path.extname(filename);

		const tmp = await import(/* webpackChunkName: "tmp", webpackMode: "eager" */ "tmp");
		return new Promise<string>((resolve, reject) => {
			tmp.file(
				{ prefix: `${path.basename(filename, ext)}-${suffix}__`, postfix: ext },
				(err, destination, fd, cleanupCallback) => {
					if (err) {
						reject(err);
						return;
					}

					fs.appendFile(destination, data, { encoding: "binary" }, err => {
						if (err) {
							reject(err);
							return;
						}

						const ReadOnly = 0o100444; // 33060 0b1000000100100100
						fs.chmod(destination, ReadOnly, err => {
							resolve(destination);
						});
					});
				}
			);
		});
	}

	async getHeadRevision(repoPath: string, reference: string): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "show-ref", "-s", reference);
			return data.trim();
		} catch (ex) {
			Logger.warn(ex);
			return undefined;
		}
	}

	async getRemoteDefaultBranchHeadRevisions(repoUri: URI, remotes: string[]): Promise<string[]>;
	async getRemoteDefaultBranchHeadRevisions(repoPath: string, remotes: string[]): Promise<string[]>;
	async getRemoteDefaultBranchHeadRevisions(
		repoUriOrPath: URI | string,
		remotes: string[]
	): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		const revisions = new Set<string>();

		for (const remote of remotes) {
			const defaultBranch = await this.getDefaultBranch(repoPath, remote);
			const revision =
				defaultBranch &&
				(await this.getHeadRevision(repoPath, `refs/remotes/${remote}/${defaultBranch}`));
			if (revision) revisions.add(revision);
		}

		return Array.from(revisions);
	}

	async getRepoFirstCommits(repoUri: URI): Promise<string[]>;
	async getRepoFirstCommits(repoPath: string): Promise<string[]>;
	async getRepoFirstCommits(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		let data;
		try {
			data = await git(
				{ cwd: repoPath },
				"rev-list",
				"--max-parents=0",
				"--reverse",
				"master",
				"--"
			);
		} catch {}

		if (!data) {
			try {
				data = await git(
					{ cwd: repoPath },
					"rev-list",
					"--max-parents=0",
					"--reverse",
					"HEAD",
					"--"
				);
			} catch {}
		}

		if (!data) return [];

		return data.trim().split("\n");
	}

	async getRepoCommitHistory(repoUri: URI): Promise<string[]>;
	async getRepoCommitHistory(repoPath: string): Promise<string[]>;
	async getRepoCommitHistory(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		let data;
		try {
			data = await git({ cwd: repoPath }, "rev-list", "--date-order", "master", "--");
		} catch {}
		if (!data) {
			try {
				data = await git({ cwd: repoPath }, "rev-list", "--date-order", "HEAD", "--");
			} catch {}
		}

		if (!data) return [];

		return data.trim().split("\n");
	}

	async getRepoBranchForkCommits(repoUri: URI): Promise<string[]>;
	async getRepoBranchForkCommits(repoPath: string): Promise<string[]>;
	async getRepoBranchForkCommits(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		let data: string | undefined;
		try {
			data = await git({ cwd: repoPath }, "branch", "--");
		} catch {}
		if (!data) return [];

		const branches = data.trim().split("\n");
		const commits: string[] = [];
		await Promise.all(
			branches.map(async branch => {
				branch = branch.trim();
				if (branch.startsWith("*")) {
					branch = branch.split("*")[1].trim();
				}
				let result: string | undefined;
				try {
					result = await git({ cwd: repoPath }, "merge-base", "--fork-point", branch, "--");
				} catch {}
				if (result) {
					commits.push(result.split("\n")[0]);
				}
			})
		);

		return commits;
	}

	async getRepoHeadRevision(repoUri: URI): Promise<string | undefined>;
	async getRepoHeadRevision(repoPath: string): Promise<string | undefined>;
	async getRepoHeadRevision(repoUriOrPath: URI | string): Promise<string | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		const data = (await git({ cwd: repoPath }, "log", "-n1", "--format=%H")).trim();
		return data ? data : undefined;
	}

	async getRepoRemote(repoUri: URI): Promise<GitRemote | undefined>;
	async getRepoRemote(repoPath: string): Promise<GitRemote | undefined>;
	async getRepoRemote(repoUriOrPath: URI | string): Promise<GitRemote | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		const remotes = await this.getRepoRemotes(repoPath);

		let fetch;
		let push;
		for (const r of remotes) {
			if (push !== undefined) break;

			if (r.types.find(t => t.type === "push")) {
				push = r;
			} else if (fetch === undefined && r.types.find(t => t.type === "fetch")) {
				fetch = r;
			}
		}

		return push || fetch;
	}

	async getRepoRemotes(repoUri: URI): Promise<GitRemote[]>;
	async getRepoRemotes(repoPath: string): Promise<GitRemote[]>;
	@log({
		exit: (result: GitRemote[]) =>
			`returned [${result.length !== 0 ? result.map(r => r.uri.toString(true)).join(", ") : ""}]`
	})
	async getRepoRemotes(repoUriOrPath: URI | string): Promise<GitRemote[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		try {
			const data = await git({ cwd: repoPath }, "remote", "-v");
			return GitRemoteParser.parse(data, repoPath);
		} catch {
			return [];
		}
	}

	async repoHasRemote(repoPath: string, remoteUrl: string): Promise<boolean> {
		let data;
		try {
			data = await git({ cwd: repoPath }, "remote", "-v");
			if (!data) return false;
		} catch {
			return false;
		}

		const remotes = GitRemoteParser.parse(data, repoPath);
		for (const r of remotes) {
			if (r.normalizedUrl === remoteUrl) {
				return true;
			}
		}

		return false;
	}

	async getRepoRoot(uri: URI): Promise<string | undefined>;
	async getRepoRoot(path: string): Promise<string | undefined>;
	async getRepoRoot(uriOrPath: URI | string): Promise<string | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		let cwd;
		if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
			cwd = filePath;
		} else {
			[cwd] = Strings.splitPath(filePath);
		}

		try {
			const data = (await git({ cwd: cwd }, "rev-parse", "--show-toplevel")).trim();
			const repoRoot = data === "" ? undefined : this._normalizePath(data);

			if (repoRoot === undefined) {
				return undefined;
			}

			try {
				cwd = this._normalizePath(cwd);
				let relative = path.relative(repoRoot, cwd);
				let isParentOrSelf =
					!relative || (!relative.startsWith("..") && !path.isAbsolute(relative));
				if (isParentOrSelf) {
					Logger.log(`getRepoRoot: ${repoRoot} is parent of ${cwd} or itself - returning`);
					return repoRoot;
				}

				Logger.log(
					`getRepoRoot: ${repoRoot} is neither parent of ${cwd} nor itself - finding symlink`
				);
				const realCwd = this._normalizePath(fs.realpathSync(cwd));
				Logger.log(`getRepoRoot: ${cwd} -> ${realCwd}`);
				relative = path.relative(repoRoot, realCwd);
				isParentOrSelf = !relative || (!relative.startsWith("..") && !path.isAbsolute(relative));
				if (!isParentOrSelf) {
					Logger.log(
						`getRepoRoot: ${repoRoot} is neither parent of ${realCwd} nor itself - returning`
					);
					return repoRoot;
				}

				const symlinkRepoRoot = this._normalizePath(path.resolve(cwd, relative));
				Logger.log(
					`getRepoRoot: found symlink repo root ${symlinkRepoRoot} -> ${repoRoot} - returning`
				);

				return symlinkRepoRoot;
			} catch (ex) {
				Logger.warn(ex);
				return repoRoot;
			}
		} catch (ex) {
			// If we can't find the git executable, rethrow
			if (/spawn (.*)? ENOENT/.test(ex.message)) {
				throw ex;
			}

			return undefined;
		}
	}

	async getCommit(repoUri: URI, ref: string): Promise<GitCommit | undefined>;
	async getCommit(repoPath: string, ref: string): Promise<GitCommit | undefined>;
	async getCommit(repoUriOrPath: URI | string, ref: string): Promise<GitCommit | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		try {
			const data = await git(
				{ cwd: repoPath },
				"log",
				"-M",
				"-n1",
				`--format=${GitLogParser.defaultFormat}`,
				ref,
				"--"
			);

			const commits = GitLogParser.parse(data.trim(), repoPath);
			if (commits === undefined || commits.size === 0) return undefined;

			return Iterables.first(commits.values());
		} catch {
			return undefined;
		}
	}

	async getCurrentBranch(uri: URI, isDirectory?: boolean): Promise<string | undefined>;
	async getCurrentBranch(path: string, isDirectory?: boolean): Promise<string | undefined>;
	async getCurrentBranch(uriOrPath: URI | string): Promise<string | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		let cwd;
		if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
			cwd = filePath;
		} else {
			[cwd] = Strings.splitPath(filePath);
		}

		try {
			const data = (await git({ cwd: cwd }, "rev-parse", "--abbrev-ref", "HEAD")).trim();
			return data === "" || data === "HEAD" ? undefined : data;
		} catch {
			return undefined;
		}
	}

	async createBranch(repoPath: string, branch: string): Promise<boolean> {
		try {
			const data = await git({ cwd: repoPath }, "checkout", "-b", branch);
			return true;
		} catch (ex) {
			Logger.warn(ex);
			return false;
		}
	}

	async getBranches(
		repoPath: string
	): Promise<{ current: string; branches: string[] } | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "branch");
			if (!data) return undefined;
			const branches = data
				.split("\n")
				.map(b => b.substr(2).trim())
				.filter(b => b.length > 0);
			const current = data.split("\n").find(b => b.startsWith("* "));
			return { branches, current: current ? current.substr(2).trim() : "" };
		} catch (ex) {
			Logger.warn(ex);
			return undefined;
		}
	}

	async getTrackingBranch(uri: URI, isDirectory?: boolean): Promise<TrackingBranch | undefined>;
	async getTrackingBranch(path: string, isDirectory?: boolean): Promise<TrackingBranch | undefined>;
	async getTrackingBranch(
		uriOrPath: URI | string,
		isDirectory: boolean = false
	): Promise<TrackingBranch | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		let cwd;
		if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
			cwd = filePath;
		} else {
			[cwd] = Strings.splitPath(filePath);
		}

		try {
			const data = (await git({ cwd: cwd }, "rev-parse", "--abbrev-ref", "@{u}")).trim();
			if (data !== undefined && data !== "") {
				return {
					fullName: data,
					shortName: data.substring(data.indexOf("/") + 1)
				};
			}
			return data === "" ? undefined : data;
		} catch {
			return undefined;
		}
	}

	async getCommitsOnBranch(
		repoPath: string,
		branch: string,
		prevEndCommit?: string
	): Promise<{ sha: string; info: {}; localOnly: boolean }[] | undefined> {
		try {
			// commits for a specific branch
			// https://stackoverflow.com/questions/14848274/git-log-to-get-commits-only-for-a-specific-branch
			// git log [BRANCHNAME] --not $(git for-each-ref --format='%(refname)' refs/heads/ | grep -v "refs/heads/[BRANCHNAME]")

			let data: string | undefined;
			try {
				data = await git({ cwd: repoPath }, "branch", "--");
			} catch {}
			if (!data) return;
			const otherBranches = data
				.trim()
				.split("\n")
				.filter(b => !b.startsWith("*"))
				.map(b => "refs/heads/" + b.trim());
			// .join(" ");

			const data2 = await git(
				{ cwd: repoPath },
				"log",
				branch,
				`--format='${GitLogParser.defaultFormat}`,
				"--not",
				...otherBranches,
				"--"
			);

			let commits = GitLogParser.parse(data2.trim(), repoPath);
			if (commits === undefined || commits.size === 0) {
				// if we didn't find unique commits on the branch we resort to git log
				const data3 = await git(
					{ cwd: repoPath },
					"log",
					branch,
					"--first-parent",
					"-n100",
					`--format='${GitLogParser.defaultFormat}`,
					"--"
				);
				commits = GitLogParser.parse(data3.trim(), repoPath);
				if (commits === undefined || commits.size === 0) {
					return undefined;
				}
			}

			let localCommits: string[] | undefined = undefined;
			try {
				// https://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
				const data3 = await git(
					{ cwd: repoPath, throwRawExceptions: true },
					"log",
					"@{push}..",
					"--format=%H",
					"--"
				);
				localCommits = data3.trim().split("\n");
			} catch (ex) {
				// Chances are this branch has no remote tracking branch, so we'll consider all commits as localOnly
				Logger.log(`Unable to identify pushed commits. Reason: ${ex.message}`);
			}

			let ret: { sha: string; info: {}; localOnly: boolean }[] = [];
			commits.forEach((val, key) => {
				ret.push({ sha: key, info: val, localOnly: !localCommits || localCommits.includes(key) });
			});

			if (prevEndCommit) {
				const index = ret.findIndex(commit => commit.sha === prevEndCommit);
				if (index > -1) ret = ret.slice(0, index);
			}

			return ret;
		} catch {
			return undefined;
		}
	}

	async getLocalCommits(
		repoPath: string
	): Promise<{ sha: string; info: {}; localOnly: boolean }[] | undefined> {
		try {
			// https://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
			const data = await git(
				{ cwd: repoPath },
				"log",
				"@{push}..",
				`--format='${GitLogParser.defaultFormat}`,
				"--"
			);
			const commits = GitLogParser.parse(data.trim(), repoPath);
			if (commits === undefined || commits.size === 0) return undefined;

			const ret: { sha: string; info: {}; localOnly: boolean }[] = [];
			commits.forEach((val, key) => {
				ret.push({ sha: key, info: val, localOnly: true });
			});
			return ret;
		} catch {
			return undefined;
		}
	}

	async getParentCommitShas(repoPath: string, sha: string): Promise<string[]> {
		try {
			const data = await git({ cwd: repoPath }, "log", "--pretty=%P", "-n", "1", sha);
			const allShas = data.trim().split("\n")[0] || "";
			// commits can have multiple parents
			return allShas.trim().split(/\s/);
		} catch (err) {
			Logger.log(err.message);
			return [];
		}
	}

	async getHeadSha(repoPath: string): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "log", "--pretty=%H", "-n", "1");
			return data.trim().split("\n")[0];
		} catch (err) {
			Logger.log(err.message);
			return undefined;
		}
	}

	/**
	 * Statistics for changes in repo from `startCommit`
	 */
	async getNumStat(
		repoPath: string,
		startCommit: string = "HEAD",
		includeSaved: boolean,
		includeStaged: boolean
	): Promise<GitNumStat[]> {
		if (!startCommit || !startCommit.length) {
			startCommit = "HEAD";
		}
		const options = [startCommit];
		if (!includeSaved && !includeStaged) {
			options.push("HEAD");
		} else if (!includeSaved) {
			options.push("--staged");
		}
		return this.getNumStatCore(repoPath, ...options);
	}

	/**
	 * Statistics for staged changes in repo
	 */
	getNumStatStaged(repoPath: string): Promise<GitNumStat[]> {
		return this.getNumStatCore(repoPath, "--staged");
	}

	/**
	 * Statistic for saved (exclusively saved, i.e. unstaged or not staged) changes in repo.
	 * Note that in normal circumstances, a file will be either in the saved or the staged
	 * category, but not both
	 */
	getNumStatSaved(repoPath: string): Promise<GitNumStat[]> {
		return this.getNumStatCore(repoPath);
	}

	private async getNumStatCore(repoPath: string, ...options: string[]): Promise<GitNumStat[]> {
		try {
			// files changed, lines added & deleted
			// git diff --numstat --summary
			// https://stackoverflow.com/questions/1587846/how-do-i-show-the-changes-which-have-been-staged
			// also see https://files.slack.com/files-pri/T7DDT1L5R-FV0CM6LD6/image.png
			const deletedOnly = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				"--numstat",
				"--diff-filter=D",
				...options,
				"--"
			);
			const allButDeleted = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				"--numstat",
				"--diff-filter=d",
				...options,
				"--"
			);
			return [
				...this.parseNumStat(allButDeleted),
				...this.parseNumStat(deletedOnly, FileStatus.deleted)
			];
		} catch (err) {
			Logger.warn(`Error getting numstat (${options}): ${err.message}`);
			return [];
		}
	}

	private parseNumStat(
		data: string = "",
		presumedStatus: FileStatus = FileStatus.modified
	): GitNumStat[] {
		const ret: GitNumStat[] = [];
		data
			.trim()
			.split("\n")
			.forEach(line => {
				const lineData = line.match(/^(\d+)\s+(\d+)\s+(.+)/);

				if (lineData && lineData[3]) {
					if (!lineData[3].endsWith("/")) {
						const { oldFile, file } = this._getOldAndNewFileNamesFromDiffPath(lineData[3]);
						ret.push({
							linesAdded: parseInt(lineData[1], 10),
							linesRemoved: parseInt(lineData[2], 10),
							oldFile,
							file,
							status: presumedStatus,
							statusX: presumedStatus,
							statusY: presumedStatus
						});
					}
				}
			});
		return ret;
	}

	private _getOldAndNewFileNamesFromDiffPath(diffPath: string) {
		const matchInSubdir = /(.*)\{(.+)\s=>\s(.+)}/.exec(diffPath);
		const matchAtRoot = /(.+)\s=>\s(.+)/.exec(diffPath);

		if (matchInSubdir) {
			const [, base, oldSuffix, newSuffix] = matchInSubdir;
			const baseOrEmpty = base || "";
			return {
				oldFile: baseOrEmpty + oldSuffix,
				file: baseOrEmpty + newSuffix
			};
		} else if (matchAtRoot) {
			const [, oldFile, file] = matchAtRoot;
			return {
				oldFile,
				file
			};
		} else {
			return {
				oldFile: diffPath,
				file: diffPath
			};
		}
	}

	getStatusByChar(character: string): FileStatus | undefined {
		switch (character) {
			case "A":
				return FileStatus.added;
			case "R":
				return FileStatus.renamed;
			case "D":
				return FileStatus.deleted;
			case "C":
				return FileStatus.copied;
			case "U":
				return FileStatus.unmerged;
			case "M":
				return FileStatus.modified;
			case "?":
				return FileStatus.untracked;
		}
		return undefined;
	}

	async getStatus(
		repoPath: string,
		includeSaved: boolean
	): Promise<
		| {
				[file: string]: {
					statusX?: FileStatus;
					statusY?: FileStatus;
					status: FileStatus;
				};
		  }
		| undefined
	> {
		try {
			let data: string | undefined;
			try {
				const options = ["status", "-v", "--porcelain"];
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return undefined;

			const ret: {
				[file: string]: {
					statusX?: FileStatus;
					statusY?: FileStatus;
					status: FileStatus;
				};
			} = {};
			// FIXME support deleted files
			data.split("\n").forEach(line => {
				const lineData = line.match(/(.)(.)\s+(.*)/);
				if (lineData && lineData[3]) {
					let [, statusXChar, statusYChar, file] = lineData;
					const statusX = this.getStatusByChar(statusXChar);
					const statusY = this.getStatusByChar(statusYChar);
					let status;
					const rename = file.match(/ -> (.*)/);
					if (rename) file = rename[1];
					if (statusXChar === "?" && includeSaved) {
						status = FileStatus.untracked;
					} else {
						if (statusX) status = statusX;
						if (includeSaved) {
							if (statusY) status = statusY;
						}
					}

					if (status) {
						// skip untracked directories
						if (status !== FileStatus.untracked || !file.match(/\/$/)) {
							ret[file] = {
								statusX,
								statusY,
								status
							};
						}
					}
				}
			});
			return ret;
		} catch {
			return undefined;
		}
	}

	async getDiffAuthors(
		repoPath: string,
		file: string,
		includeSaved: boolean,
		includeStaged: boolean,
		ref: string | undefined
	): Promise<GitAuthor[]> {
		try {
			let data: string | undefined;
			try {
				const options = ["diff", "--no-ext-diff"];
				if (includeStaged && !includeSaved) options.push("--staged");
				if (ref && ref.length) options.push(ref);
				if (!includeStaged) options.push("HEAD");
				options.push("--");
				options.push(file);
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return [];
			const patch = parsePatch(data)[0];
			try {
				const options = ["blame"];
				if (ref && ref.length) options.push(ref);
				patch.hunks.forEach(hunk => {
					const oldEnd = hunk.oldStart + hunk.oldLines;
					options.push(`-L${hunk.oldStart},${oldEnd}`);
				});
				options.push("--root", "--incremental", "-w");
				options.push("--");
				options.push(file);
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return [];
			return GitAuthorParser.parse(data);
		} catch {
			return [];
		}
	}

	getRepositories(): Promise<Iterable<GitRepository>> {
		return this._repositories.get();
	}

	getRepositoryById(id: string): Promise<GitRepository | undefined> {
		return this._repositories.getById(id);
	}

	/**
	 * Returns a possible GitRepository on a file OR folder. If that file has not been seen before,
	 * a traversal up its path will occur looking for the root repo. If it is a folder, it will attempt to lookup _that_
	 * folder
	 * @param fileOrFolderPath path to a file or folder
	 */
	async getRepositoryByFilePath(fileOrFolderPath: string): Promise<GitRepository | undefined> {
		let repo;
		if (fs.existsSync(fileOrFolderPath) && fs.lstatSync(fileOrFolderPath).isDirectory()) {
			const normalizedFsPath = Strings.normalizePath(fileOrFolderPath);
			const allRepos = await this.getRepositories();
			repo = Array.from(allRepos).find(r => r.path === normalizedFsPath);
		} else {
			// do NOT allow folders to call this, any folder not already tracked
			// will traverse _up_ looking for additional git repos
			repo = await this._repositories.getByFilePath(fileOrFolderPath);
		}

		return repo;
	}

	async isValidReference(repoUri: URI, ref: string): Promise<boolean>;
	async isValidReference(repoPath: string, ref: string): Promise<boolean>;
	async isValidReference(repoUriOrPath: URI | string, ref: string): Promise<boolean> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		try {
			void (await git({ cwd: repoPath }, "cat-file", "-t", ref));
			return true;
		} catch {
			return false;
		}
	}

	async resolveRef(uri: URI, ref: string): Promise<string | undefined>;
	async resolveRef(path: string, ref: string): Promise<string | undefined>;
	async resolveRef(uriOrPath: URI | string, ref: string): Promise<string | undefined> {
		const [dir, filename] = Strings.splitPath(
			typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath
		);

		try {
			const data = await git({ cwd: dir }, "log", "-M", "-n1", "--format=%H", ref, "--", filename);
			return data.trim();
		} catch {
			return undefined;
		}
	}

	/**
	 * Returns true if the sha exists on the specificed branch on the specified repo
	 *
	 * @param  {string} repoPath
	 * @param  {string} branchName
	 * @param  {string} sha
	 * @returns Promise
	 */
	async isCommitOnBranch(
		repoPath: string,
		branchName: string,
		sha: string
	): Promise<boolean | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "branch", "--contains", sha);
			const branches = GitBranchParser.parse(data);
			return branches && branches.length ? branches.some(_ => _.name === branchName) : false;
		} catch (ex) {
			Logger.debug(ex.message);
			return false;
		}
	}

	async getKnownCommitHashes(filePath: string): Promise<string[]> {
		const commitHistory = await this.getRepoCommitHistory(filePath);
		const firstLastCommits =
			commitHistory.length > 10
				? [...commitHistory.slice(0, 5), ...commitHistory.slice(-5)]
				: commitHistory;
		const branchPoints = await this.getRepoBranchForkCommits(filePath);
		return [...firstLastCommits, ...branchPoints];
	}

	async getCommittersForRepo(
		repoPath: string,
		since: number
	): Promise<{ [email: string]: string }> {
		let data;
		const result: { [email: string]: string } = {};
		try {
			// this should be populated by something like
			// git log --pretty=format:"%an|%aE" | sort -u
			// and then filter out noreply.github.com (what else?)
			const timeAgo = new Date().getTime() / 1000 - since;
			data = (await git({ cwd: repoPath }, "log", "--pretty=format:%an|%aE", `--since=${timeAgo}`))
				.split("\n")
				.map(line => line.trim())
				.filter(line => !line.match(/noreply/))
				.forEach(line => {
					const [name, email] = line.split("|");
					result[email.trim()] = name.trim();
				});
		} catch {}

		return result;
	}

	async setKnownRepository(repos: { repoId: string; path: string }[]) {
		return this._repositories.setKnownRepository(repos);
	}

	private _normalizePath(path: string): string {
		const cygwinMatch = cygwinRegex.exec(path);
		if (cygwinMatch != null) {
			const [, drive] = cygwinMatch;
			// c is just a placeholder to get the length, since drive letters are always 1 char
			let sanitized = `${drive}:${path.substr("/cygdrive/c".length)}`;
			sanitized = sanitized.replace(/\//g, "\\");
			Logger.debug(`Cygwin git path sanitized: ${path} -> ${sanitized}`);
			return sanitized;
		}
		// Make sure to normalize: https://github.com/git-for-windows/git/issues/2478
		return Strings.normalizePath(path.trim());
	}
}
