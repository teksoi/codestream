"use strict";
import * as path from "path";
import {
	ThirdPartyIssueProvider,
	ThirdPartyProviderSupportsPullRequests
} from "providers/provider";
import { CodeStreamSession } from "session";
import { Range, TextDocumentChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Marker, MarkerLocation, Ranges } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import { calculateLocations } from "../markerLocation/calculator";
import {
	CreateDocumentMarkerPermalinkRequest,
	CreateDocumentMarkerPermalinkRequestType,
	CreateDocumentMarkerPermalinkResponse,
	DidChangeDocumentMarkersNotificationType,
	DocumentMarker,
	FetchDocumentMarkersRequest,
	FetchDocumentMarkersRequestType,
	FetchDocumentMarkersResponse,
	GetDocumentFromKeyBindingRequest,
	GetDocumentFromKeyBindingRequestType,
	GetDocumentFromKeyBindingResponse,
	GetDocumentFromMarkerRequest,
	GetDocumentFromMarkerRequestType,
	GetDocumentFromMarkerResponse,
	MarkerNotLocated,
	MarkerNotLocatedReason
} from "../protocol/agent.protocol";
import {
	CodemarkStatus,
	CodemarkType,
	CSCodemark,
	CSMarker,
	CSMe,
	CSUser
} from "../protocol/api.protocol";
import { Functions, log, lsp, lspHandler, Strings } from "../system";
import { ReviewsManager } from "./reviewsManager";

const emojiMap: { [key: string]: string } = require("../../emoji/emojis.json");
const emojiRegex = /:([-+_a-z0-9]+):/g;

const emptyArray = (Object.freeze([]) as any) as any[];
const emptyResponse = {
	markers: emptyArray,
	markersNotLocated: emptyArray
};

@lsp
export class DocumentMarkerManager {
	private _user: CSMe | undefined;
	private _documentFromMarkerCache = new Map<string, GetDocumentFromMarkerResponse>();

	constructor(readonly session: CodeStreamSession) {
		this.session.onDidChangeCodemarks(this.onCodemarksChanged, this);
		this.session.onDidChangeCurrentUser(this.onCurrentUserChanged, this);
		this.session.onDidChangeMarkers(this.onMarkersChanged, this);
		this.session.agent.documents.onDidChangeContent(this.onDocumentContentChanged, this);
	}

	private onCodemarksChanged(codemarks: CSCodemark[]) {
		const fileStreamIds = new Set<string>();
		for (const codemark of codemarks) {
			if (codemark.fileStreamIds) {
				for (const fileStreamId of codemark.fileStreamIds) {
					fileStreamIds.add(fileStreamId);
				}
			}
		}

		this.onFileStreamsChanged(fileStreamIds);
	}

	private onCurrentUserChanged(me: CSMe) {
		this._user = me;
		// TODO: Clear the cache if we changed? or at least if the providers changed
	}

	private onDocumentContentChanged(e: TextDocumentChangeEvent) {
		this.fireDidChangeDocumentMarkers(e.document.uri, "document");
	}

	private onMarkersChanged(markers: CSMarker[]) {
		const fileStreamIds = new Set<string>();
		for (const marker of markers) {
			fileStreamIds.add(marker.fileStreamId);
		}

		this.onFileStreamsChanged(fileStreamIds);
	}

	private async onFileStreamsChanged(fileStreamIds: Set<string>) {
		const { files } = SessionContainer.instance();

		for (const fileStreamId of fileStreamIds) {
			const uri = await files.getDocumentUri(fileStreamId);
			if (uri) {
				this.fireDidChangeDocumentMarkers(uri, "codemarks");
			}
		}
	}

	private _debouncedDocumentMarkersChangedByReason = new Map<
		"document" | "codemarks",
		(uri: string, reason: "document" | "codemarks") => Promise<void>
	>();

	async fireDidChangeDocumentMarkers(uri: string, reason: "document" | "codemarks") {
		// Normalize the uri to vscode style uri formating
		uri = URI.parse(uri).toString();

		let fn = this._debouncedDocumentMarkersChangedByReason.get(reason);
		if (fn === undefined) {
			// Create a debounced function based on the reason that is uniquely debounced by the uri
			fn = Functions.debounceMemoized(
				this.fireDidChangeDocumentMarkersCore.bind(this),
				// If we are firing because of a codemark/marker change, only wait 100ms, otherwise 1s with a max of 3s
				reason === "codemarks" ? 100 : 1000,
				{
					maxWait: 3000,
					resolver: function(uri: string, reason: "document" | "codemarks") {
						return uri;
					}
				}
			);
			this._debouncedDocumentMarkersChangedByReason.set(reason, fn);
		}

		fn(uri, reason);
	}

	private async fireDidChangeDocumentMarkersCore(uri: string, reason: "document" | "codemarks") {
		this.session.agent.sendNotification(DidChangeDocumentMarkersNotificationType, {
			textDocument: {
				uri: uri
			},
			reason: reason
		});
	}

	@log()
	@lspHandler(CreateDocumentMarkerPermalinkRequestType)
	async createPermalink({
		uri,
		range,
		privacy,
		contents
	}: CreateDocumentMarkerPermalinkRequest): Promise<CreateDocumentMarkerPermalinkResponse> {
		const { codemarks, git, scm } = SessionContainer.instance();

		const scmResponse = await scm.getRangeInfo({
			uri: uri,
			range: range,
			contents: contents,
			skipBlame: true
		});
		const remotes = scmResponse.scm && scmResponse.scm.remotes.map(r => r.url);

		let remoteCodeUrl;
		if (remotes !== undefined && scmResponse.scm !== undefined && scmResponse.scm.revision) {
			// Ensure range end is >= start
			range = Ranges.ensureStartBeforeEnd(range);

			for (const remote of remotes) {
				remoteCodeUrl = Marker.getRemoteCodeUrl(
					remote,
					scmResponse.scm.revision,
					scmResponse.scm.file,
					scmResponse.range.start.line + 1,
					scmResponse.range.end.line + 1
				);

				if (remoteCodeUrl !== undefined) {
					break;
				}
			}
		}

		let commitHash;
		let location;
		if (scmResponse.scm) {
			if (!scmResponse.scm.revision) {
				commitHash = (await git.getRepoHeadRevision(scmResponse.scm.repoPath))!;
				location = MarkerLocation.toArray(MarkerLocation.empty());
			} else {
				commitHash = scmResponse.scm.revision;
				location = MarkerLocation.toArrayFromRange(range);
			}
		}

		const response = await codemarks.create({
			type: CodemarkType.Link,
			markers: [
				{
					code: scmResponse.contents,
					remotes: remotes,
					commitHash: commitHash,
					file: scmResponse.scm && scmResponse.scm.file,
					location: location
				}
			],
			remotes: remotes,
			remoteCodeUrl: remoteCodeUrl,
			createPermalink: privacy
		});

		const telemetry = Container.instance().telemetry;
		const payload = {
			Access: privacy === "public" ? "Public" : "Private",
			"Codemark ID": response.codemark.id
		};
		telemetry.track({ eventName: "Permalink Created", properties: payload });

		return { linkUrl: response.permalink! };
	}

	@log()
	@lspHandler(FetchDocumentMarkersRequestType)
	async get(request: FetchDocumentMarkersRequest): Promise<FetchDocumentMarkersResponse> {
		if (request.textDocument.uri.startsWith("codestream-diff://")) {
			return this.getDocumentMarkersForDiff(request);
		} else {
			return this.getDocumentMarkersForRegularFile(request);
		}
	}

	private async getDocumentMarkersForDiff({
		textDocument: documentId,
		filters: filters
	}: FetchDocumentMarkersRequest) {
		const { codemarks, files, markers, reviews, users, posts } = SessionContainer.instance();

		const { reviewId, path, repoId } = ReviewsManager.parseUri(documentId.uri);
		if (reviewId === "local") return emptyResponse;

		const stream = (await files.getByRepoId(repoId)).find(f => f.file === path);
		if (stream == null) return emptyResponse;

		const review = await reviews.getById(reviewId);
		const markersForDocument = await markers.getByStreamId(stream.id, true);
		const documentMarkers: DocumentMarker[] = [];
		for (const marker of markersForDocument) {
			if (!marker.postId) continue; // permalinks
			const post = await posts.getById(marker.postId);
			if (review.postId !== post.parentPostId) continue;
			const canonicalLocation = marker.referenceLocations.find(l => l.flags.canonical);
			if (canonicalLocation == null) continue;

			const codemark = await codemarks.getEnrichedCodemarkById(marker.codemarkId);
			const creator = await users.getById(marker.creatorId, { avoidCachingOnFetch: true });
			let summary = codemark.title || codemark.text || "";
			if (summary.length !== 0) {
				summary = (codemark.title || codemark.text).replace(
					emojiRegex,
					(s, code) => emojiMap[code] || s
				);
			}
			documentMarkers.push({
				...marker,
				fileUri: documentId.uri,
				codemark: codemark,
				creatorName: (creator && creator.username) || "Unknown",
				range: MarkerLocation.toRangeFromArray(canonicalLocation.location),
				location: MarkerLocation.fromArray(canonicalLocation.location, marker.id),
				summary: summary,
				summaryMarkdown: `\n\n${Strings.escapeMarkdown(summary, { quoted: true })}`,
				type: codemark.type
			});
		}

		return {
			markers: documentMarkers,
			markersNotLocated: []
		};
	}

	private async getDocumentMarkersForRegularFile({
		textDocument: documentId,
		filters: filters
	}: FetchDocumentMarkersRequest) {
		const cc = Logger.getCorrelationContext();

		const { codemarks, files, markers, markerLocations, users } = SessionContainer.instance();

		try {
			const documentUri = URI.parse(documentId.uri);

			const filePath = documentUri.fsPath;
			Logger.log(cc, `MARKERS: requested markers for ${filePath}`);

			const documentMarkers: DocumentMarker[] = [];
			const markersNotLocated: MarkerNotLocated[] = [];

			const stream = await files.getByPath(filePath);
			if (stream != null) {
				const markersForDocument = await markers.getByStreamId(stream.id, true);
				Logger.log(
					cc,
					`MARKERS: found ${markersForDocument.length} markers - retrieving current locations`
				);

				const { locations, missingLocations } = await markerLocations.getCurrentLocations(
					documentId.uri,
					stream.id,
					markersForDocument
				);

				const usersById = new Map<string, CSUser>();

				Logger.log(cc, `MARKERS: results:`);

				for (const marker of markersForDocument) {
					try {
						const codemark = await codemarks.getEnrichedCodemarkById(marker.codemarkId);

						// Only return markers that are not links and match the filter[s] (if any)
						if (
							codemark.type === CodemarkType.Link ||
							(filters &&
								filters.excludeArchived &&
								(!codemark.pinned ||
									(codemark.type === CodemarkType.Issue &&
										codemark.status === CodemarkStatus.Closed)))
						) {
							continue;
						}

						let creator;
						try {
							creator = usersById.get(marker.creatorId);
							if (creator === undefined) {
								// HACK: This is a total hack for non-CS teams (slack, msteams) to avoid getting codestream users mixed with slack users in the cache
								creator = await users.getById(marker.creatorId, { avoidCachingOnFetch: true });

								if (creator !== undefined) {
									usersById.set(marker.creatorId, creator);
								}
							}
						} catch (ex) {
							debugger;
						}

						let summary = codemark.title || codemark.text || "";
						if (summary.length !== 0) {
							summary = (codemark.title || codemark.text).replace(
								emojiRegex,
								(s, code) => emojiMap[code] || s
							);
						}

						const location = locations[marker.id];
						if (location) {
							documentMarkers.push({
								...marker,
								fileUri: documentUri.toString(),
								codemark: codemark,
								creatorName: (creator && creator.username) || "Unknown",
								range: MarkerLocation.toRange(location),
								location: location,
								summary: summary,
								summaryMarkdown: `\n\n${Strings.escapeMarkdown(summary, { quoted: true })}`,
								type: codemark.type
							});
							Logger.log(
								cc,
								`MARKERS: ${marker.id}=[${location.lineStart}, ${location.colStart}, ${location.lineEnd}, ${location.colEnd}]`
							);
						} else {
							const missingLocation = missingLocations[marker.id];
							if (missingLocation) {
								markersNotLocated.push({
									...marker,
									summary: summary,
									summaryMarkdown: `\n\n${Strings.escapeMarkdown(summary, { quoted: true })}`,
									creatorName: (creator && creator.username) || "Unknown",
									codemark: codemark,
									notLocatedReason: missingLocation.reason,
									notLocatedDetails: missingLocation.details
								});
								Logger.log(
									cc,
									`MARKERS: ${marker.id}=${missingLocation.details ||
										"location not found"}, reason: ${missingLocation.reason}`
								);
							} else {
								markersNotLocated.push({
									...marker,
									summary: summary,
									summaryMarkdown: `\n\n${Strings.escapeMarkdown(summary, { quoted: true })}`,
									creatorName: (creator && creator.username) || "Unknown",
									codemark: codemark,
									notLocatedReason: MarkerNotLocatedReason.UNKNOWN
								});
								Logger.log(cc, `MARKERS: ${marker.id}=location not found, reason: unknown`);
							}
						}
					} catch (ex) {
						Logger.error(ex, cc);
					}
				}
			}

			try {
				const prMarkers = await this.getPullRequestDocumentMarkers({
					uri: documentUri,
					streamId: stream && stream.id
				});
				if (prMarkers.length > 0) {
					documentMarkers.push(...prMarkers);
				}
			} catch (ex) {
				Logger.error(ex, cc);
				debugger;
			}

			return {
				markers: documentMarkers,
				markersNotLocated
			};
		} catch (ex) {
			Logger.error(ex, cc);
			debugger;
			return emptyResponse;
		}
	}

	@log()
	async getPullRequestDocumentMarkers({
		uri,
		streamId
	}: {
		uri: URI;
		streamId: string | undefined;
	}): Promise<DocumentMarker[]> {
		const user = await this.getMe();

		const { providerRegistry } = SessionContainer.instance();
		const providers = providerRegistry.getConnectedProviders(
			user,
			(p): p is ThirdPartyIssueProvider & ThirdPartyProviderSupportsPullRequests => {
				const thirdPartyIssueProvider = p as ThirdPartyIssueProvider;
				return (
					thirdPartyIssueProvider &&
					typeof thirdPartyIssueProvider.supportsPullRequests === "function" &&
					thirdPartyIssueProvider.supportsPullRequests()
				);
			}
		);
		if (providers.length === 0) return emptyArray;

		const { git } = SessionContainer.instance();
		const repo = await git.getRepositoryByFilePath(uri.fsPath);

		const markers = [];
		const requests = providers.map(p =>
			p.getPullRequestDocumentMarkers({
				uri: uri,
				repoId: repo!.id,
				streamId: streamId
			})
		);

		for await (const response of requests) {
			markers.push(...response);
		}

		// // If we have any markers, notify the webview, so it can request them again
		// if (markers.length !== 0) {
		// 	this.fireDidChangeDocumentMarkers(uri.toString(true), "codemarks");
		// }

		return markers;
	}

	@log()
	@lspHandler(GetDocumentFromKeyBindingRequestType)
	async getDocumentFromKeyBinding({
		key
	}: GetDocumentFromKeyBindingRequest): Promise<GetDocumentFromKeyBindingResponse | undefined> {
		const { codemarks, users } = SessionContainer.instance();

		const { preferences } = await users.getPreferences();
		const codemarkKeybindings: { [key: string]: string } = preferences.codemarkKeybindings || {};

		const codemarkId = codemarkKeybindings[key];
		if (codemarkId == null || codemarkId.length === 0) return undefined;

		const codemark = await codemarks.getEnrichedCodemarkById(codemarkId);
		if (codemark == null || codemark.markers == null || codemark.markers.length === 0) {
			return undefined;
		}

		const [marker] = codemark.markers;

		return this.getDocumentFromMarker({
			markerId: marker.id,
			file: marker.file,
			repoId: marker.repoId
		});
	}

	@log()
	@lspHandler(GetDocumentFromMarkerRequestType)
	async getDocumentFromMarker({
		markerId,
		repoId,
		file
	}: GetDocumentFromMarkerRequest): Promise<GetDocumentFromMarkerResponse | undefined> {
		const { git, markers, markerLocations, repositoryMappings } = SessionContainer.instance();
		const { documents } = Container.instance();

		const marker = await markers.getById(markerId);
		if (repoId == null || file == null) {
			file = marker.file;
			repoId = marker.repoId;
		}

		const repo = await git.getRepositoryById(repoId);
		let repoPath;
		if (repo === undefined) {
			const mappedRepoPath = await repositoryMappings.getByRepoId(repoId);
			if (!mappedRepoPath) return undefined;

			repoPath = mappedRepoPath;
		} else {
			repoPath = repo.path;
		}

		const filePath = path.join(repoPath, file);
		const documentUri = URI.file(filePath).toString();

		const cachedResponse = this._documentFromMarkerCache.get(markerId);
		const document = documents.get(documentUri);
		if (cachedResponse && document && cachedResponse.textDocument.version === document.version) {
			return cachedResponse;
		}

		const result = await markerLocations.getCurrentLocations(documentUri);
		const location = result.locations[markerId];
		const range = location ? MarkerLocation.toRange(location) : Range.create(0, 0, 0, 0);
		const version = (document && document.version) || 0;
		const response = {
			textDocument: { uri: documentUri, version },
			marker: marker,
			range: range
		};

		if (version !== 0) {
			this._documentFromMarkerCache.set(markerId, response);
		}

		return response;
	}

	private async getMe() {
		if (this._user === undefined) {
			({ user: this._user } = await this.session.api.getMe());
		}
		return this._user;
	}
}
