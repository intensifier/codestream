import {
	ApiVersionCompatibility,
	Capabilities,
	CodeStreamEnvironmentInfo,
	ObservabilityAnomaly,
	ThirdPartyProviders,
	VersionCompatibility,
} from "@codestream/protocols/agent";
import {
	CLMSettings,
	CSApiCapabilities,
	CSCompany,
	CSMarker,
	CSMePreferences,
	CSRepository,
	CSStream,
	CSTeam,
	CSUser,
} from "@codestream/protocols/api";

import { NotificationType, RequestType } from "vscode-jsonrpc";
import { EditorContext, IpcRoutes, SessionState, WebviewContext } from "./webview.protocol.common";

export interface Collaborator {
	id?: string;
	username: string;
	avatar: {
		image?: string;
	};
}

export type IdeNames = "VSC" | "VS" | "JETBRAINS";
export type BrowserEngines = "JCEF" | "JxBrowser" | "DotNetBrowser";

export interface BootstrapInHostResponse {
	capabilities: Capabilities;
	configs: {
		[key: string]: any;
	};
	version: string;
	context: Partial<WebviewContext>;
	environmentInfo?: CodeStreamEnvironmentInfo;
	ide?: {
		name?: IdeNames;
		detail: string | undefined;
	};
	session: SessionState;
	versionCompatibility?: VersionCompatibility | undefined;
	apiVersionCompatibility?: ApiVersionCompatibility | undefined;
	missingCapabilities?: CSApiCapabilities;
	apiCapabilities?: CSApiCapabilities;
}

export const BootstrapInHostRequestType = new RequestType<
	void,
	BootstrapInHostResponse,
	void,
	void
>(`${IpcRoutes.Host}/bootstrap`);

export interface SignedInBootstrapData extends BootstrapInHostResponse {
	editorContext: EditorContext;
	preferences: CSMePreferences;
	repos: CSRepository[];
	streams: CSStream[];
	teams: CSTeam[];
	companies: CSCompany[];
	users: CSUser[];
	providers: ThirdPartyProviders;
}

export enum LogoutReason {
	Unknown = "unknown",
	ReAuthenticating = "reAuthenticating",
	InvalidRefreshToken = "InvalidRefreshToken",
}

export interface LogoutRequest {
	reason?: LogoutReason;
	newServerUrl?: string;
	newEnvironment?: string;
}

export interface LogoutResponse {}
export const LogoutRequestType = new RequestType<LogoutRequest, LogoutResponse, void, void>(
	`${IpcRoutes.Host}/logout`
);

export interface AcceptTOSRequest {
	reason?: LogoutReason;
}

export interface AcceptTOSResponse {}
export const AcceptTOSRequestType = new RequestType<
	AcceptTOSRequest,
	AcceptTOSResponse,
	void,
	void
>(`${IpcRoutes.Host}/acceptTOS`);

export const ReloadWebviewRequestType = new RequestType<void, void, void, void>(
	`${IpcRoutes.Host}/webview/reload`
);

export const RestartRequestType = new RequestType<void, void, void, void>(
	`${IpcRoutes.Host}/restart`
);

export interface CompareMarkerRequest {
	marker: CSMarker;
}
export interface CompareMarkerResponse {}

export const CompareMarkerRequestType = new RequestType<
	CompareMarkerRequest,
	CompareMarkerResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/compare`);

export interface InsertTextRequest {
	text: string;
	marker: CSMarker;
	indentAfterInsert?: boolean;
}

export interface InsertTextResponse {}

export const InsertTextRequestType = new RequestType<
	InsertTextRequest,
	InsertTextResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/inserttext`);

export interface ApplyMarkerRequest {
	marker: CSMarker;
}

export interface ApplyMarkerResponse {}

export const ApplyMarkerRequestType = new RequestType<
	ApplyMarkerRequest,
	ApplyMarkerResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/apply`);

export interface UpdateConfigurationRequest {
	name: string;
	value: any;
}

export interface UpdateConfigurationResponse {}

export const UpdateConfigurationRequestType = new RequestType<
	UpdateConfigurationRequest,
	UpdateConfigurationResponse,
	void,
	void
>(`${IpcRoutes.Host}/configuration/update`);

export interface SaveFileRequest {
	path: string;
	data: any;
}
export interface SaveFileResponse {
	success: boolean;
}

export const SaveFileRequestType = new RequestType<SaveFileRequest, SaveFileResponse, void, void>(
	`${IpcRoutes.Host}/file/save`
);

export interface OpenErrorGroupRequest {
	errorGroupGuid: string;
	occurrenceId: string;
	lastOccurrence: number;
	sessionStart?: number;
	openType: string;
	remote?: string;
	entityId: string;
}
export interface OpenErrorGroupResponse {
	success: boolean;
}

export const OpenErrorGroupRequestType = new RequestType<
	OpenErrorGroupRequest,
	OpenErrorGroupResponse,
	void,
	void
>(`${IpcRoutes.Host}/errorGroup/open`);

export interface OpenInBufferRequest {
	contentType: "json" | "csv";
	data: any;
}
export interface OpenInBufferResponse {
	success: boolean;
}

export const OpenInBufferRequestType = new RequestType<
	OpenInBufferRequest,
	OpenInBufferResponse,
	void,
	void
>(`${IpcRoutes.Host}/buffer/open`);

export interface ShellPromptFolderRequest {
	message: string;
}
export interface ShellPromptFolderResponse {
	path: string | undefined;
}

export const ShellPromptFolderRequestType = new RequestType<
	ShellPromptFolderRequest,
	ShellPromptFolderResponse,
	void,
	void
>(`${IpcRoutes.Host}/shell/prompt/folder`);

export interface UpdateServerUrlRequest {
	serverUrl: string;
	disableStrictSSL?: boolean;
	environment?: string;
	copyToken?: boolean;
	currentTeamId?: string;
}

export interface UpdateServerUrlResponse {}

export const UpdateServerUrlRequestType = new RequestType<
	UpdateServerUrlRequest,
	UpdateServerUrlResponse,
	void,
	void
>(`${IpcRoutes.Host}/server-url`);

export interface OpenUrlRequest {
	url: string;
}

export const OpenUrlRequestType = new RequestType<OpenUrlRequest, void, void, void>(
	`${IpcRoutes.Host}/url/open`
);

export interface CompareLocalFilesRequest {
	repoId: string;
	filePath: string;
	previousFilePath?: string;
	headSha: string;
	headBranch: string;
	baseSha: string;
	baseBranch: string;
	context?: {
		pullRequest: {
			providerId: string;
			pullRequestReviewId?: string;
			id: string;
			collaborators: Collaborator[];
		};
	};
}

export interface CompareLocalFilesResponse {
	error?: string;
}

export const CompareLocalFilesRequestType = new RequestType<
	CompareLocalFilesRequest,
	CompareLocalFilesResponse,
	void,
	void
>(`${IpcRoutes.Host}/files/compare`);

export interface LocalFilesCloseDiffRequest {}

export interface LocalFilesCloseDiffResponse {}

export const LocalFilesCloseDiffRequestType = new RequestType<
	LocalFilesCloseDiffRequest,
	LocalFilesCloseDiffResponse,
	void,
	void
>(`${IpcRoutes.Host}/files/closeDiff`);
export interface ConnectToIDEProviderRequest {
	provider: string;
}

export interface ConnectToIDEProviderResponse {
	accessToken: string;
	sessionId: string;
}

export const ConnectToIDEProviderRequestType = new RequestType<
	ConnectToIDEProviderRequest,
	ConnectToIDEProviderResponse,
	void,
	void
>(`${IpcRoutes.Host}/connect/vscode-provider`);

export interface DisconnectFromIDEProviderRequest {
	provider: string;
}

export const DisconnectFromIDEProviderRequestType = new RequestType<
	DisconnectFromIDEProviderRequest,
	void,
	void,
	void
>(`${IpcRoutes.Host}/disconnect/vscode-provider`);

export interface RefreshEditorsCodeLensRequest {}
export interface RefreshEditorsCodeLensResponse {
	success: boolean;
}

export const RefreshEditorsCodeLensRequestType = new RequestType<
	RefreshEditorsCodeLensRequest,
	RefreshEditorsCodeLensResponse,
	void,
	void
>(`${IpcRoutes.Host}/editors/codelens/refresh`);

// for now, this needs to stay synced with vscode.ViewColumn
export enum ViewColumn {
	Active = -1,
	Beside = -2,
	One = 1,
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
	Seven = 7,
	Eight = 8,
	Nine = 9,
}

export interface OpenEditorViewNotification {
	panel: "anomaly" | "logs" | "nrql" | "whatsnew";
	title: string;
	entryPoint: // logs
	| "global_nav"
		| "context_menu"
		| "tree_view"
		| "open_in_ide"
		| "code_error"
		// nrql
		| "query_builder"
		| "recent_queries"
		| "nrql_file"
		// other
		| "notification"
		| "golden_metrics"
		| "profile"
		| "entity_guid_finder";
	ide: {
		name?: IdeNames;
		browserEngine?: BrowserEngines;
	};
	accountId?: number;
	panelLocation?: ViewColumn;
	entityGuid?: string;
	query?: string;
	hash?: string;
	traceId?: string;
	entityName?: string;
	anomaly?: ObservabilityAnomaly;
	clmSettings?: CLMSettings;
	isProductionCloud?: boolean;
	nrAiUserId?: string;
	userId?: string;
	demoMode?: boolean;
}

export const OpenEditorViewNotificationType = new NotificationType<
	OpenEditorViewNotification,
	void
>(`${IpcRoutes.Host}/editor/open`);
