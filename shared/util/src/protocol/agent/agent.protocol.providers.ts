"use strict";
import {
	CompletionItem,
	NotificationType,
	RequestType,
	TextDocumentPositionParams,
} from "vscode-languageserver-protocol";

import {
	BitbucketParticipantRole,
	CrossPostIssueValues,
	GitLabMergeRequest,
} from "./agent.protocol";
import { CodeErrorPlus } from "./agent.protocol.codeErrors";
import { CodemarkPlus } from "./agent.protocol.codemarks";
import { LicenseDependencyIssue, VulnerabilityIssue } from "./agent.protocol.fossa";
import { ReviewPlus } from "./agent.protocol.reviews";
import { CSRepository, PullRequestQuery } from "./api.protocol.models";
import { TrunkCheckResults } from "./agent.protocol.trunk";

export interface NewThirdPartyProviderConfig {
	id: string;
	apiUrl: string;
	name: string;
	baseHeaders: { [key: string]: string };
}
export interface ThirdPartyProviderConfig {
	id: string;
	name: string; // e.g. "trello"
	host: string;
	apiHost?: string;
	isEnterprise?: boolean;
	forEnterprise?: boolean;
	hasCodeHosting?: boolean;
	hasIssues?: boolean;
	hasServerToken?: boolean;
	hasSharing?: boolean;
	supportsAuth?: boolean;
	needsConfigure?: boolean;
	needsConfigureForOnPrem?: boolean;
	supportsOAuthOrPAT?: boolean;
	oauthData?: { [key: string]: any };
	scopes?: string[];
	canFilterByAssignees?: boolean;
	subProviders?: ThirdPartyProviderConfig[];
}

export interface ThirdPartyDisconnect {
	providerTeamId?: string;
}

export interface ThirdPartyProviders {
	[providerId: string]: ThirdPartyProviderConfig;
}

export interface ConnectThirdPartyProviderRequest {
	providerId: string;
}

export interface ConnectThirdPartyProviderResponse {}

export const ConnectThirdPartyProviderRequestType = new RequestType<
	ConnectThirdPartyProviderRequest,
	ConnectThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/connect");

export interface ConfigureThirdPartyProviderRequest {
	providerId: string;
	data: ProviderConfigurationData;
	verify?: boolean;
}

export interface ConfigureThirdPartyProviderResponse {}

export const ConfigureThirdPartyProviderRequestType = new RequestType<
	ConfigureThirdPartyProviderRequest,
	ConfigureThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/configure");

export interface AddEnterpriseProviderRequest {
	providerId: string;
	host: string;
	data: { [key: string]: any };
}

export interface AddEnterpriseProviderResponse {
	providerId: string;
}

export const AddEnterpriseProviderRequestType = new RequestType<
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderResponse,
	void,
	void
>("codestream/provider/add");

export interface RemoveEnterpriseProviderRequest {
	providerId: string;
}

export const RemoveEnterpriseProviderRequestType = new RequestType<
	RemoveEnterpriseProviderRequest,
	void,
	void,
	void
>("codestream/provider/remove");

export interface DisconnectThirdPartyProviderRequest {
	providerId: string;
	providerTeamId?: string;
}

export interface DisconnectThirdPartyProviderResponse {}

export const DisconnectThirdPartyProviderRequestType = new RequestType<
	DisconnectThirdPartyProviderRequest,
	DisconnectThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/disconnect");

export interface ThirdPartyProviderBoard {
	id: string;
	name: string;
	apiIdentifier?: string;
	assigneesRequired?: boolean;
	assigneesDisabled?: boolean;
	singleAssignee?: boolean;
	lists?: TransitionsEntity[];
}

export interface FetchThirdPartyBoardsRequest {
	providerId: string;
	force?: boolean | undefined;

	[key: string]: any;
}

export interface FetchThirdPartyBoardsResponse {
	boards: ThirdPartyProviderBoard[];
}

export const FetchThirdPartyBoardsRequestType = new RequestType<
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	void,
	void
>("codestream/provider/boards");

export interface TransitionsEntity {
	id: string;
	name: string;
}

export interface ThirdPartyProviderCard {
	id: string;
	title: string;
	body: string;
	url?: string;
	modifiedAt: number;
	tokenId?: string;
	idList?: string;
	idBoard?: string;
	apiIdentifier?: string;
	comments?: number;
	lists?: TransitionsEntity[];
	listName?: string;
	priorityName?: string;
	priorityIcon?: string;
	typeIcon?: string;
	subtasks?: ThirdPartyProviderCard[];
	parentId?: string;
	projectId?: string;
}

export interface FetchThirdPartyCardsRequest {
	providerId: string;
	customFilter?: string;
	force?: boolean | undefined;

	[key: string]: any;
}

export interface FetchThirdPartyCardsResponse {
	cards: ThirdPartyProviderCard[];
	error?: {
		message: string;
	};
}

export const FetchThirdPartyCardsRequestType = new RequestType<
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	void,
	void
>("codestream/provider/cards");

export interface FetchThirdPartyCardWorkflowRequest {
	providerId: string;
	cardId: string;

	[key: string]: any;
}

export interface FetchThirdPartyCardWorkflowResponse {
	workflow: { id: string; name: string }[];
}

export const FetchThirdPartyCardWorkflowRequestType = new RequestType<
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	void,
	void
>("codestream/provider/cards/workflow");

export interface MoveThirdPartyCardRequest {
	providerId: string;
	cardId: string;
	listId: string;
}

export interface MoveThirdPartyCardResponse {
	success: boolean;
}

export const MoveThirdPartyCardRequestType = new RequestType<
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	void,
	void
>("codestream/provider/cards/move");

export interface UpdateThirdPartyStatusRequest {
	providerId: string;
	providerTeamId: string;
	text: string;
	icon?: string;
	expires?: number;
}

export interface UpdateThirdPartyStatusResponse {
	status: any;
}

export const UpdateThirdPartyStatusRequestType = new RequestType<
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusResponse,
	void,
	void
>("codestream/provider/status/update");

export interface CreateThirdPartyPostRequest {
	providerId: string;
	providerTeamId: string;
	channelId?: string;
	text: string;
	attributes?: any;
	memberIds?: any;
	codemark?: CodemarkPlus;
	review?: ReviewPlus;
	codeError?: CodeErrorPlus;
	remotes?: string[];
	entryPoint?: string;
	crossPostIssueValues?: CrossPostIssueValues;
	mentionedUserIds?: string[];
	parentPostId?: string;
	parentText?: string;
	providerServerTokenUserId?: string;
	existingPostId?: string;
	files?: { name: string; url?: string }[];
}

export interface CreateThirdPartyPostResponse {
	post: any;
	ts?: string;
	permalink?: string;
	channelId?: string;
	channelName?: string;
}

export const CreateThirdPartyPostRequestType = new RequestType<
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostResponse,
	void,
	void
>("codestream/provider/posts/create");

export interface DeleteThirdPartyPostRequest {
	providerId: string;
	providerTeamId: string;
	channelId: string;
	providerPostId: string;
	providerServerTokenUserId?: string;
}

export interface DeleteThirdPartyPostResponse {
	ts?: string;
}

export const DeleteThirdPartyPostRequestType = new RequestType<
	DeleteThirdPartyPostRequest,
	DeleteThirdPartyPostResponse,
	void,
	void
>("codestream/provider/posts/delete");

export const FetchThirdPartyChannelsRequestType = new RequestType<
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsResponse,
	void,
	void
>("codestream/provider/channels");

export interface FetchThirdPartyChannelsRequest {
	providerId: string;
	providerTeamId: string;

	[key: string]: any;
}

export interface ThirdPartyChannel {
	id: string;
	name: string;
	type: string;
}

export interface ThirdPartyChannelMember {
	id: string;
	name: string;
}

export interface FetchThirdPartyChannelsResponse {
	channels: ThirdPartyChannel[];
	members?: ThirdPartyChannelMember[];
}

export interface ThirdPartyProviderUser {
	id?: string;
	displayName: string;
	email?: string;
	avatarUrl?: string;
}

export interface FetchAssignableUsersRequest {
	providerId: string;
	boardId: string;
}

export interface FetchAssignableUsersAutocompleteRequest {
	providerId: string;
	boardId: string;
	search: string;
}

export interface FetchAssignableUsersResponse {
	users: ThirdPartyProviderUser[];
}

export const FetchAssignableUsersRequestType = new RequestType<
	FetchAssignableUsersRequest,
	FetchAssignableUsersResponse,
	void,
	void
>("codestream/provider/cards/users");

export const FetchAssignableUsersAutocompleteRequestType = new RequestType<
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse,
	void,
	void
>("codestream/provider/cards/users/search");

export interface CreateThirdPartyCardRequest {
	providerId: string;
	data: {
		[key: string]: any;
	};
}

export interface CreateThirdPartyCardResponse {
	[key: string]: any;
}

export const CreateThirdPartyCardRequestType = new RequestType<
	CreateThirdPartyCardRequest,
	CreateThirdPartyCardResponse,
	void,
	void
>("codestream/provider/cards/create");

export interface ProviderConfigurationData {
	host?: string;
	baseUrl?: string;
	accessToken?: string;
	pendingVerification?: boolean;

	[key: string]: any;
}

export interface ThirdPartyProviderSetInfoRequest {
	providerId: string;
	data: ProviderConfigurationData;
}

export interface AddEnterpriseProviderHostRequest {
	provider: string;
	teamId: string;
	host: string;
	data: { [key: string]: any };
}

export interface AddEnterpriseProviderHostResponse {
	providerId: string;
}

export interface RemoveEnterpriseProviderHostRequest {
	provider: string;
	providerId: string;
	teamId: string;
}

export interface FetchThirdPartyPullRequestRequest {
	providerId: string;
	providerTeamId?: string;
	pullRequestId: string;

	/**
	 * in the GitHub world, this is `TeamCodeStream` in https://github.com/TeamCodeStream/codestream
	 */
	owner?: string;
	/**
	 * in the GitHub world, this is `codestream` in https://github.com/TeamCodeStream/codestream
	 */
	repo?: string;
	/**
	 * if true, clear this PR from the cache and re-fetch from the provider
	 */
	force?: boolean;
	metadata?: any;
	/**
	 * for debugging who is calling this
	 */
	src?: string;
}

export interface FetchThirdPartyPullRequestFilesResponse {
	sha: string;
	filename: string;
	previousFilename?: string;
	status: string;
	additions: number;
	changes: number;
	deletions: number;
	patch?: string;
}

export enum ThirdPartyBuildStatus {
	Success = "Success",
	Running = "Running",
	Waiting = "Waiting",
	Failed = "Failed",
	Unknown = "Unknown",
}

export interface ThirdPartyBuild {
	id: string;
	status: ThirdPartyBuildStatus;
	message: string;
	duration: string;
	finished?: Date;
	finishedRelative?: string;
	builds: ThirdPartyBuild[];
	url?: string;
	artifactsUrl?: string;
	logsUrl?: string;
}

export interface FetchThirdPartyBuildsRequest {
	providerId: string;
	remote: {
		domain: string;
		path: string;
	};
	branch: string;
}

export interface FetchThirdPartyBuildsResponse {
	projects: {
		[key: string]: ThirdPartyBuild[];
	};
	dashboardUrl?: string;
}

export const FetchThirdPartyBuildsRequestType = new RequestType<
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	void,
	void
>("codestream/provider/builds");

export interface FetchThirdPartyCodeAnalyzersRequest {
	providerId: string;
	pageNumber: number;
	repoId?: string;
}
export interface FetchThirdPartyLicenseDependenciesResponse {
	issues?: LicenseDependencyIssue[];
	error?: string;
}

export const FetchThirdPartyLicenseDependenciesRequestType = new RequestType<
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyLicenseDependenciesResponse,
	void,
	void
>("codestream/provider/licenseDependencies");

export interface FetchThirdPartyVulnerabilitiesResponse {
	issues?: VulnerabilityIssue[];
	error?: string;
}

export const FetchThirdPartyVulnerabilitiesRequestType = new RequestType<
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyVulnerabilitiesResponse,
	void,
	void
>("codestream/provider/vulnerablitlies");

export { LicenseDependencyIssue, VulnerabilityIssue } from "./agent.protocol.fossa";

export interface FetchThirdPartyRepoMatchToFossaRequest {
	providerId: string;
	repoId?: string;
}
export interface FetchThirdPartyRepoMatchToFossaResponse {
	isRepoMatch?: boolean;
	error?: string;
}

export const FetchThirdPartyRepoMatchToFossaRequestType = new RequestType<
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaResponse,
	void,
	void
>("codestream/provider/fossaRepoMatch");

export type CheckConclusionState =
	| "ACTION_REQUIRED"
	| "TIMED_OUT"
	| "CANCELLED"
	| "FAILURE"
	| "SUCCESS"
	| "NEUTRAL"
	| "SKIPPED"
	| "STARTUP_FAILURE"
	| "STALE";

export type StatusState = "EXPECTED" | "ERROR" | "FAILURE" | "PENDING" | "SUCCESS" | "NEUTRAL";
export type CheckStatusState = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "WAITING" | "REQUESTED";

export interface CheckRun {
	__typename: string;
	conclusion: CheckConclusionState;
	status: CheckStatusState;
	name: string;
	title: string;
	detailsUrl: string;
	startedAt: string;
	completedAt: string;
	checkSuite: {
		app: {
			logoUrl: string;
			slug: string;
		};
	};
}

export interface StatusContext {
	__typename: string;
	avatarUrl: string;
	context: string;
	description: string;
	state: StatusState;
	targetUrl: string;
}

export interface FetchThirdPartyPullRequestPullRequest {
	id: string;
	/** used by some other providers like GitLab  */
	iid?: string;
	idComputed?: string;
	providerId: string; // e.g. "github*com"
	// this is the parent repo
	repository: {
		name: string;
		nameWithOwner: string;
		url: string;
		prRepoId?: string;
	};
	locked: any;
	activeLockReason: "OFF_TOPIC" | "SPAM" | "TOO_HEATED" | "RESOLVED";
	body: string;
	bodyHTML: string;
	baseRefName: string;
	baseRefOid: string;
	forkPointSha?: string;
	author: {
		login: string;
		avatarUrl: string;
		id?: string;
	};
	authorAssociation:
		| "COLLABORATOR"
		| "CONTRIBUTOR"
		| "FIRST_TIMER"
		| "FIRST_TIME_CONTRIBUTOR"
		| "MEMBER"
		| "NONE"
		| "OWNER";
	createdAt: string;
	commits: {
		totalCount: number;
		nodes: {
			commit: {
				statusCheckRollup?: {
					state: StatusState;
					contexts: {
						nodes: CheckRun | StatusContext;
					};
				};
			};
		};
	};
	comments?: any[]; //TODO: Fix this!
	description: string; //this is for bitbucket
	additions: number; //bitbucket
	deletions: number; //bitbucket
	files: {
		pageInfo: {
			endCursor?: string;
			hasNextPage?: boolean;
		};
		totalCount: number;
		nodes: {
			path: string;
			additions: number;
			deletions: number;
			viewerViewedState: string;
		}[];
	};
	headRefName: string;
	headRepositoryOwner?: {
		login: string;
	};
	headRepository?: {
		isFork: boolean;
		name: string;
		url: string;
	};
	headRefOid: string;
	labels: Labels;
	number: number;
	state: string;
	isDraft?: boolean;
	reviewRequests: {
		nodes: {
			requestedReviewer: {
				id: string;
				login: string;
				avatarUrl: string;
			};
		}[];
	};
	reviewThreads: {
		edges: {
			node: {
				id: string;
				isResolved: boolean;
				viewerCanResolve: boolean;
				viewerCanUnresolve: boolean;
				comments: {
					totalCount: number;
					nodes: {
						author: {
							login: string;
							avatarUrl: string;
							id?: string;
						};
						id: string;
					}[];
				};
			};
		}[];
	};
	projectCards: {
		nodes: {
			project: {
				id: string;
				name: string;
			};
		}[];
	};
	reviews: {
		nodes: {
			id: string;
			createdAt: string;
			state: string;
			comments: {
				totalCount: number;
			};
			author: {
				id: string;
				login: string;
				avatarUrl: string;
			};
			commit: {
				oid: string;
			};
		}[];
	};
	/**
	 * this is a single pending review for the current user (there can only be 1 at a time for
	 * certain providers, like github)
	 */
	pendingReview?: {
		id: string;
		author: {
			login: string;
			avatarUrl: string;
		};
		comments?: {
			totalCount: number;
		};
	};
	timelineItems: {
		__typename: string;
		totalCount: number;
		pageInfo: {
			startCursor: string;
			endCursor: string;
			hasNextPage: boolean;
		};
		nodes: any[];
	};
	milestone: {
		title: string;
		state: string;
		number: number;
		id: string;
		description: string;
	};
	participants: {
		nodes: {
			//gitlab
			avatarUrl?: string;
			//bitbucket ALL participants & reviewers regardless of status
			type?: string;
			user: {
				display_name: string;
				links: {
					avatar: {
						href: string;
					};
				};
				type?: string;
				uuid: string;
				account_id: string;
				nickname: string;
			};
			role: BitbucketParticipantRole;
			approved: boolean;
			state?: string;
			participated_on: string;
		}[];
	};
	//Bitbucket participants with status & reviewers
	reviewers?: {
		nodes: {
			type?: string;
			user: {
				display_name: string;
				links: {
					avatar: {
						href: string;
					};
				};
				type?: string;
				uuid: string;
				account_id: string;
				nickname: string;
			};
			role: BitbucketParticipantRole;
			approved: boolean;
			state?: string;
			participated_on: string;
		}[];
	};
	//Bitbucket all members of the workspace
	members: {
		nodes: {
			type: string;
			user: {
				display_name: string;
				links: {
					self: {
						href: string;
					};
					avatar: {
						href: string;
					};
					html: {
						href: string;
					};
				};
				type: string;
				uuid: string;
				account_id: string;
				nickname: string;
			};
			workspace: {
				type: string;
				uuid: string;
				name: string;
				slug: string;
				links: {
					avatar: {
						href: string;
					};
					html: {
						href: string;
					};
					self: {
						href: string;
					};
				};
			};
			links: {
				self: {
					href: string;
				};
			};
		}[];
	};
	assignees: {
		nodes: {
			avatarUrl: string;
			id: string;
			name: string;
			login: string;
		}[];
	};
	mergeable: string;
	merged: boolean;
	mergedAt: string;
	canBeRebased: string;
	mergeStateStatus: string;
	title: string;
	url: string;
	repoUrl: string;
	baseUrl: string;
	updatedAt: string;
	reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";
	reactionGroups: any;
	includesCreatedEdit: boolean;
	viewerDidAuthor: boolean;
	viewerCanUpdate: boolean;
	viewerSubscription: string;

	/** this isn't part of the GH object model, but we add it for convenience */
	viewer: {
		id: string;
		login: string;
		avatarUrl: string;
		viewerCanDelete?: boolean;
	};
	supports?: {
		reviewers?: any;
		version: {
			version: string;
		};
	};
}

interface BranchProtectionRule {
	requiredApprovingReviewCount: number;
	matchingRefs: {
		nodes: {
			name: string;
		}[];
	};
}

export interface BranchProtectionRules {
	nodes: BranchProtectionRule[];
}

export interface FetchThirdPartyPullRequestRepository {
	prRepoId?: string;
	id: string;
	url: string;
	resourcePath: string;
	rebaseMergeAllowed: boolean;
	squashMergeAllowed: boolean;
	mergeCommitAllowed: boolean;
	repoOwner: string;
	repoName: string;
	pullRequest: FetchThirdPartyPullRequestPullRequest;
	providerId: string;
	viewerDefaultMergeMethod?: "MERGE" | "REBASE" | "SQUASH";
	viewerPermission: "ADMIN" | "MAINTAIN" | "READ" | "TRIAGE" | "WRITE";
	branchProtectionRules?: BranchProtectionRules | undefined;
}

export type RepoMatchReason = "remote" | "repoName" | "matchedOnProviderUrl" | "closestMatch";

export interface CurrentRepoResponse {
	error?: string;
	currentRepo?: CSRepository;
	repos?: CSRepository[];
	repoName?: string;
	repoUrl?: string;
	reason?: RepoMatchReason;
}

interface RateLimit {
	limit: any;
	cost: any;
	remaining: any;
	resetAt: any;
}

export interface ThirdPartyPullRequestComments<T> extends Array<T> {}

export interface FetchThirdPartyPullRequestResponse {
	error?: {
		message: string;
	};
	rateLimit?: RateLimit;
	repository: FetchThirdPartyPullRequestRepository;
	viewer: {
		id: string;
		login: string;
		avatarUrl: string;
	};
	project?: {
		name?: string;
		repoName?: string;
		mergeRequest?: FetchThirdPartyPullRequestPullRequest | GitLabMergeRequest;
	};
	mergeRequest?: GitLabMergeRequest; // TODO - Probably can remove
}

export const FetchThirdPartyPullRequestRequestType = new RequestType<
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	void,
	void
>("codestream/provider/pullrequest");

export interface FetchThirdPartyPullRequestCommitsRequest {
	providerId: string;
	pullRequestId: string;
}

export interface FetchThirdPartyPullRequestCommitsResponse {
	abbreviatedOid: string;
	author: {
		name: string;
		avatarUrl: string;
		id?: string;
		user?: {
			login: string;
			avatarUrl?: string;
		};
	};
	committer: {
		avatarUrl: string;
		name: string;
		user?: {
			login: string;
		};
	};
	message: string;
	authoredDate: string;
	oid: string;
	url?: string;
}

export const FetchThirdPartyPullRequestCommitsType = new RequestType<
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse[],
	void,
	void
>("codestream/provider/pullrequestcommits");

export interface ExecuteThirdPartyRequest {
	method: string;
	providerId: string;
	params: any;
}

export interface ExecuteThirdPartyResponse {}

export const ExecuteThirdPartyRequestUntypedType = new RequestType<
	ExecuteThirdPartyRequest,
	ExecuteThirdPartyResponse,
	void,
	void
>("codestream/provider/generic");

export class ExecuteThirdPartyTypedType<Req, Res> extends RequestType<
	ExecuteThirdPartyTypedRequest<Req>,
	Res,
	any,
	any
> {
	constructor() {
		super("codestream/provider/generic");
	}
}

export interface QueryThirdPartyRequest {
	url: string;
}

export interface QueryThirdPartyResponse {
	providerId?: string;
}

export const QueryThirdPartyRequestType = new RequestType<
	QueryThirdPartyRequest,
	QueryThirdPartyResponse,
	void,
	void
>("codestream/provider/query");

export interface FetchProviderDefaultPullRequest {}

export type FetchProviderDefaultPullResponse = {
	[key: string]: PullRequestQuery[];
};

export type PRProviderQueries = FetchProviderDefaultPullResponse;

export const FetchProviderDefaultPullRequestsType = new RequestType<
	FetchProviderDefaultPullRequest,
	FetchProviderDefaultPullResponse,
	void,
	void
>("codestream/providers/pullrequest/queries");

export interface GetMyPullRequestsRequest {
	owner?: string;
	repo?: string;
	prQueries: PullRequestQuery[];
	/**
	 * forces a re-fetch from the provider
	 */
	force?: boolean;
	/**
	 * is this repo open in the IDE?
	 */
	isOpen?: boolean;
}

export interface Labels {
	nodes: { color: string; description: string; name: string; id: string }[];
}

export interface GetMyPullRequestsResponse {
	id: string;
	idComputed?: string;
	providerId: string;
	url: string;
	title: string;
	createdAt: number;
	baseRefName: string;
	headRefName: string;
	headRepository?: {
		name: string;
		nameWithOwner: string;
	};
	author: {
		login: string;
		avatarUrl: string;
		id?: string;
	};
	body: string;
	bodyText: string;
	number: number;
	state: string;
	isDraft?: boolean;
	updatedAt: string;
	lastEditedAt: string;
	labels: Labels;
}

export type MergeMethod = "MERGE" | "SQUASH" | "REBASE";

export interface MergePullRequestRequest {
	pullRequestId: string;
	mergeMethod: MergeMethod;
}

export interface CreatePullRequestCommentRequest {
	pullRequestId: string;
	text: string;
}

export interface CreatePullRequestCommentAndCloseRequest {
	pullRequestId: string;
	text: string;
}

export interface ExecuteThirdPartyTypedRequest<T> {
	method: string;
	providerId: string;
	params?: T;
}

export interface ProviderTokenRequest {
	provider: string;
	token: string;
	inviteCode?: string;
	repoInfo?: {
		teamId: string;
		repoId: string;
		commitHash: string;
	};
	noSignup?: boolean;
	signupToken?: string;
	data?: {
		[key: string]: any;
	};
}

export const ProviderTokenRequestType = new RequestType<ProviderTokenRequest, void, void, void>(
	"codestream/provider/token"
);

export interface WebviewErrorRequest {
	error: { message: string; stack?: string };
}

export const WebviewErrorRequestType = new RequestType<WebviewErrorRequest, void, void, void>(
	`codestream/webview/error`
);

export interface GetNewRelicErrorGroupRequest {
	errorGroupGuid: string;
	/** allow the lookup of errors without stack traces */
	occurrenceId?: string;
	/** optional, though passing it allows for parallelization */
	entityGuid?: string;
	src?: string;
	timestamp?: number;
}

export interface GetNewRelicErrorGroupResponse {
	errorGroup?: NewRelicErrorGroup;
	accountId: number;
	error?: {
		message: string;
		details?: {
			settings?: { key: string; value: any }[];
		};
	};
}

export const GetNewRelicErrorGroupRequestType = new RequestType<
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupResponse,
	void,
	void
>("codestream/newrelic/errorGroup");

export interface GetNewRelicRelatedEntitiesRequest {
	entityGuid: string;
	direction: string;
}

export interface GetNewRelicUrlRequest {
	entityGuid: string;
}

export interface NewRelicUser {
	email?: string;
	gravatar?: string;
	id?: number;
	name?: string;
}

export interface NewRelicErrorGroup {
	accountId: number;
	entityGuid: string;
	entityType?: string; // ApmApplicationEntity |
	entityName?: string;

	occurrenceId?: string;
	traceId?: string;
	entityUrl?: string;
	errorGroupUrl?: string;

	entityAlertingSeverity?: "CRITICAL" | "NOT_ALERTING" | "NOT_CONFIGURED" | "WARNING";
	/**
	 * This is the "id" aka errorGroupGuid, NR calls this "guid"
	 */
	guid: string;
	title: string;
	message: string;

	states?: string[];
	// TODO these might not be hard-codeable
	state?: "RESOLVED" | "IGNORED" | "UNRESOLVED" | string;

	assignee?: NewRelicUser;

	entity?: {
		repo?: {
			name: string;
			urls: string[];
		};
		relatedRepos?: RelatedRepository[] | BuiltFromResult[];
		relationship?: {
			error?: { message?: string };
		};
	};

	errorTrace?: {
		// exceptionClass: string;
		// agentAttributes: any;
		// intrinsicAttributes: any;
		// message: string;
		path: string;
		stackTrace: {
			filepath?: string;
			line?: number;
			name?: string;
			formatted: string;
		}[];
	};

	hostDisplayName?: string;
	transactionName?: string;

	hasStackTrace?: boolean;

	attributes?: {
		[key: string]: {
			type: "timestamp" | "string" | "number";
			value: string | number | boolean;
		};
	};

	commit?: string;
	releaseTag?: string;
}

export interface GetNewRelicRelatedEntitiesResponse extends Array<RelatedEntityByType> {
	error?: {
		message: string;
	};
	message?: string;
}

export interface GetNewRelicUrlResponse {
	newRelicUrl: string;
}

export const GetNewRelicRelatedEntitiesRequestType = new RequestType<
	GetNewRelicRelatedEntitiesRequest,
	GetNewRelicRelatedEntitiesResponse,
	void,
	void
>("codestream/newrelic/relatedEntities");

export const GetNewRelicUrlRequestType = new RequestType<
	GetNewRelicUrlRequest,
	GetNewRelicUrlResponse,
	void,
	void
>("codestream/newrelic/url");

export interface GetNewRelicAssigneesRequest {}

export interface GetNewRelicAssigneesResponse {
	users: any[];
}

export const GetNewRelicAssigneesRequestType = new RequestType<
	GetNewRelicAssigneesRequest,
	GetNewRelicAssigneesResponse,
	void,
	void
>("codestream/newrelic/assignees");

export const GetNewRelicAIEligibilityRequestType = new RequestType<void, boolean, void, void>(
	"codestream/newrelic/aiEligibility"
);

export interface NewRelicAccount {
	id: number;
	name: string;
}

export interface GetNewRelicAccountsResponse {
	accounts: NewRelicAccount[];
}

export const GetNewRelicAccountsRequestType = new RequestType<
	void,
	GetNewRelicAccountsResponse,
	void,
	void
>("codestream/newrelic/accounts");

export interface UpdateNewRelicOrgIdRequest {
	teamId: string;
}

export interface UpdateNewRelicOrgIdResponse {
	orgId?: number;
}

export const UpdateNewRelicOrgIdRequestType = new RequestType<
	UpdateNewRelicOrgIdRequest,
	UpdateNewRelicOrgIdResponse,
	void,
	void
>("codestream/newrelic/orgid/update");

export interface GetNewRelicUsersRequest {
	search?: string;
	nextCursor?: string;
}

export interface GetNewRelicUsersResponse {
	users: {
		email: string;
		name: string;
	}[];
	nextCursor?: string;
}

export const GetNewRelicUsersRequestType = new RequestType<
	GetNewRelicUsersRequest,
	GetNewRelicUsersResponse,
	void,
	void
>("codestream/newrelic/users");

export interface GetObservabilityErrorsRequest {
	filters: { repoId: string; entityGuid?: string }[];
	timeWindow?: string;
}

export interface GetObservabilityErrorsWithoutReposRequest {
	entityGuid: string;
	accountId: number;
	entityType: string;
	timeWindow: string;
}

export interface GetObservabilityErrorsWithoutReposResponse {
	repos?: ObservabilityRepoError[];
	error?: NRErrorResponse;
}

export interface ObservabilityErrorCore {
	entityId: string;
	errorClass: string;
	message: string;
	errorGroupGuid: string;
	errorGroupUrl?: string;
	lastSeenAt?: number;
}

export interface ObservabilityError extends ObservabilityErrorCore {
	appName: string;
	remote: string;
	occurrenceId: string;
	traceId?: string;
	count: number;
	lastOccurrence: number;
	releaseTag?: number;
	showAI?: boolean;
}

export interface ObservabilityRepoError {
	repoId: string;
	repoName: string;
	errors: ObservabilityError[];
}

export interface ObservabilityRepo {
	repoId: string;
	repoName: string;
	repoRemote: string;
	repoGuid: string;
	repoNameOnNr: string;
	hasRepoAssociation?: boolean;
	hasCodeLevelMetricSpanData: boolean | NRErrorResponse;
	entityAccounts: EntityAccount[];
}

export interface GetObservabilityErrorsResponse {
	repos?: ObservabilityRepoError[];
	error?: NRErrorResponse;
}

export const GetObservabilityErrorsRequestType = new RequestType<
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsResponse,
	void,
	void
>("codestream/newrelic/errors");

export const GetObservabilityErrorsWithoutReposRequestType = new RequestType<
	GetObservabilityErrorsWithoutReposRequest,
	GetObservabilityErrorsWithoutReposResponse,
	void,
	void
>("codestream/newrelic/errorsWithoutRepos");

export interface CollaborationAttachment {
	id: string;
	fileName: string;
	filePath: string;
}

export interface CollaborationComment {
	id: string;
	body: string;
	createdAt: string;
	deactivated: boolean;
	systemMessageType?: string;
	creator: {
		email?: string;
		name: string;
		userId: string;
	};
	externalApplicationType?: string;
	attachments?: CollaborationAttachment[];
}

export interface InitiateNrAiRequest {
	entityGuid: string;
	errorGroupGuid: string;

	codeBlock?: string;
	stackTrace: string;
	errorText: string;
	language?: string;

	threadId: string;
}

export interface InitiateNrAiResponse {
	commentId?: string;
	nrError?: NRErrorResponse;
}

export const InitiateNrAiRequestType = new RequestType<
	InitiateNrAiRequest,
	InitiateNrAiResponse,
	void,
	void
>("codestream/newrelic/collaboration/initiateNrAi");

export interface GetErrorInboxCommentsRequest {
	errorGroupGuid: string;
	entityGuid: string;
}

export interface GetErrorInboxCommentsResponse {
	threadId?: string;
	comments?: CollaborationComment[];
	nrError?: NRErrorResponse;
}

export const GetErrorInboxCommentsRequestType = new RequestType<
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsResponse,
	void,
	void
>("codestream/newrelic/collaboration/getErrorComments");

export interface CreateCollaborationCommentRequest {
	errorGroupGuid: string;
	entityGuid: string;
	threadId: string;
	body: string;
}

export interface CreateCollaborationCommentResponse {
	comment?: CollaborationComment;
	nrError?: NRErrorResponse;
}

export const CreateCollaborationCommentRequestType = new RequestType<
	CreateCollaborationCommentRequest,
	CreateCollaborationCommentResponse,
	void,
	void
>("codestream/newrelic/collaboration/createComment");

export interface CloseCollaborationThreadRequest {
	threadId: string;
}

export interface CloseCollaborationThreadResponse {
	success?: boolean;
	nrError?: NRErrorResponse;
}

export const CloseCollaborationThreadRequestType = new RequestType<
	CloseCollaborationThreadRequest,
	CloseCollaborationThreadResponse,
	void,
	void
>("codestream/newrelic/collaboration/closeThread");

export interface DeleteCollaborationCommentRequest {
	commentId: string;
}

export interface DeleteCollaborationCommentResponse {
	commentId?: string;
	nrError?: NRErrorResponse;
}

export const DeleteCollaborationCommentRequestType = new RequestType<
	DeleteCollaborationCommentRequest,
	DeleteCollaborationCommentResponse,
	void,
	void
>("codestream/newrelic/collaboration/deleteComment");

export interface GetCollaborationCommentRequest {
	commentId: string;
}

export interface GetCollaborationCommentResponse {
	comment?: CollaborationComment;
	nrError?: NRErrorResponse;
}

export const GetCollaborationCommentRequestType = new RequestType<
	GetCollaborationCommentRequest,
	GetCollaborationCommentResponse,
	void,
	void
>("codestream/newrelic/collaboration/getComment");

export interface GetCollaborationWebsocketInfoRequest {}

export interface GetCollaborationWebsocketInfoResponse {
	url: string;
	NRConnectionId: string;
}

export const GetCollaborationWebsocketInfoRequestType = new RequestType<
	GetCollaborationWebsocketInfoRequest,
	GetCollaborationWebsocketInfoResponse,
	void,
	void
>("codestream/newrelic/collaboration/websocketInfo");

export interface UpdateCollaborationCommentRequest {
	commentId: string;
	body: string;
}

export interface UpdateCollaborationCommentResponse {
	commentId?: string;
	nrError?: NRErrorResponse;
}

export const UpdateCollaborationCommentRequestType = new RequestType<
	UpdateCollaborationCommentRequest,
	UpdateCollaborationCommentResponse,
	void,
	void
>("codestream/newrelic/collaboration/updateComment");

export interface GetObservabilityAnomaliesRequest {
	entityGuid: string;
	sinceDaysAgo: number;
	baselineDays: number;
	sinceLastRelease: boolean;
	minimumErrorPercentage: number;
	minimumResponseTime: number;
	minimumSampleRate: number;
	minimumRatio: number;
	notifyNewAnomalies?: boolean;
}

export interface ObservabilityAnomaly {
	language: string;
	name: string;
	scope?: string;
	children?: ObservabilityAnomaly[];
	type: "duration" | "errorRate";
	codeAttrs?: CodeAttributes;
	oldValue: number;
	newValue: number;
	ratio: number;
	text: string;
	totalDays: number;
	sinceText: string;
	metricTimesliceName: string;
	errorMetricTimesliceName: string;
	chartHeaderTexts: {
		[key: string]: string;
	};
	notificationText: string;
	entityName: string;
}

export interface EntityObservabilityAnomalies {
	entityGuid: string;
	durationAnomalies: ObservabilityAnomaly[];
	errorRateAnomalies: ObservabilityAnomaly[];
	detectionMethod?: DetectionMethod;
}

export type DetectionMethod = "Release Based" | "Time Based";

export interface Named {
	name: string;
}
export interface NameValue extends Named {
	value: number;
}

export interface Scoped {
	scope?: string;
}

export interface Comparison extends Named, Scoped {
	oldValue: number;
	newValue: number;
	ratio: number;
}

export interface CodeAttributes {
	codeFilepath?: string;
	codeNamespace: string;
	codeFunction: string;
}

export interface SpanWithCodeAttrs extends NameValue, CodeAttributes {}

export interface GetObservabilityAnomaliesResponse {
	responseTime: ObservabilityAnomaly[];
	errorRate: ObservabilityAnomaly[];
	detectionMethod?: DetectionMethod;
	error?: string;
	isSupported?: boolean;
	didNotifyNewAnomalies: boolean;
	isMock?: boolean;
}

export const GetObservabilityAnomaliesRequestType = new RequestType<
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesResponse,
	void,
	void
>("codestream/newrelic/anomalies");

export interface GetClmRequest {
	entityGuid: string;
}

export interface GetClmResponse {
	codeLevelMetrics: CodeLevelMetrics[];
	isSupported: boolean;
	error?: string;
}

export interface CodeLevelMetrics {
	name: string;
	scope?: string;
	codeAttrs?: CodeAttributes;
	duration?: number;
	errorRate?: number;
}

export const GetClmRequestType = new RequestType<GetClmRequest, GetClmResponse, void, void>(
	"codestream/newrelic/clm"
);

export interface GetObservabilityResponseTimesRequest {
	fileUri: string;
}

export interface GetObservabilityResponseTimesResponse {
	responseTimes: { name: string; value: number }[];
}

export const GetObservabilityResponseTimesRequestType = new RequestType<
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesResponse,
	void,
	void
>("codestream/newrelic/responseTimes");

export interface GetObservabilityReposRequest {
	filters?: { repoId: string; entityGuid?: string }[];
	force?: boolean;
	isVsCode?: boolean;
	isMultiRegion?: boolean;
}

export interface EntityAccount {
	distributedTracingEnabled?: boolean;
	languageAndVersionValidation?: LanguageAndVersionValidation;
	alertSeverity?: string;
	accountId: number;
	accountName: string;
	entityGuid: string;
	entityName: string;
	entityType?: EntityType;
	type?: string;
	entityTypeDescription?: string;
	domain?: string;
	name?: string;
	guid?: string;
	url?: string;
	displayName?: string;
	tags: {
		key: string;
		values: string[];
	}[];
	repoEntities?: RelatedRepoWithRemotes[];
}

export interface LanguageAndVersionValidation {
	language?: string;
	required?: string;
	languageExtensionValidation?: string;
}

export interface GetObservabilityReposResponse {
	repos?: ObservabilityRepo[];
	error?: NRErrorResponse;
}

export const GetObservabilityReposRequestType = new RequestType<
	GetObservabilityReposRequest,
	GetObservabilityReposResponse,
	void,
	void
>("codestream/newrelic/repos");

export interface GetEntityAccountFromGuidRequest {
	id: string;
}

export interface GetObservabilityEntityByGuidRequest {
	id: string;
}

export interface GetObservabilityEntityByGuidResponse {
	entity: EntityAccount;
}

export const GetObservabilityEntityByGuidRequestType = new RequestType<
	GetObservabilityEntityByGuidRequest,
	GetObservabilityEntityByGuidResponse,
	void,
	void
>("codestream/newrelic/entity");

export interface GetObservabilityEntitiesRequest {
	searchCharacters: string;
	nextCursor?: string;
	limit?: number;
}

export interface GetObservabilityEntitiesResponse {
	totalResults: number;
	entities: {
		guid: string;
		name: string;
		account: string;
		entityType: EntityType;
		entityTypeDescription: string;
		displayName: string;
	}[];
	nextCursor?: string;
}

export const GetObservabilityEntitiesRequestType = new RequestType<
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesResponse,
	void,
	void
>("codestream/newrelic/entities");

export interface GetObservabilityEntitiesByIdRequest {
	guids: string[];
}

export interface GetObservabilityEntitiesByIdResponse {
	entities: Entity[];
}

export const GetObservabilityEntitiesByIdRequestType = new RequestType<
	GetObservabilityEntitiesByIdRequest,
	GetObservabilityEntitiesByIdResponse,
	void,
	void
>("codestream/newrelic/entities/list");

export interface EditorEntityGuidsRequest {
	documentUri: string;
}

export interface EntityGuidToken {
	guid: string;
	range: {
		start: number;
		end: number;
	};
	markdownString?: string;
	entity: Entity;
	url: string;
	metadata: {
		found: boolean;
	};
}
export interface EditorEntityGuidsResponse {
	items: EntityGuidToken[];
}

export const GetEditorEntityGuidsRequestType = new RequestType<
	EditorEntityGuidsRequest,
	EditorEntityGuidsResponse,
	void,
	void
>("codestream/document/parse/newrelic/entity");

export interface GetAllAccountsRequest {
	force?: boolean;
}
export interface Account {
	id: number;
	name: string;
}

export interface GetAllAccountsResponse {
	accounts: Account[];
}

export const GetAllAccountsRequestType = new RequestType<
	GetAllAccountsRequest,
	GetAllAccountsResponse,
	void,
	void
>("codestream/newrelic/accounts/all");

export interface GetObservabilityErrorAssignmentsRequest {}

export interface GetObservabilityErrorAssignmentsResponse {
	items: ObservabilityErrorCore[];
}

export const GetObservabilityErrorAssignmentsRequestType = new RequestType<
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsResponse,
	void,
	void
>("codestream/newrelic/assignments");

export interface GetObservabilityErrorGroupMetadataRequest {
	errorGroupGuid?: string;
	entityGuid?: string;
	traceId?: string;
	lastSeenAt?: number;
}

export interface GetObservabilityErrorGroupMetadataResponse {
	occurrenceId?: string;
	entityId?: string;
	remote?: string;
	relatedRepos: RelatedRepoWithRemotes[];
	stackSourceMap?: string;
	traceId?: string;
}

export const GetObservabilityErrorGroupMetadataRequestType = new RequestType<
	GetObservabilityErrorGroupMetadataRequest,
	GetObservabilityErrorGroupMetadataResponse,
	void,
	void
>("codestream/newrelic/errorGroup/metadata");

export interface FileLevelTelemetryRequestOptions {
	includeThroughput?: boolean;
	includeAverageDuration?: boolean;
	includeErrorRate?: boolean;
}

export interface FunctionLocator {
	// example CodeStream.VisualStudio.CodeLens.VisualStudioConnection.Refresh
	namespace?: string; // CodeStream.VisualStudio.CodeLens
	namespaces?: string[];
	// className?: string; // VisualStudioConnection
	functionName?: string; // Refresh
}

export interface GetFileLevelTelemetryRequest {
	fileUri: string;
	languageId: string;
	/** if true, this request will reset the cache */
	resetCache?: boolean;
	locator?: FunctionLocator;
	options?: FileLevelTelemetryRequestOptions;
}

export interface GetMethodLevelTelemetryRequest {
	/** CodeStream repoId */
	repoId?: string;
	/** entity id of the NewRelic entity */
	newRelicEntityGuid: string;
	/** contains the specific formatting of a metricTimesliceName for a golden metric type */
	metricTimesliceNameMapping?: MetricTimesliceNameMapping;
	/** contains identifiers used to find method level errors */
	functionIdentifiers?: {
		codeNamespace?: string;
		functionName?: string;
		relativeFilePath?: string;
	};
	scope?: string;
	since?: string;
	timeseriesGroup?: string;
	includeDeployments?: boolean;
	includeErrors?: boolean;
}

export interface GetEntityCountRequest {
	force?: boolean;
}

export interface GetEntityCountResponse {
	entityCount: number;
}

// For returning errors as a part of a graph - for example on GetServiceLevelTelemetry
// which is made of responses from multiple calls and each one can fail with a
// different error - as opposed to ResponseError which you throw to indicate
// a whole response failed.
export const NRErrorTypes = [
	"NOT_ASSOCIATED",
	"NR_TIMEOUT",
	"NOT_CONNECTED",
	"NR_GENERIC",
	"NR_UNKNOWN",
	"GENERIC",
	"INTERNAL_RATE",
	"INTERNAL_RATE_FORCE_LOGOUT",
] as const;

export type NRErrorType = (typeof NRErrorTypes)[number];

export interface NRErrorResponse {
	isConnected?: boolean;
	repo?: {
		id: string;
		name: string;
		remote: string;
	};
	error: {
		message?: string;
		stack?: string;
		type: NRErrorType;
	};
}

export function isNRErrorResponse(error: unknown): error is NRErrorResponse {
	const err = error as NRErrorResponse | undefined;
	if (!err?.error || !err.error.type) {
		return false;
	}
	return NRErrorTypes.includes(err.error.type);
}

export interface GetServiceLevelTelemetryRequest {
	/** CodeStream repoId */
	repoId: string;
	/** entity id of the NewRelic entity */
	newRelicEntityGuid: string;
	metricTimesliceNameMapping?: MetricTimesliceNameMapping;
	/** related service needs less data, skips redundant call */
	skipRepoFetch?: boolean;
	fetchRecentIssues?: boolean;
	force?: boolean;
	isServiceSearch?: boolean;
}

export interface UpdateAzureFullNameRequest {
	fullName: string;
}

export interface GetServiceLevelObjectivesRequest {
	/** entity id of the NewRelic entity */
	entityGuid: string;
}

export interface GetAlertViolationsRequest {}

export type MetricTimesliceNameMapping = {
	duration: string;
	sampleSize: string;
	errorRate: string;
	source: string;
};

export interface FileLevelTelemetryMetric {
	// metricTimesliceName: string;
	facet: string[];
	namespace?: string;
	className?: string;
	lineno?: number;
	column?: number;
	commit?: string;
	functionName?: string;
	anomaly?: ObservabilityAnomaly;
}

export interface FileLevelTelemetryAverageDuration extends FileLevelTelemetryMetric {
	averageDuration: number;
}

export interface FileLevelTelemetrySampleSize extends FileLevelTelemetryMetric {
	sampleSize: number;
	source: string;
}

export interface FileLevelTelemetryErrorRate extends FileLevelTelemetryMetric {
	errorRate: number;
}

export interface GetFileLevelTelemetryResponse {
	repo: {
		id: string;
		name: string;
		remote: string;
	};
	isConnected?: boolean;
	sampleSize?: FileLevelTelemetrySampleSize[];
	averageDuration?: FileLevelTelemetryAverageDuration[];
	errorRate?: FileLevelTelemetryErrorRate[];
	lastUpdateDate?: number;
	hasAnyData?: boolean;
	sinceDateFormatted?: string;
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
	newRelicEntityName?: string;
	newRelicUrl?: string;
	newRelicEntityAccounts: EntityAccount[];
	newRelicAlertSeverity?: string;
	codeNamespace?: string;
	relativeFilePath: string;
	deploymentCommit?: string;
	error?: {
		message?: string;
		type?: "NOT_CONNECTED" | "NOT_ASSOCIATED";
	};
}

export interface GetServiceLevelObjectivesResponse {
	serviceLevelObjectives?: ServiceLevelObjectiveResult[];
	error?: NRErrorResponse;
}

export interface GetMethodLevelTelemetryResponse {
	newRelicEntityGuid: string;
	newRelicUrl?: string;
	goldenMetrics?: MethodGoldenMetrics[];
	deployments?: Deployment[];
	criticalPath?: CriticalPathSpan[];
	errors?: ObservabilityError[];
	slowestQueries?: DbQuery[];
	newRelicAlertSeverity?: string;
	newRelicEntityAccounts: EntityAccount[];
	newRelicEntityName: string;
}

export interface UpdateAzureFullNameResponse {
	fullName: string;
}

export interface GetServiceLevelTelemetryResponse {
	newRelicEntityGuid: string;
	newRelicUrl?: string;
	entityGoldenMetrics?: EntityGoldenMetrics | NRErrorResponse;
	newRelicAlertSeverity?: string;
	newRelicEntityAccounts: EntityAccount[];
	newRelicEntityName?: string;
	recentIssues?: GetIssuesResponse | NRErrorResponse;
}

export interface GetAlertViolationsResponse {
	name?: string;
	guid?: string;
	permalink?: string;
	recentAlertViolations?: RecentAlertViolation[];
}

export interface GetIssuesResponse {
	recentIssues?: RecentIssue[];
}

export interface SpanLineChartDataValue {
	beginTimeSeconds: number;
	endTimeSeconds: number;
	value: number;
}

/*export interface SpanLineChartData {
	thisHost: SpanLineChartDataValue[];
	allHosts: SpanLineChartDataValue[];
}*/
export type SpanLineChartData = SpanLineChartDataPoint[];

export interface SpanLineChartDataPoint {
	endTimeMs: number;
	thisHost?: number;
	allHosts?: number;
}

/*export interface SpanHistogramData {
	bucketSize: number;
	minValue: number;
	maxValue: number;
	values: number[];
}*/
export type SpanHistogramData = SpanHistogramDataPoint[];

export interface SpanHistogramDataPoint {
	durationRange: string;
	count: number;
}

export interface GetSpanChartDataRequest {
	accountId: number;
	entityGuid: string;
	spanName: string;
	spanHost: string;
	timeRange: string;
}

export interface GetSpanChartDataResponse {
	responseTime: SpanLineChartDataPoint[];
	throughput: SpanLineChartDataPoint[];
	duration: SpanHistogramDataPoint[];
}

export const GetSpanChartDataRequestType = new RequestType<
	GetSpanChartDataRequest,
	GetSpanChartDataResponse,
	void,
	void
>("codestream/newrelic/spanChartData");

export interface CriticalPathSpan {
	name: string;
	duration: number;
}

export interface DbQuery {
	statement: string;
	duration: number;
}

export interface Deployment {
	seconds: number;
	version: string;
	commit?: string;
}

export interface GetDeploymentsRequest {
	entityGuid: string;
	since?: string;
}

export interface GetDeploymentsResponse {
	deployments: Deployment[];
}

export const GetDeploymentsRequestType = new RequestType<
	GetDeploymentsRequest,
	GetDeploymentsResponse,
	void,
	void
>("codestream/newrelic/deployments");

// Not yet LSP but might be someday
export interface GetLatestDeploymentRequest {
	entityGuid: string;
}

export interface GetLatestDeploymentResponse {
	deployment: Deployment;
}

export const GetFileLevelTelemetryRequestType = new RequestType<
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryResponse,
	void,
	void
>("codestream/newrelic/fileLevelTelemetry");

export const GetMethodLevelTelemetryRequestType = new RequestType<
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryResponse,
	void,
	void
>("codestream/newrelic/methodLevelMethodTelemetry");

export const GetServiceLevelTelemetryRequestType = new RequestType<
	GetServiceLevelTelemetryRequest,
	GetServiceLevelTelemetryResponse,
	void,
	void
>("codestream/newrelic/serviceLevelTelemetry");

export const UpdateAzureFullNameRequestType = new RequestType<
	UpdateAzureFullNameRequest,
	UpdateAzureFullNameResponse,
	void,
	void
>("codestream/newrelic/azureFullName");

export const GetServiceLevelObjectivesRequestType = new RequestType<
	GetServiceLevelObjectivesRequest,
	GetServiceLevelObjectivesResponse,
	void,
	void
>("codestream/newrelic/serviceLevelObjectives");

export const GetAlertViolationsRequestType = new RequestType<
	GetAlertViolationsRequest,
	GetAlertViolationsResponse,
	void,
	void
>("codestream/newrelic/alertViolations");

export const GetEntityCountRequestType = new RequestType<
	GetEntityCountRequest,
	GetEntityCountResponse,
	void,
	void
>("codestream/newrelic/entityCount");

export interface CrashOrException {
	message?: string;
	stackTrace: StackTrace;
}

export interface EntityCrash extends CrashOrException {}

export interface EntityException extends CrashOrException {}

interface StackTrace {
	frames: { filepath?: string; line?: number; name?: string; formatted: string }[];
}

export interface ErrorGroupStateType {
	type: string;
}

export interface ErrorGroupResponse {
	actor: {
		account: {
			name: string;
		};
		entity: {
			alertSeverity: "CRITICAL" | "NOT_ALERTING" | "NOT_CONFIGURED" | "WARNING" | undefined;
			name: string;
			exception?: EntityException;
			crash?: EntityCrash;
			relatedEntities: {
				results: any[];
			};
			relatedRepos: RelatedRepository[] | BuiltFromResult[];
		};
		errorsInbox: {
			errorGroupStateTypes?: ErrorGroupStateType[];
			errorGroups: {
				results: ErrorGroup[];
			};
		};
	};
}

export interface StackTraceResponse {
	actor: {
		entity: {
			entityType: string;
			// we will have an exception or a crash
			exception?: EntityException;
			crash?: EntityCrash;
		};
	};
}

/**
 * Entity.type
 *
 * NOTE: this is not a complete list
 */
type Type =
	| "APPLICATION"
	| "AWSLAMBDAFUNCTION"
	| "AWS_ELASTICSEARCH"
	| "AWS_LAMBDA"
	| "BUILT_FROM"
	| "AWS_SQS_QUEUE"
	| "CLUSTER"
	| "CONTAINER"
	| "DATABASE"
	| "EXTERNAL"
	| "HOST"
	| "REPOSITORY"
	| "SERVICE"
	| "USER";

/**
 * Entity.entityType
 */
export type EntityTypeKey =
	| "APM_APPLICATION_ENTITY"
	| "APM_DATABASE_INSTANCE_ENTITY"
	| "APM_EXTERNAL_SERVICE_ENTITY"
	| "BROWSER_APPLICATION_ENTITY"
	| "DASHBOARD_ENTITY"
	| "EXTERNAL_ENTITY"
	| "GENERIC_ENTITY"
	| "GENERIC_INFRASTRUCTURE_ENTITY"
	| "INFRASTRUCTURE_AWS_LAMBDA_FUNCTION_ENTITY"
	| "INFRASTRUCTURE_HOST_ENTITY"
	| "KEY_TRANSACTION_ENTITY"
	| "MOBILE_APPLICATION_ENTITY"
	| "SECURE_CREDENTIAL_ENTITY"
	| "SYNTHETIC_MONITOR_ENTITY"
	| "TEAM"
	| "THIRD_PARTY_SERVICE_ENTITY"
	| "UNAVAILABLE_ENTITY"
	| "WORKLOAD_ENTITY";

export type EntityType = EntityTypeKey;

export const EntityTypeMap: Record<EntityTypeKey, string> = {
	APM_APPLICATION_ENTITY: "APM Application",
	APM_DATABASE_INSTANCE_ENTITY: "APM Database",
	APM_EXTERNAL_SERVICE_ENTITY: "APM External",
	BROWSER_APPLICATION_ENTITY: "Browser",
	DASHBOARD_ENTITY: "Dashboard",
	EXTERNAL_ENTITY: "External",
	GENERIC_ENTITY: "Generic",
	GENERIC_INFRASTRUCTURE_ENTITY: "Generic Infrastructure",
	INFRASTRUCTURE_AWS_LAMBDA_FUNCTION_ENTITY: "Lambda",
	INFRASTRUCTURE_HOST_ENTITY: "Infrastructure Host",
	KEY_TRANSACTION_ENTITY: "Key Transaction",
	MOBILE_APPLICATION_ENTITY: "Mobile",
	SECURE_CREDENTIAL_ENTITY: "Secure Credential",
	SYNTHETIC_MONITOR_ENTITY: "Synthetic Monitor",
	TEAM: "Team",
	THIRD_PARTY_SERVICE_ENTITY: "OTEL",
	UNAVAILABLE_ENTITY: "Unavailable",
	WORKLOAD_ENTITY: "Workload",
};

export interface Entity {
	accountId?: number;
	account?: {
		name: string;
		id: number;
	};
	domain?: string;
	alertSeverity?: string;
	goldenMetrics?: { metrics?: MethodGoldenMetrics[] };
	guid: string;
	name: string;
	type?: string;
	entityType?: EntityType;
	tags?: {
		key: string;
		values: string[];
	}[];
}

export interface ErrorGroupsResponse {
	actor: {
		errorsInbox: {
			errorGroups: {
				results: {
					url: string;
					state: string;
					name: string;
					message: string;
					id: string;
					entityGuid: string;
					lastSeenAt: number;
				}[];
			};
		};
	};
}

export interface RelatedEntity {
	source: {
		entity: Entity;
	};
	target: {
		entity: Entity;
	};
	type: Type;
}

export interface RelatedEntityByType {
	alertSeverity: string;
	guid: string;
	name: string;
	type: string;
	domain: string;
	accountName?: string;
}

export interface RelatedEntitiesByType extends Array<RelatedEntityByType> {}

export interface RelatedEntities extends Array<RelatedEntity> {}

export interface EntitySearchResponse {
	actor: {
		entitySearch: {
			results: {
				entities: Entity[];
			};
		};
	};
	region?: string;
}

export interface BuiltFromResult {
	name?: string;
	url?: string;
	error?: {
		message?: string;
	};
}

export interface RelatedRepoWithRemotes {
	name?: string;
	url?: string;
	remotes?: string[];
	error?: {
		message?: string;
	};
}

export interface RelatedRepository {
	length: number;
	url?: string;
	name?: string;
}

export interface ErrorGroup {
	id: string;
	state?: string;
	message: string;
	name: string;
	entityGuid: string;
	url: string;
	/**
	 * Returns a query for fetching TransactionError results
	 */
	eventsQuery?: string;
	lastSeenAt?: number;
	assignment?: {
		email: string;
		userInfo: {
			gravatar: string;
			id: number;
			name: string;
		};
	};
}

export interface ProviderGetForkedReposResponse {
	parent?: {
		defaultBranchRef?: {
			name: string;
		};
		forks?: any[];
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		parent?: {
			id?: string;
			name?: string;
			nameWithOwner?: string;
		};
		refs?: {
			nodes?: any[];
		};
		url?: string;
	};
	forks?: {
		defaultBranchRef?: {
			name: string;
		};
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		refs?: {
			nodes?: any[];
		};
	}[];
	self?: {
		defaultBranchRef?: {
			name: string;
		};
		forks?: any[];
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		parent?: {
			id?: string;
			name?: string;
			nameWithOwner?: string;
		};
		refs?: {
			nodes?: any[];
		};
		url?: string;
	};
	error?: { message?: string; type: string };
}

export interface MethodLevelGoldenMetricQueryResult {
	metricQueries: {
		metricQuery: string;
		spanQuery?: string;
		scopesQuery: string;
		title: string;
		name: string;
	}[];
}

export interface GetAlertViolationsQueryResult {
	actor: {
		entity: {
			name: string;
			permalink: string;
			recentAlertViolations: RecentAlertViolation[];
		};
	};
}

export interface GetEntityFromGuid {
	alertSeverity: string;
	entityName: string;
	entityGuid: string;
}

export interface GetIssuesQueryResult {
	actor?: {
		account?: {
			aiIssues?: {
				issues?: {
					issues?: {
						title?: string;
						eventType?: string;
						mergeReason?: string;
						url?: string;
						conditionName?: string[];
						unAcknowledgedBy?: string | null;
						totalIncidents?: number;
						entityNames?: string[];
						parentMergeId?: any;
						entityTypes?: string[];
						acknowledgedAt?: number;
						correlationRuleDescriptions?: any;
						unAcknowledgedAt?: number;
						entityGuids?: [];
						conditionProduct?: string[];
						closedAt?: number;
						updatedAt?: number;
						accountIds?: string[];
						closedBy?: string | null;
						mutingState?: string;
						createdAt?: number;
						activatedAt?: number;
						origins?: string[];
						isCorrelated?: boolean;
						isIdle?: boolean;
						issueId?: string;
						conditionFamilyId?: number[];
						description?: string[];
						correlationRuleNames?: any;
						acknowledgedBy?: any;
						policyIds?: string[];
						priority?: string;
						sources?: string[];
						policyName?: string[];
						correlationRuleIds?: any;
						state?: string;
						incidentIds?: string[];
					}[];
				};
			};
		};
	};
}

export interface RecentAlertViolation {
	agentUrl: string;
	alertSeverity: string;
	closedAt: string;
	label: string;
	level: string;
	openedAt: string;
	violationId: string;
	violationUrl: string;
}

export interface RecentIssue {
	title?: string;
	url?: string;
	closedAt?: number;
	updatedAt?: number;
	createdAt: number;
	priority?: string;
	issueId?: string;
}

export interface GoldenMetric {
	definition: {
		from: string;
		select: string;
		where?: string;
	};
	name: string;
	title: string;
	unit: string;
}

export interface GoldenMetrics {
	metrics: GoldenMetric[];
}

export interface EntityGoldenMetricsQueries {
	actor: {
		entity: {
			goldenMetrics: GoldenMetrics;
		};
	};
}

export interface EntityGoldenMetricsResults {
	actor: {
		entity: {
			[name: string]: {
				results: {
					result?:
						| number
						| {
								[name: string]: number;
						  };
				}[];
			};
		};
	};
}

interface UnitMappings {
	[name: string]: string;
}

export const GoldenMetricUnitMappings: UnitMappings = {
	APDEX: "apdex",
	BITS: "bits",
	BITS_PER_SECOND: "bits/s",
	BYTES: "bytes",
	BYTES_PER_SECOND: "bytes/s",
	CELSIUS: "C",
	COUNT: "",
	HERTZ: "Hz",
	MESSAGES_PER_SECOND: "messages/s",
	MS: "ms",
	OPERATIONS_PER_SECOND: "operations/s",
	PAGES_PER_SECOND: "pages/s",
	PERCENTAGE: "%",
	REQUESTS_PER_MINUTE: "req/m",
	REQUESTS_PER_SECOND: "req/s",
	SECONDS: "s",
	TIMESTAMP: "time",
};

export interface GoldenMetricsQueries {
	/**
	 * The TIMESERIES query for a golden metric (e.g. `SELECT average(duration) FROM Transaction TIMESERIES`)
	 */
	timeseries: string;
	/**
	 * The default query for a golden metric (e.g. `SELECT average(duration) FROM Transaction`)
	 */
	default?: string;
}

export interface DeploymentDiff {
	errorRateData?: {
		percentChange: number | undefined;
		permalinkUrl: string;
	};
	responseTimeData?: {
		percentChange: number | undefined;
		permalinkUrl: string;
	};
}

export interface EntityGoldenMetrics {
	lastUpdated: string;
	/**
	 * Adds a timeframe value for the UI to show (30 minutes, 2 days, etc.)
	 */
	since: string;
	metrics: {
		queries?: GoldenMetricsQueries;
		name: "errorRate" | "responseTimeMs" | "throughput" | string;
		title: string;
		unit: string;
		displayUnit: string;
		value: number;
		displayValue: string;
	}[];
	pillsData?: DeploymentDiff;
}

export interface MethodGoldenMetricsResult {
	beginTimeSeconds?: number;
	endDate?: Date;
	endTimeSeconds?: number;

	/* old/deprecated -- used in CLM[?], but let's move to the new props*/
	"Error %"?: string;
	"Error rate"?: number;
	"Error Rate"?: number;
	"Response Time Ms"?: number | undefined;
	"Response time (ms)"?: number | undefined;
	Throughput?: number;
	/* end old */

	/* new */
	throughput?: number;
	errorRate?: number;
	responseTimeMs?: number;
	/* end new  */
}

export interface MethodGoldenMetrics {
	/** the NR query we are running */
	query?: string;
	/** this name is more like a "key" */
	name: "responseTimeMs" | "throughput" | "errorRate" | string;
	/** this title field is deprecated. use `name`as a query "key" and set the title with calling code */
	title?: "Error Rate" | "Throughput" | "Response Time Ms" | string | undefined;
	result: MethodGoldenMetricsResult[];
	scopes?: {
		name: string;
		value: number;
	}[];
	timeWindow: number;
	extrapolated?: boolean;
}

export interface ServiceLevelObjectiveResult {
	guid: string;
	name: string;
	target: string;
	actual: string;
	timeWindow: string;
	result: "UNDER" | "OVER";
	summaryPageUrl: string;
}

export interface RelatedEntityByRepositoryGuidsResult {
	actor: {
		entities: {
			relatedEntities: {
				results: RelatedEntity[];
			};
		}[];
	};
}

export const riskSeverityList = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN", "INFO"] as const;

export type RiskSeverity = (typeof riskSeverityList)[number];

export const severityList = ["CRITICAL", "HIGH", "MODERATE", "LOW"] as const;

export type SeverityType = (typeof severityList)[number];

export type GetLibraryDetailsRequest = {
	entityGuid: string;
	accountId: number;
	severityFilter?: Array<RiskSeverity>;
	rows?: number | "all";
};

export type Vulnerability = {
	cveId: string;
	title: string;
	url: string;
	vector: string;
	description: string;
	score: number;
	severity: SeverityType;
};

export type LibraryDetails = {
	name: string;
	version: string;
	suggestedVersion?: string;
	highestScore: number;
	highestSeverity: SeverityType;
	language?: string;
	vulnerabilities: Array<Vulnerability>;
};

export type GetLibraryDetailsResponse = {
	libraries: Array<LibraryDetails>;
	recordCount: number;
	totalRecords: number;
};

export const GetLibraryDetailsType = new RequestType<
	GetLibraryDetailsRequest,
	GetLibraryDetailsResponse,
	void,
	void
>("codestream/newrelic/libraryDetails");

export interface CheckTrunkRequest {
	cwd: string;
	forceCheck: boolean;
}

export interface CheckTrunkResponse {
	results: TrunkCheckResults;
}

export const CheckTrunkRequestType = new RequestType<
	CheckTrunkRequest,
	CheckTrunkResponse,
	void,
	void
>("codestream/trunk/check");

export const DidChangeCodelensesNotificationType = new NotificationType<void, void>(
	"codestream/didChangeCodelenses"
);

export interface DidDetectObservabilityAnomaliesNotification {
	entityGuid: string;
	duration: ObservabilityAnomaly[];
	errorRate: ObservabilityAnomaly[];
}

export const DidDetectObservabilityAnomaliesNotificationType = new NotificationType<
	DidDetectObservabilityAnomaliesNotification,
	void
>("codestream/didDetectObservabilityAnomalies");

export interface GetLoggingEntitiesResponse {
	totalResults: number;
	entities: EntityAccount[];
	nextCursor?: string;
}

// reusing request type - internally we're just omitting a filter
export const GetLoggingEntitiesRequestType = new RequestType<
	GetObservabilityEntitiesRequest,
	GetLoggingEntitiesResponse,
	void,
	void
>("codestream/newrelic/logs/entities");

export interface GetLogsRequest {
	entity: EntityAccount;
	traceId?: string;
	partitions: string[];
	filterText: string;
	order: {
		field: string;
		direction: string;
	};
	since: string;
	limit: number | "MAX";
}

export interface LogResult {
	[key: string]: string;
}

export const LogResultSpecialColumns = {
	message: "__cs_message",
	severity: "__cs_severity",
	summary: "__cs_log_summary",
};

export interface GetLogsResponse {
	logs?: LogResult[];
	accountId: number;
	error?: NRErrorResponse;
}

export const GetLogsRequestType = new RequestType<GetLogsRequest, GetLogsResponse, void, void>(
	"codestream/newrelic/logs/search"
);

export interface GetSurroundingLogsRequest {
	entity: EntityAccount;
	messageId: string;
	since: number;
}

export interface GetSurroundingLogsResponse {
	beforeLogs?: LogResult[];
	afterLogs?: LogResult[];
	error?: NRErrorResponse;
}

export const GetSurroundingLogsRequestType = new RequestType<
	GetSurroundingLogsRequest,
	GetSurroundingLogsResponse,
	void,
	void
>("codestream/newrelic/logs/surrounding");

export interface GetLogFieldDefinitionsRequest {
	entity: EntityAccount;
}

export interface LogFieldDefinition {
	key?: string;
	type?: "string" | "boolean" | "numeric";
}

export interface GetLogFieldDefinitionsResponse {
	logDefinitions?: LogFieldDefinition[];
	error?: NRErrorResponse;
}

export const GetLogFieldDefinitionsRequestType = new RequestType<
	GetLogFieldDefinitionsRequest,
	GetLogFieldDefinitionsResponse,
	void,
	void
>("codestream/newrelic/logs/fieldDefinitions");

export interface GetLoggingPartitionsRequest {
	accountId: number;
}

export interface GetLoggingPartitionsResponse {
	partitions?: string[];
	error?: NRErrorResponse;
}

export const GetLoggingPartitionsRequestType = new RequestType<
	GetLoggingPartitionsRequest,
	GetLoggingPartitionsResponse,
	void,
	void
>("codestream/newrelic/logs/partitions");

export interface SaveRecentQueryRequest {
	accountId?: number;
	query: string;
}

export interface SaveRecentQueryResponse {
	createdAt?: number;
}

export interface GetNRQLRequest {
	accountId: number;
	query: string;
}

export interface NRQLResult {
	[key: string]: string;
}

export interface GetNRQLResponse {
	results?: NRQLResult[];
	accountId: number;
	metadata?: {
		facet?: string[];
		eventType?: string;
		since?: string;
		hasAlias: boolean;
	};
	error?: NRErrorResponse;
	resultsTypeGuess?: ResultsTypeGuess;
}

export interface ResultsTypeGuess {
	selected?: string;
	enabled?: string[];
}

export const GetNRQLRequestType = new RequestType<GetNRQLRequest, GetNRQLResponse, void, void>(
	"codestream/newrelic/nrql/search"
);

export interface GetNRQLConstantsRequest {}

export interface GetNRQLConstantsResponse {
	operators: CompletionItem[];
	keywords: CompletionItem[];
	functions: CompletionItem[];
}

export const GetNRQLConstantsRequestType = new RequestType<
	GetNRQLConstantsRequest,
	GetNRQLConstantsResponse,
	void,
	void
>("codestream/newrelic/nrql/constants");

export interface GetNRQLCollectionsRequest {}
export interface GetNRQLCollectionsResponse {
	list: string[];
	obj: any;
}
export const GetNRQLCollectionsRequestType = new RequestType<
	GetNRQLCollectionsRequest,
	GetNRQLCollectionsResponse,
	void,
	void
>("codestream/newrelic/nrql/collections");

export interface GetNRQLColumnsRequest {
	/**
	 * The user-entered query (unmodified)
	 */
	query?: string;
	/**
	 * The name of a specific collection
	 */
	collectionName?: string;
}
export interface GetNRQLColumnsResponse {
	columns: string[];
}
export const GetNRQLColumnsRequestType = new RequestType<
	GetNRQLColumnsRequest,
	GetNRQLColumnsResponse,
	void,
	void
>("codestream/newrelic/nrql/columns");

export interface GetNRQLCompletionItemsRequest {
	/**
	 * This may refer to an entire query or a single line in a multi-line or multi-queries in a file
	 */
	query?: string;
	textDocumentPosition?: TextDocumentPositionParams;
}

export interface GetNRQLCompletionItemsResponse {
	items: CompletionItem[];
}
export const GetNRQLCompletionItemsType = new RequestType<
	GetNRQLCompletionItemsRequest,
	GetNRQLCompletionItemsResponse,
	void,
	void
>("codestream/newrelic/nrql/completions");

export interface NRQLRecentQuery {
	/**
	 * Recent, runnable, query from the current user
	 */
	query: string;
	accounts: Account[];
	createdAt: number;
	dayString?: string;
}

export interface GetNRQLRecentQueriesRequest {}
export interface GetNRQLRecentQueriesResponse {
	items: NRQLRecentQuery[];
}
export const GetNRQLRecentQueriesType = new RequestType<
	GetNRQLRecentQueriesRequest,
	GetNRQLRecentQueriesResponse,
	void,
	void
>("codestream/newrelic/nrql/queries/recent");

export type ApplyPatchRequest = {
	fileUri: string;
	patch: string;
};

export type ApplyPatchResponse = {
	success: boolean;
};

export const ApplyPatchType = new RequestType<ApplyPatchRequest, ApplyPatchResponse, void, void>(
	"codestream/newrelic/applyPatch"
);

export type UserSearchRequest = {
	query?: string;
	nextCursor?: string;
};

export type UserSearchResponse = {
	users: NewRelicUser[];
	nextCursor?: string;
};

export const UserSearchRequestType = new RequestType<
	UserSearchRequest,
	UserSearchResponse,
	void,
	void
>("codestream/newrelic/userSearch");
