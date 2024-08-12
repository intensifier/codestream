"use strict";
import { RequestInit } from "undici";
import { InitializeResult, RequestType, WorkspaceFolder } from "vscode-languageserver-protocol";

import { LoginResponse } from "./agent.protocol.auth";
import { CreateCompanyRequest, CreateCompanyResponse } from "./agent.protocol.companies";
import { ThirdPartyProviders } from "./agent.protocol.providers";
import {
	CSAccessTokenType,
	CSCompany,
	CSMePreferences,
	CSRepository,
	CSStream,
	CSTeam,
	CSUser,
} from "./api.protocol";

export * from "./agent.protocol.asana";
export * from "./agent.protocol.auth";
export * from "./agent.protocol.azuredevops";
export * from "./agent.protocol.bitbucket";
export * from "./agent.protocol.codeErrors";
export * from "./agent.protocol.codemarks";
export * from "./agent.protocol.companies";
export * from "./agent.protocol.documentMarkers";
export * from "./agent.protocol.errors";
export * from "./agent.protocol.fossa";
export * from "./agent.protocol.github";
export * from "./agent.protocol.gitlab";
export * from "./agent.protocol.jira";
export * from "./agent.protocol.linear";
export * from "./agent.protocol.markers";
export * from "./agent.protocol.msteams";
export * from "./agent.protocol.newrelic";
export * from "./agent.protocol.notifications";
export * from "./agent.protocol.nr";
export * from "./agent.protocol.okta";
export * from "./agent.protocol.pixie";
export * from "./agent.protocol.posts";
export * from "./agent.protocol.providers";
export * from "./agent.protocol.repos";
export * from "./agent.protocol.reviews";
export * from "./agent.protocol.scm";
export * from "./agent.protocol.shortcut";
export * from "./agent.protocol.slack";
export * from "./agent.protocol.streams";
export * from "./agent.protocol.teams";
export * from "./agent.protocol.textFiles";
export * from "./agent.protocol.trello";
export * from "./agent.protocol.users";
export * from "./agent.protocol.youtrack";

export interface Capabilities {
	channelMute?: boolean;
	codemarkApply?: boolean;
	codemarkCompare?: boolean;
	codemarkOpenRevision?: boolean;
	editorTrackVisibleRange?: boolean;
	postDelete?: boolean;
	postEdit?: boolean;
	providerCanSupportRealtimeChat?: boolean;
	providerSupportsRealtimeChat?: boolean;
	providerSupportsRealtimeEvents?: boolean;
	reviewDiffs?: boolean;
	services?: {
		/**
		 * deprecated
		 */
		vsls?: boolean;
	};
	vsCodeGithubSignin?: boolean;
	providerReauth?: boolean;
	openLink?: boolean;
}

export enum CodeDelimiterStyles {
	NONE = "none",
	TRIPLE_BACK_QUOTE = "tripleBackQuote",
	SINGLE_BACK_QUOTE = "singleBackQuote",
	HTML_MARKUP = "htmlMarkup",
	HTML_LIGHT_MARKUP = "htmlLightMarkup",
	CODE_BRACE = "codeBrace",
}

export interface AccessToken {
	email: string;
	url: string;
	value: string;
	teamId: string;
	provider?: string;
	providerAccess?: "strict";
	refreshToken?: string;
	tokenType?: CSAccessTokenType;
}

export enum CodeStreamEnvironment {
	Local = "local",
	Production = "prod",
	OnPrem = "onprem",
	RegionUS = "us",
	RegionEU = "eu",
	Unknown = "unknown",
}

export interface CodeStreamEnvironmentInfo {
	environment: CodeStreamEnvironment | string;
	isOnPrem: boolean;
	isProductionCloud: boolean;
	newRelicLandingServiceUrl?: string;
	newRelicApiUrl?: string;
	newRelicSecApiUrl?: string;
	o11yServerUrl?: string;
	telemetryEndpoint?: string;
	environmentHosts?: EnvironmentHost[];
}

export enum TraceLevel {
	Silent = "silent",
	Errors = "errors",
	Verbose = "verbose",
	Debug = "debug",
}

export interface BaseAgentOptions {
	extension: {
		build: string;
		buildEnv: string;
		version: string;
		versionFormatted: string;
	};
	gitPath: string;
	ide: {
		name: string;
		version: string;
		detail: string;
	};
	isDebugging: boolean;
	proxy?: {
		url: string;
		strictSSL: boolean;
	};
	proxySupport?: "override" | "on" | "off";
	serverUrl: string;
	disableStrictSSL?: boolean;
	extraCerts?: string;
	traceLevel: TraceLevel;
	recordRequests?: boolean;
	workspaceFolders?: WorkspaceFolder[];
	machineId?: string;
	newRelicTelemetryEnabled?: boolean;
}

export interface AgentOptions extends BaseAgentOptions {
	email: string;
	passwordOrToken: string | AccessToken;
	signupToken: string;
}

export interface AgentState {
	token: AccessToken;
	capabilities: Capabilities;
	email: string;
	environmentInfo: CodeStreamEnvironmentInfo;
	teamId: string;
	userId: string;
	codemarkId?: string;
	reviewId?: string;
	codeErrorId?: string;
}

export interface AgentInitializeResult extends InitializeResult {
	result: LoginResponse;
}

export interface ApiRequest {
	url: string;
	init?: RequestInit;
	token?: string;
}
export const ApiRequestType = new RequestType<ApiRequest, any, void, void>("codestream/api");

export interface EnvironmentHost {
	name: string;
	shortName: string;
	publicApiUrl: string;
	accessToken?: string;
}

export interface VerifyConnectivityResponse {
	ok: boolean;
	error?: {
		message: string;
		details?: string;
		maintenanceMode?: boolean;
	};
	capabilities?: {
		[key: string]: any;
	};
	environment?: string;
	isOnPrem?: boolean;
	isProductionCloud?: boolean;
	newRelicLandingServiceUrl?: string;
	newRelicApiUrl?: string;
	newRelicSecApiUrl?: string;
	o11yServerUrl?: string;
	telemetryEndpoint?: string;
	environmentHosts?: EnvironmentHost[];
}

export const VerifyConnectivityRequestType = new RequestType<
	void,
	VerifyConnectivityResponse,
	void,
	void
>("codestream/verifyConnectivity");

export interface PollForMaintenanceModeResponse {
	ok?: boolean;
	maintenanceMode?: boolean;
	error?: {
		message: string;
	};
}

export const PollForMaintenanceModeRequestType = new RequestType<
	void,
	PollForMaintenanceModeResponse,
	void,
	void
>("codestream/pollForMaintenanceMode");

export interface BootstrapRequest {}
export interface BootstrapResponse {
	preferences: CSMePreferences;
	repos: CSRepository[];
	streams: CSStream[];
	teams: CSTeam[];
	companies: CSCompany[];
	users: CSUser[];
	providers: ThirdPartyProviders;
}

export const BootstrapRequestType = new RequestType<
	BootstrapRequest,
	BootstrapResponse,
	void,
	void
>("codestream/bootstrap");

export enum ReportingMessageType {
	Error = "error",
	Warning = "warning",
	Info = "info",
	Debug = "debug",
	Fatal = "fatal",
}

export interface ReportMessageRequest {
	type: ReportingMessageType;
	/**
	 * The js Error or js Error object serialized to a json string
	 */
	error?: Error | string | undefined;
	message?: string;
	source: "webview" | "extension" | "agent";
	extra?: object;
}

export const ReportMessageRequestType = new RequestType<ReportMessageRequest, void, void, void>(
	"codestream/reporting/message"
);

export interface ReportBreadcrumbRequest {
	message: string;
	category?: string;
	level?: ReportingMessageType;
	data?: object;
}

export const ReportBreadcrumbRequestType = new RequestType<
	ReportBreadcrumbRequest,
	void,
	void,
	void
>("codestream/reporting/breadcrumb");

export type TelemetryEventName =
	| "codestream/anomaly_link clicked"
	| "codestream/codelens_link clicked"
	| "codestream/codelenses displayed"
	| "codestream/codemarks/share succeeded"
	| "codestream/codemarks/codemark displayed"
	| "codestream/codemarks/slack_sharing failed"
	| "codestream/email_unsubscribe succeeded"
	| "codestream/entity_association succeeded"
	| "codestream/errors/error_group displayed"
	| "codestream/errors/error_group_roadblock displayed"
	| "codestream/errors/error_parsing_stack_trace displayed"
	| "codestream/errors/assignment succeeded"
	| "codestream/errors/status_change succeeded"
	| "codestream/errors/apply_fix_button clicked"
	| "codestream/grok_response created"
	| "codestream/grok_response failed"
	| "codestream/ide selected"
	| "codestream/ide_redirect failed"
	| "codestream/ide_redirect page_viewed"
	| "codestream/instrumentation_wizard/intro displayed"
	| "codestream/instrumentation_wizard/start_button clicked"
	| "codestream/instrumentation_wizard/finish displayed"
	| "codestream/integration/connection succeeded"
	| "codestream/newrelic_link clicked"
	| "codestream/logs/search succeeded"
	| "codestream/logs/expand_button clicked"
	| "codestream/logs/show_surrounding_button clicked"
	| "codestream/logs/webview displayed"
	| "codestream/nrai/error_analysis succeeded"
	| "codestream/nrql/export succeeded"
	| "codestream/nrql/query submitted"
	| "codestream/nrql/visualization changed"
	| "codestream/nrql/webview displayed"
	| "codestream/notifications/repo_following_option changed"
	| "codestream/notifications/service_notification_option changed"
	| "codestream/o11y displayed"
	| "codestream/o11y_fetch failed"
	| "codestream/related_service_link clicked"
	| "codestream/repo_association succeeded"
	| "codestream/repo_association_modal displayed"
	| "codestream/repo_disambiguation succeeded"
	| "codestream/service displayed"
	| "codestream/sign_in page_viewed"
	| "codestream/sign_in_form displayed"
	| "codestream/sign_in_button clicked"
	| "codestream/toast displayed"
	| "codestream/toast_button clicked"
	| "codestream/tracing/span displayed"
	| "codestream/user/login failed"
	| "codestream/user/login succeeded"
	| "codestream/user/switch submitted"
	| "codestream/vulnerability_link clicked";

export interface TelemetryData {
	/** This should not be a string, empty string, or 0. null or undefined is OK */
	account_id?: number;
	/** This should not be an empty string. null or undefined is OK */
	entity_guid?: string;
	event_type:
		| "change"
		| "click"
		| "modal_display"
		| "page_view"
		| "response"
		| "state_load"
		| "submit";
	meta_data?: string;
	meta_data_2?: string;
	meta_data_3?: string;
	meta_data_4?: string;
	meta_data_5?: string;
	session_id?: string;
	target?: string;
	target_text?: string;
	platform?: string;
	path?: string;
	section?: string;
}

/**
 * @param eventName The name of the telemetry event you want to track, eg: "Page Viewed"
 * @param properties Optional properties to pass along with eventName
 */
export interface TelemetryRequest {
	eventName: TelemetryEventName;
	properties?: TelemetryData;
}

export interface TelemetrySetAnonymousIdRequest {
	anonymousId: string;
}

export const TelemetrySetAnonymousIdRequestType = new RequestType<
	TelemetrySetAnonymousIdRequest,
	void,
	void,
	void
>("codestream/telemetry/setAnonymousId");

export const TelemetryRequestType = new RequestType<TelemetryRequest, void, void, void>(
	"codestream/telemetry"
);

export interface GetAnonymousIdRequest {}

export const GetAnonymousIdRequestType = new RequestType<GetAnonymousIdRequest, string, void, void>(
	"codestream/anonymousId"
);

export interface ResolveLocalUriRequest {
	uri: string;
}

export interface ResolveLocalUriResponse {
	uri?: string;
}

export const ResolveLocalUriRequestType = new RequestType<
	ResolveLocalUriRequest,
	ResolveLocalUriResponse,
	void,
	void
>("codestream/uri/resolveLocal");

export interface AgentOpenUrlRequest {
	url: string;
}

export const AgentOpenUrlRequestType = new RequestType<AgentOpenUrlRequest, void, void, void>(
	"codestream/url/open"
);

export interface AgentValidateLanguageExtensionRequest {
	language?: string;
}

export interface AgentValidateLanguageExtensionResponse {
	languageValidationString?: string;
}

export const AgentValidateLanguageExtensionRequestType = new RequestType<
	AgentValidateLanguageExtensionRequest,
	AgentValidateLanguageExtensionResponse,
	void,
	void
>("codestream/language/validate");

export interface AgentFileSearchRequest {
	basePath: string;
	path: string;
}

export interface AgentFileSearchResponse {
	files: string[];
}

export const AgentFileSearchRequestType = new RequestType<
	AgentFileSearchRequest,
	AgentFileSearchResponse,
	void,
	void
>("codestream/files/search");

export interface ResolveStackTracePathsRequest {
	paths: (string | undefined)[];
	language?: string;
}

export interface ResolveStackTracePathsResponse {
	resolvedPaths: (string | undefined)[];
	notImplemented: boolean | undefined;
}

export const ResolveStackTracePathsRequestType = new RequestType<
	ResolveStackTracePathsRequest,
	ResolveStackTracePathsResponse,
	void,
	void
>("codestream/stackTrace/resolvePaths");

export interface AgentFilterNamespacesRequest {
	namespaces: string[];
}

export interface AgentFilterNamespacesResponse {
	filteredNamespaces: string[];
}

export const AgentFilterNamespacesRequestType = new RequestType<
	AgentFilterNamespacesRequest,
	AgentFilterNamespacesResponse,
	void,
	void
>("codestream/namespaces/filter");

export interface SetServerUrlRequest {
	serverUrl: string;
	disableStrictSSL?: boolean;
	environment?: string;
}

export const SetServerUrlRequestType = new RequestType<SetServerUrlRequest, void, void, void>(
	"codestream/set-server"
);

export interface CodeStreamDiffUriData {
	path: string;
	repoId: string;
	baseBranch: string;
	headBranch: string;
	leftSha: string;
	rightSha: string;
	/** Set this to the old file path if it was renamed */
	previousFilePath?: string;
	/** values are `left` or `right` */
	side: string;
	context?: {
		pullRequest?: {
			providerId: string;
			pullRequestReviewId?: string;
			id: string;
		};
	};
}

export interface UploadFileRequest {
	name: string;
	mimetype: string;
	size: number;
	buffer?: string | ArrayBuffer | null;
}

export interface UploadFileResponse {
	url: string;
	name: string;
	mimetype: string;
	size: number;
}

export const UploadFileRequestType = new RequestType<
	UploadFileRequest,
	UploadFileResponse,
	void,
	void
>("codestream/upload/file");

export interface CreateForeignCompanyRequest {
	request: CreateCompanyRequest;
	host: EnvironmentHost;
}

export interface CreateForeignCompanyResponse extends CreateCompanyResponse {
	accessToken: string;
	user?: CSUser;
}

export const CreateForeignCompanyRequestType = new RequestType<
	CreateForeignCompanyRequest,
	CreateForeignCompanyResponse,
	void,
	void
>("codestream/company/createForeign");

export const CodeStreamApiGetRequestType = new RequestType<any, any, void, void>(
	"codestream/api/get"
);
export const CodeStreamApiPostRequestType = new RequestType<any, any, void, void>(
	"codestream/api/post"
);
export const CodeStreamApiPutRequestType = new RequestType<any, any, void, void>(
	"codestream/api/put"
);
export const CodeStreamApiDeleteRequestType = new RequestType<any, any, void, void>(
	"codestream/api/delete"
);
