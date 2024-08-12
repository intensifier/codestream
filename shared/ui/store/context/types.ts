import {
	EntityAccount,
	MetricTimesliceNameMapping,
	ObservabilityAnomaly,
} from "@codestream/protocols/agent";
import { CodemarkType, WebviewPanels } from "@codestream/protocols/api";

import { NewPullRequestBranch } from "@codestream/protocols/webview";
import { WebviewContext, WebviewModals } from "@codestream/webview/ipc/webview.protocol.common";
import { AnyObject } from "@codestream/webview/utils";

export enum ContextActionsType {
	SetProfileUser = "@context/SetProfileUser",
	SetCodemarkFileFilter = "@context/SetCodemarkFileFilter",
	SetCodemarkTypeFilter = "@context/SetCodemarkTypeFilter",
	SetCodemarkTagFilter = "@context/SetCodemarkTagFilter",
	SetCodemarkBranchFilter = "@context/SetCodemarkBranchFilter",
	SetCodemarkAuthorFilter = "@context/SetCodemarkAuthorFilter",
	SetChannelFilter = "@context/SetChannelFilter",
	SetContext = "@context/Set",
	SetTeamlessContext = "@context/Teamless/Set",
	OpenPanel = "@context/OpenPanel",
	ClosePanel = "@context/ClosePanel",
	OpenModal = "@context/OpenModal",
	CloseModal = "@context/CloseModal",
	SetFocusState = "@context/SetFocusState",
	SetCurrentStream = "@context/SetCurrentStream",
	SetIssueProvider = "@context/SetIssueProvider",
	SetRefreshAnomalies = "@context/SetRefreshAnomalies",
	SetCodemarksFileViewStyle = "@context/SetCodemarksFileViewStyle",
	SetCodemarksShowArchived = "@context/SetCodemarksShowArchived",
	SetCodemarksShowResolved = "@context/SetCodemarksShowResolved",
	SetCodemarksWrapComments = "@context/SetCodemarksWrapComments",
	SetChannelsMuteAll = "@context/SetChannelsMuteAll",
	SetShowFeedbackSmiley = "@context/SetShowFeedbackSmiley",
	SetNewPostEntryPoint = "@context/SetNewPostEntryPoint",
	SetNewPostDefaultText = "@context/SetNewPostDefaultText",
	SetRoute = "@context/SetRoute",
	SetChatProviderAccess = "@context/SetChatProviderAccess",
	SetCurrentCodemark = "@context/SetCurrentCodemark",
	SetComposeCodemarkActive = "@context/SetComposeCodemarkActive",
	RepositionCodemark = "@context/RepositionCodemark",
	SetCurrentReview = "@context/SetCurrentReview",
	SetCurrentReviewOptions = "@context/SetCurrentReviewOptions",
	SetCurrentCodeErrorData = "@context/SetCurrentCodeErrorData",
	SetCurrentRepo = "@context/SetCurrentRepo",
	SetCreatePullRequest = "@context/SetCreatePullRequest",
	SetCurrentPullRequest = "@context/SetCurrentPullRequest",
	SetCurrentOrganizationInvite = "@context/SetCurrentOrganizationInvite",
	SetCurrentPullRequestNeedsRefresh = "@context/SetCurrentPullRequestNeedsRefresh",
	SetCurrentErrorsInboxOptions = "@context/SetCurrentErrorsInboxOptions",
	SetCurrentInstrumentationOptions = "@context/SetCurrentInstrumentationOptions",
	SetCurrentServiceSearchEntity = "@context/SetCurrentServiceSearchEntity",
	SetCurrentPixieDynamicLoggingOptions = "@context/SetCurrentPixieDynamicLoggingOptions",
	SetCurrentPullRequestAndBranch = "@context/SetCurrentPullRequestAndBranch",
	SetNewPullRequestOptions = "@context/SetNewPullRequestOptions",
	SetStartWorkCard = "@context/SetStartWorkCard",
	SetIsFirstPageview = "@context/SetIsFirstPageview",
	SetPendingProtocolHandlerUrl = "@context/SetPendingProtocolHandlerUrl",
	SetCurrentMethodLevelTelemetry = "@context/SetCurrentMethodLevelTelemetry",
	SetCurrentObservabilityAnomaly = "@context/SetCurrentObservabilityAnomaly",
	SetEntityAccounts = "@context/SetEntityAccounts",
	SetCurrentTransactionSpan = "@context/SetCurrentTransactionSpan",
	SetCurrentAPMLoggingSearchContext = "@context/SetCurrentObservabilityLogSearchContext",
	SetCurrentEntityGuid = "@context/SetCurrentEntityGuid",
}

/**
 * This can also be any Titled Cased panel name
 */
export type PostEntryPoint =
	| "Stream"
	| "Global Nav"
	| "Spatial View"
	| "VSC SCM"
	| "Status"
	| "Advanced"
	| string
	| undefined;

export interface ContextState extends WebviewContext {
	channelFilter: string;
	channelsMuteAll: boolean;

	codemarkFileFilter: string; // TODO: specify types
	codemarkTypeFilter: string;
	codemarkTagFilter: string;
	codemarkBranchFilter: string;
	codemarkAuthorFilter: string;
	currentServiceSearchEntity?: string;
	codemarksFileViewStyle: "list" | "inline";
	codemarksShowArchived: boolean;
	codemarksShowResolved: boolean;
	codemarksWrapComments: boolean;

	spatialViewShowPRComments: boolean;

	currentPullRequestNeedsRefresh: {
		needsRefresh: boolean;
		providerId: string;
		pullRequestId: string;
	};

	issueProvider?: string;
	shareTargetTeamId?: string;
	panelStack: (WebviewPanels | string)[];
	activeModal?: WebviewModals;

	showFeedbackSmiley: boolean;

	newPostEntryPoint: PostEntryPoint;
	newPostDefaultText?: string;
	route: RouteState;

	chatProviderAccess: ChatProviderAccess;

	composeCodemarkActive: CodemarkType | undefined;
	currentOrganizationInvite?: any;
	pullRequestCheckoutBranch: boolean;
	newPullRequestOptions?: { branch: NewPullRequestBranch };
	currentInstrumentation?: any;
	currentPixieDynamicLoggingOptions?: {
		functionName: string;
		functionParameters: { name: string }[];
		functionReceiver?: string;
		packageName: string;
	};
	errorsInboxOptions?: { stack?: string; customAttributes?: string; url?: string };

	currentMethodLevelTelemetry?: CurrentMethodLevelTelemetry;
	currentObservabilityAnomaly?: ObservabilityAnomaly;
	currentObservabilityAnomalyEntityGuid?: string;
	currentObservabilityAnomalyEntityName?: string;
	currentTransactionSpan?: CurrentTransactionSpan;

	entityAccounts?: EntityAccount[];

	selectedRegion?: string;
	currentEntityGuid?: string;
}

export type ChatProviderAccess = "strict" | "permissive";

export enum Route {
	NewUser = "newUserEntry",
	Signup = "signup",
	Login = "login",
	OldLogin = "oldLogin", // TODO: remove this when New Relic login is fully supported
	ProviderAuth = "providerAuth",
	NewRelicSignup = "newRelicSignup",
	JoinTeam = "joinTeam",
	EmailConfirmation = "emailConfirmation",
	LoginCodeConfirmation = "loginCodeConfirmation",
	TeamCreation = "teamCreation",
	CompanyCreation = "companyCreation",
	ForgotPassword = "forgotPassword",
	MustSetPassword = "MustSetPassword",
	OktaConfig = "oktaConfig",
}

export interface RouteState {
	name: Route;
	params: AnyObject;
}

export interface CurrentMethodLevelTelemetry {
	newRelicEntityGuid?: string;
	newRelicAccountId?: number;
	languageId: string;
	codeNamespace?: string;
	functionName?: string;
	filePath?: string;
	relativeFilePath?: string;
	metricTimesliceNameMapping?: MetricTimesliceNameMapping;
	error?: {
		message?: string;
		type?: string;
	};
	repo?: {
		id: string;
		name: string;
		remote: string;
	};
}

export interface CurrentTransactionSpan {
	newRelicEntityGuid?: string;
	newRelicAccountId?: number;
	spanId?: string;
	traceId?: string;
	spanName?: string;
	spanHost?: string;
	entityName?: string;
	url?: string;
	language?: string;
	codeNamespace?: string;
	functionName?: string;
	filePath?: string;
	relativeFilePath?: string;
	lineNumber?: string;
	commitSha?: string;
	releaseTag?: string;
	responseTimeChartData?: {
		thisHost: {
			value: number;
			beginTime: number;
			endTime: number;
			inspectedCount: number;
		}[];
		allHosts: {
			value: number;
			beginTime: number;
			endTime: number;
			inspectedCount: number;
		}[];
	};
	throughputChartData?: {
		thisHost: {
			value: number;
			beginTime: number;
			endTime: number;
			inspectedCount: number;
		}[];
		allHosts: {
			value: number;
			beginTime: number;
			endTime: number;
			inspectedCount: number;
		}[];
	};
	spanDurationChartData?: {
		histogram: number[];
		bucketSize: number;
		minValue: number;
		maxValue: number;
	};
}
