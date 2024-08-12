"use strict";

import fs from "fs/promises";
import { Blob } from "node:buffer";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import * as qs from "querystring";
import { ParsedUrlQueryInput } from "querystring";

import { isEmpty, isEqual } from "lodash";
import { BodyInit, FormData, Headers, RequestInit, Response } from "undici";
import sanitize from "sanitize-filename";

import { Emitter, Event } from "vscode-languageserver";
import {
	AccessToken,
	AddBlameMapRequest,
	AddBlameMapRequestType,
	AddEnterpriseProviderHostRequest,
	AddEnterpriseProviderHostResponse,
	AgentOpenUrlRequestType,
	ArchiveStreamRequest,
	Capabilities,
	ChangeDataType,
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	CloseStreamRequest,
	CodeStreamEnvironment,
	CreateChannelStreamRequest,
	CreateCompanyRequest,
	CreateCompanyRequestType,
	CreateDirectStreamRequest,
	CreateExternalPostRequest,
	CreateForeignCompanyRequest,
	CreateForeignCompanyRequestType,
	CreateForeignCompanyResponse,
	CreatePostRequest,
	CreateTeamRequest,
	CreateTeamRequestType,
	CreateTeamTagRequestType,
	DeclineInviteRequest,
	DeclineInviteResponse,
	DeleteBlameMapRequest,
	DeleteBlameMapRequestType,
	DeleteCodeErrorRequest,
	DeleteCompanyRequest,
	DeleteCompanyRequestType,
	DeleteCompanyResponse,
	DeleteMeUserRequest,
	DeleteMeUserRequestType,
	DeleteMeUserResponse,
	DeletePostRequest,
	DeleteReviewRequest,
	DeleteTeamTagRequestType,
	DeleteUserRequest,
	DeleteUserResponse,
	DidChangeDataNotificationType,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	EditPostRequest,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	FetchFileStreamsRequest,
	FetchPostRepliesRequest,
	FetchPostsRequest,
	FetchReviewCheckpointDiffsRequest,
	FetchReviewCheckpointDiffsResponse,
	FetchReviewDiffsRequest,
	FetchReviewDiffsResponse,
	FetchReviewsRequest,
	FetchReviewsResponse,
	FetchStreamsRequest,
	FetchTeamsRequest,
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	FetchUnreadStreamsRequest,
	FetchUsersRequest,
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	GenerateLoginCodeRequest,
	GenerateMSTeamsConnectCodeRequest,
	GenerateMSTeamsConnectCodeResponse,
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	GetCompanyRequest,
	GetCompanyResponse,
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenRequestType,
	GetNewRelicSignupJwtTokenResponse,
	GetPostRequest,
	GetPostsRequest,
	GetPreferencesResponse,
	GetReviewRequest,
	GetReviewResponse,
	GetStreamRequest,
	GetTeamRequest,
	GetUserRequest,
	InviteUserRequest,
	JoinCompanyRequest,
	JoinCompanyResponse,
	JoinStreamRequest,
	KickUserRequest,
	KickUserResponse,
	LeaveStreamRequest,
	LoginFailResponse,
	LogoutCompanyRequest,
	LogoutCompanyResponse,
	LookupNewRelicOrganizationsRequest,
	LookupNewRelicOrganizationsResponse,
	MarkItemReadRequest,
	MarkPostUnreadRequest,
	MarkStreamReadRequest,
	MuteStreamRequest,
	OpenStreamRequest,
	PollForMaintenanceModeResponse,
	ProviderTokenRequest,
	ProviderTokenRequestType,
	ReactToPostRequest,
	RemoveEnterpriseProviderHostRequest,
	RenameStreamRequest,
	ReportingMessageType,
	SendPasswordResetEmailRequest,
	SendPasswordResetEmailRequestType,
	ServiceEntitiesViewedRequest,
	ServiceEntitiesViewedRequestType,
	SessionTokenStatus,
	SetPasswordRequest,
	SetPasswordRequestType,
	SetStreamPurposeRequest,
	SharePostViaServerRequest,
	ThirdPartyProviderSetInfoRequest,
	UnarchiveStreamRequest,
	UpdateCodeErrorRequest,
	UpdateCompanyRequest,
	UpdateCompanyRequestType,
	UpdateCompanyResponse,
	UpdateInvisibleRequest,
	UpdatePostSharingDataRequest,
	UpdatePreferencesRequest,
	UpdatePresenceRequest,
	UpdateReviewRequest,
	UpdateStatusRequest,
	UpdateStreamMembershipRequest,
	UpdateTeamAdminRequest,
	UpdateTeamAdminRequestType,
	UpdateTeamRequest,
	UpdateTeamRequestType,
	UpdateTeamSettingsRequest,
	UpdateTeamSettingsRequestType,
	UpdateTeamTagRequestType,
	UpdateUserRequest,
	UploadFileRequest,
	UploadFileRequestType,
	VerifyConnectivityResponse,
} from "@codestream/protocols/agent";
import {
	CSAccessTokenType,
	CSAddProviderHostRequest,
	CSAddProviderHostResponse,
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodeLoginRequest,
	CSCompany,
	CSCompleteSignupRequest,
	CSConfirmRegistrationRequest,
	CSCreateChannelStreamRequest,
	CSCreateChannelStreamResponse,
	CSCreateDirectStreamRequest,
	CSCreateDirectStreamResponse,
	CSCreatePostRequest,
	CSCreatePostResponse,
	CSDeletePostResponse,
	CSDirectStream,
	CSEditPostRequest,
	CSEditPostResponse,
	CSFileStream,
	CSGetApiCapabilitiesResponse,
	CSGetCodeErrorResponse,
	CSGetCodeErrorsResponse,
	CSGetCompaniesResponse,
	CSGetCompanyResponse,
	CSGetInviteInfoRequest,
	CSGetInviteInfoResponse,
	CSGetMeResponse,
	CSGetPostResponse,
	CSGetPostsResponse,
	CSGetReviewCheckpointDiffsResponse,
	CSGetReviewDiffsResponse,
	CSGetReviewResponse,
	CSGetReviewsResponse,
	CSGetStreamResponse,
	CSGetStreamsResponse,
	CSGetTeamResponse,
	CSGetTeamsResponse,
	CSGetUserResponse,
	CSGetUsersResponse,
	CSInviteUserRequest,
	CSInviteUserResponse,
	CSJoinStreamRequest,
	CSJoinStreamResponse,
	CSLoginRequest,
	CSLoginResponse,
	CSMarkItemReadRequest,
	CSMarkItemReadResponse,
	CSMarkPostUnreadRequest,
	CSMarkPostUnreadResponse,
	CSMe,
	CSMePreferences,
	CSMeStatus,
	CSMsTeamsConversationRequest,
	CSMsTeamsConversationResponse,
	CSNewRelicProviderInfo,
	CSNRRegisterRequest,
	CSNRRegisterResponse,
	CSObjectStream,
	CSPost,
	CSProviderShareRequest,
	CSProviderShareResponse,
	CSReactions,
	CSReactToPostResponse,
	CSRegisterRequest,
	CSRegisterResponse,
	CSRemoveProviderHostResponse,
	CSSetPasswordRequest,
	CSSetPasswordResponse,
	CSStream,
	CSTeam,
	CSTeamTagRequest,
	CSThirdPartyProviderSetInfoRequestData,
	CSTrackProviderPostRequest,
	CSUpdateCodeErrorRequest,
	CSUpdateCodeErrorResponse,
	CSUpdatePostSharingDataRequest,
	CSUpdatePostSharingDataResponse,
	CSUpdatePresenceRequest,
	CSUpdatePresenceResponse,
	CSUpdateReviewRequest,
	CSUpdateReviewResponse,
	CSUpdateStreamRequest,
	CSUpdateStreamResponse,
	CSUpdateUserRequest,
	CSUpdateUserResponse,
	CSUser,
	LoginResult,
	ProviderType,
	StreamType,
	TriggerMsTeamsProactiveMessageRequest,
	TriggerMsTeamsProactiveMessageResponse,
} from "@codestream/protocols/api";

import { HttpsProxyAgent } from "https-proxy-agent";
import { ServerError } from "../../agentError";
import { Team, User } from "../extensions";
import { HistoryFetchInfo } from "../../broadcaster/broadcaster";
import { Container, SessionContainer } from "../../container";
import { Logger } from "../../logger";
import { safeDecode, safeEncode } from "../../managers/operations";
import { getProvider, log, lsp, lspHandler, Objects, Strings } from "../../system";
import { VersionInfo } from "../../types";
import {
	ApiProvider,
	ApiProviderLoginResponse,
	CodeStreamApiMiddleware,
	CodeStreamApiMiddlewareContext,
	LoginOptions,
	MessageType,
	RawRTMessage,
	RTMessage,
} from "../apiProvider";
import { CodeStreamPreferences } from "../preferences";
import { BroadcasterEvents } from "./events";
import { clearResolvedFlag } from "@codestream/utils/api/codeErrorCleanup";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { parseId } from "../../providers/newrelic/utils";
import { machineIdSync } from "node-machine-id";
import { ExtraRequestInit, FetchCore } from "../../system/fetchCore";
import { tokenHolder } from "../../providers/newrelic/TokenHolder";

@lsp
export class CodeStreamApiProvider implements ApiProvider {
	providerType = ProviderType.CodeStream;
	private _onDidReceiveMessage = new Emitter<RTMessage>();
	get onDidReceiveMessage(): Event<RTMessage> {
		return this._onDidReceiveMessage.event;
	}

	private _onDidSubscribe = new Emitter<void>();
	get onDidSubscribe(): Event<void> {
		return this._onDidSubscribe.event;
	}

	private _events: BroadcasterEvents | undefined;
	private readonly _middleware: CodeStreamApiMiddleware[] = [];
	private _pubnubSubscribeKey: string | undefined;
	private _pubnubCipherKey: string | undefined;
	private _broadcasterToken: string | undefined;
	private _isV3BroadcasterToken: boolean = false;
	private _subscribedMessageTypes: Set<MessageType> | undefined;
	private _teamId: string | undefined;
	private _team: CSTeam | undefined;
	private _userId: string | undefined;
	private _preferences: CodeStreamPreferences | undefined;
	private _features: CSApiFeatures | undefined;
	private _messageProcessingPromise: Promise<void> | undefined;
	private _usingServiceGatewayAuth: boolean = false;
	private _refreshNRTokenPromise: Promise<CSNewRelicProviderInfo> | undefined;
	private _refreshTokenFailed: boolean = false;
	private _clientId: string;

	readonly capabilities: Capabilities = {
		channelMute: true,
		postDelete: true,
		postEdit: true,
		providerCanSupportRealtimeChat: true,
		providerSupportsRealtimeChat: true,
		providerSupportsRealtimeEvents: true,
	};

	constructor(
		public baseUrl: string,
		private readonly _version: VersionInfo,
		private readonly _httpsAgent: HttpsAgent | HttpsProxyAgent<string> | HttpAgent | undefined,
		private readonly _strictSSL: boolean,
		private fetchClient: FetchCore
	) {
		this._clientId = this.getMachineId();
		Logger.log(`clientId: ${this._clientId}`);
	}

	get teamId(): string {
		return this._teamId!;
	}

	get team(): CSTeam | undefined {
		return this._team!;
	}

	get userId(): string {
		return this._userId!;
	}

	get features() {
		return this._features;
	}

	getMachineId() {
		try {
			return machineIdSync();
		} catch (e) {
			Logger.log("Error getting machine id", e);
			return "";
		}
	}

	setServerUrl(serverUrl: string) {
		this.baseUrl = serverUrl.trim();
	}

	useMiddleware(middleware: CodeStreamApiMiddleware) {
		this._middleware.push(middleware);
		return {
			dispose: () => {
				const i = this._middleware.indexOf(middleware);
				this._middleware.splice(i, 1);
			},
		};
	}

	get usingServiceGatewayAuth() {
		return this._usingServiceGatewayAuth;
	}

	setUsingServiceGatewayAuth() {
		this._usingServiceGatewayAuth = true;
	}

	async dispose() {
		if (this._events) {
			await this._events.dispose();
		}
	}

	async login(options: LoginOptions): Promise<ApiProviderLoginResponse> {
		let response;
		switch (options.type) {
			case "credentials":
				response = await this.put<CSLoginRequest, CSLoginResponse>("/no-auth/login", {
					email: options.email,
					password: options.password,
				});
				// Set the provider to be codestream since that is all that is supported for email/password login
				response.provider = "codestream";

				break;

			case "otc":
				const nrAccountId =
					options.errorGroupGuid !== undefined
						? parseId(options.errorGroupGuid)?.accountId
						: undefined;
				response = await this.put<CSCompleteSignupRequest, CSLoginResponse>(
					"/no-auth/check-signup",
					{
						token: options.code,
						nrAccountId,
					}
				);

				break;

			case "token":
				if (options.token.url.trim() !== this.baseUrl) {
					throw new Error(
						`Invalid token, options.token.url="${options.token.url}" this.baseUrl="${this.baseUrl}"`
					);
				}
				response = await this.put<{}, CSLoginResponse>("/login", {}, options.token);

				response.provider = options.token.provider;
				response.providerAccess = options.token.providerAccess;
				response.teamId = options.token.teamId;

				// Logger.debug(`login 'token' complete with response ${JSON.stringify(response)}`);

				break;

			case "loginCode":
				response = await this.put<CSCodeLoginRequest, CSLoginResponse>("/no-auth/login-by-code", {
					email: options.email,
					loginCode: options.code,
				});

				break;
			default:
				throw new Error("Invalid login options");
		}

		const provider = response.provider;

		Logger.log(
			`CodeStream user '${response.user.username}' (${response.user.id}) is logging into ${
				provider || "unknown"
			}${response.providerAccess ? `:${response.providerAccess}` : ""} and belongs to ${
				response.teams.length
			} team(s)\n${response.teams.map(t => `\t${t.name} (${t.id})`).join("\n")}`
		);

		/*
			💩: the session needs the accessToken token in order to rectify the user's account state
		*/
		if (response.user.mustSetPassword) {
			// save the accessToken for the call to set password
			tokenHolder.setAccessToken("mustSetPassword", response.accessToken);
			throw {
				error: LoginResult.MustSetPassword,
				extra: { email: response.user.email },
			} as LoginFailResponse;
		}

		// 💩see above
		if (response.companies.length === 0 || response.teams.length === 0) {
			// save the accessToken for the call to create a team
			tokenHolder.setAccessToken("createTeam", response.accessToken);

			throw {
				error: LoginResult.NotInCompany,
				extra: {
					token: response.accessToken,
					email: response.user.email,
					userId: response.user.id,
					eligibleJoinCompanies: response.user.eligibleJoinCompanies,
					accountIsConnected: response.accountIsConnected,
					isWebmail: response.isWebmail,
					// isRegistered and user object passed for early segment identify call
					isRegistered: response.user.isRegistered,
					user: response.user,
				},
			} as LoginFailResponse;
		}

		// 💩see above
		//if (response.teams.length === 0) {
		//	// save the accessToken for the call to create a team
		//	this._token = response.accessToken;
		//	throw {
		//		error: LoginResult.NotOnTeam,
		//		extra: { token: response.accessToken, email: response.user.email, userId: response.user.id }
		//	} as LoginFailResponse;
		//}

		let pickedTeamReason;
		let team: CSTeam | undefined;
		let teams = response.teams.filter(_ => _.isEveryoneTeam);
		if (!teams.length) {
			// allow non-everyone team
			teams = response.teams;
		}

		/*
		NOTE - slack/msteams login, where the user is assigned to a team by the server, is deprecated
			github login is treated like a normal login, but without providing password

		// If we are a slack/msteams team or have no overrides, then use the response teamId directly
		if (
			provider != null &&
			(provider !== "codestream" ||
				(options.team == null && (options.teamId == null || options.teamId === response.teamId)))
		) {
			const teamId = response.teamId;
			team = teams.find(t => t.id === teamId);

			if (team != null) {
				pickedTeamReason = " because the team was associated with the authentication token";
			} else {
				// If we can't find the team, make sure to filter to only teams that match the current provider
				teams = response.teams.filter(t => Team.isProvider(t, provider));
			}
		}
		*/

		if (team == null) {
			// If there is only 1 team, use it regardless of config
			if (teams.length === 1) {
				options.teamId = teams[0].id;
			} else {
				// Sort the teams from oldest to newest
				teams.sort((a, b) => a.createdAt - b.createdAt);
			}

			if (options.teamId == null) {
				if (options.team) {
					const normalizedTeamName = options.team.toLocaleUpperCase();
					const team = teams.find(t => t.name.toLocaleUpperCase() === normalizedTeamName);
					if (team != null) {
						options.teamId = team.id;
						pickedTeamReason =
							" because the team was saved in settings (user, workspace, or folder)";
					}
				}

				// Check the lastTeamId preference and use that, if available.
				// If we still can't find a team, then just pick the first one
				if (options.teamId == null) {
					if (response.user.preferences?.lastTeamId) {
						options.teamId = response.user.preferences.lastTeamId;
						pickedTeamReason = " because the team was the last saved team";
					}

					// Pick the oldest (first) Slack team if there is one
					if (options.teamId == null && User.isSlack(response.user)) {
						const team = teams.find(t => Team.isSlack(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Slack team";
						}
					}

					// Pick the oldest (first) MS Teams team if there is one
					if (options.teamId == null && User.isMSTeams(response.user)) {
						const team = teams.find(t => Team.isMSTeams(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Microsoft Teams team";
						}
					}

					if (options.teamId == null) {
						options.teamId = teams[0].id;
						pickedTeamReason = " because the team was the oldest team";
					}
				}
			} else {
				pickedTeamReason = " because the team was the last used team";
			}

			team = teams.find(t => t.id === options.teamId);
			if (team === undefined) {
				team = teams[0];
				pickedTeamReason =
					" because the specified team could not be found, defaulting to the oldest team";
			}
		}

		Logger.log(`Using team '${team.name}' (${team.id})${pickedTeamReason || ""}`);

		tokenHolder.setAccessToken(
			"CodeStreamApiProvider.login",
			response.accessToken,
			response.accessTokenInfo
		);
		this._pubnubSubscribeKey = response.pubnubKey;
		this._pubnubCipherKey = response.pubnubCipherKey;
		if (response.broadcasterV3Token) {
			this._broadcasterToken = response.broadcasterV3Token;
			this._isV3BroadcasterToken = true;
		} else {
			this._broadcasterToken = response.broadcasterToken;
		}

		this._teamId = team.id;
		this._team = team;
		this._userId = response.user.id;
		this._features = response.features;

		const token: AccessToken = {
			email: response.user.email,
			url: this.baseUrl,
			value: response.accessToken,
			provider: response.provider,
			providerAccess: response.providerAccess,
			teamId: team.id,
		};

		return { ...response, token: token };
	}

	async generateLoginCode(request: GenerateLoginCodeRequest): Promise<void> {
		await this.post<GenerateLoginCodeRequest, {}>("/no-auth/generate-login-code", request);
	}

	async generateMSTeamsConnectCode(
		request: GenerateMSTeamsConnectCodeRequest
	): Promise<GenerateMSTeamsConnectCodeResponse> {
		return await this.post<GenerateMSTeamsConnectCodeRequest, GenerateMSTeamsConnectCodeResponse>(
			"/msteams/generate-connect-code",
			request,
			tokenHolder.accessToken
		);
	}

	async register(request: CSRegisterRequest) {
		if (this._version.machine?.machineId) {
			request.machineId = this._version.machine.machineId;
		}
		const response = await this.post<CSRegisterRequest, CSRegisterResponse | CSLoginResponse>(
			"/no-auth/register",
			request
		);
		if ((response as CSLoginResponse).accessToken) {
			tokenHolder.accessToken = (response as CSLoginResponse).accessToken;
		}
		return response;
	}

	async registerNr(request: CSNRRegisterRequest) {
		const response = await this.post<CSNRRegisterRequest, CSNRRegisterResponse>(
			"/no-auth/nr-register",
			request
		);
		if (response.accessToken) {
			tokenHolder.accessToken = response.accessToken;
		}
		return response;
	}

	async confirmRegistration(request: CSConfirmRegistrationRequest): Promise<CSLoginResponse> {
		if (request.errorGroupGuid !== undefined && request.nrAccountId === undefined) {
			request.nrAccountId = parseId(request.errorGroupGuid)?.accountId;
		}
		const response = await this.post<CSConfirmRegistrationRequest, CSLoginResponse>(
			"/no-auth/confirm",
			request
		);
		tokenHolder.setAccessToken("CodeStreamApiProvider.confirmRegistration", response.accessToken);
		return response;
	}

	getInviteInfo(request: CSGetInviteInfoRequest) {
		return this.get<CSGetInviteInfoResponse>(`/no-auth/invite-info?code=${request.code}`);
	}

	@log()
	async subscribe(types?: MessageType[]) {
		this._subscribedMessageTypes = types !== undefined ? new Set(types) : undefined;

		const { session, users } = SessionContainer.instance();
		const me = await users.getMe();
		if (types === undefined || types.includes(MessageType.Preferences)) {
			this._preferences = new CodeStreamPreferences(me.preferences);
			this._preferences.onDidChange(preferences => {
				this._onDidReceiveMessage.fire({ type: MessageType.Preferences, data: preferences });
			});
		}

		// we only need httpsAgent for PubNub, in which case it should always be https
		const httpsAgent =
			this._httpsAgent instanceof HttpsAgent || this._httpsAgent instanceof HttpsProxyAgent
				? this._httpsAgent
				: undefined;
		Logger.log(`Invoking broadcaster with ${this._isV3BroadcasterToken ? "V3" : "V2"} token`);
		this._events = new BroadcasterEvents({
			accessToken: tokenHolder.accessToken!,
			pubnubSubscribeKey: this._pubnubSubscribeKey,
			pubnubCipherKey: this._pubnubCipherKey,
			broadcasterToken: this._broadcasterToken!,
			isV3Token: this._isV3BroadcasterToken,
			api: this,
			httpsAgent,
			strictSSL: this._strictSSL,
			supportsEcho: session.isOnPrem && (!!session.apiCapabilities.echoes || false),
		});
		this._events.onDidReceiveMessage(this.onPubnubMessageReceivedWithBlocking, this);

		/* No longer need to subscribe to streams
		if (types === undefined || types.includes(MessageType.Streams)) {
			const streams = (await SessionContainer.instance().streams.getSubscribable(this.teamId))
				.streams;
			await this._events.connect(streams.map(s => s.id));
		} else {
			await this._events.connect();
		}
		*/
		await this._events.connect();

		this._onDidSubscribe.fire();
	}

	private async onPubnubMessageReceivedWithBlocking(e: RawRTMessage) {
		// allow for certain message types that need to be processed with higher priority than others
		if (this._messageProcessingPromise) {
			// wait for higher priority messages
			await this._messageProcessingPromise;
		}
		if (e.blockUntilProcessed) {
			// make other message processing wait
			this._messageProcessingPromise = new Promise<void>(async (resolve, reject) => {
				try {
					await this.onPubnubMessageReceived(e);
				} catch (error) {
					reject(error);
					delete this._messageProcessingPromise;
					return;
				}
				resolve();
				delete this._messageProcessingPromise;
			});
		} else {
			this.onPubnubMessageReceived(e);
		}
	}

	private async onPubnubMessageReceived(e: RawRTMessage) {
		if (this._subscribedMessageTypes !== undefined && !this._subscribedMessageTypes.has(e.type)) {
			return;
		}

		// Resolve any directives in the message data
		switch (e.type) {
			case MessageType.Companies: {
				const { companies } = SessionContainer.instance();
				e.data = await companies.resolve(e);
				if (e.data == null || e.data.length === 0) return;
				break;
			}
			case MessageType.Posts:
				const ids = (e.data as CSPost[]).map(o => o.id);
				const oldPosts = await Promise.all(
					ids.map(async id => {
						const post = await SessionContainer.instance().posts.getByIdFromCache(id);
						return post ? ({ ...post } as CSPost) : undefined;
					})
				);
				e.data = await SessionContainer.instance().posts.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				await this.fetchAndStoreUnknownAuthors(e.data as CSPost[]);

				break;
			case MessageType.Streams:
				e.data = await SessionContainer.instance().streams.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;
				break;
			case MessageType.Teams:
				const { session, teams } = SessionContainer.instance();

				let currentTeam = await teams.getByIdFromCache(this.teamId);

				let providerHostsBefore;
				if (currentTeam && currentTeam.providerHosts) {
					providerHostsBefore = JSON.parse(JSON.stringify(currentTeam.providerHosts));
				}

				e.data = await teams.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				// Ensure we get the updated copy
				currentTeam = await teams.getByIdFromCache(this.teamId);

				if (currentTeam && currentTeam.providerHosts) {
					if (!isEqual(providerHostsBefore, currentTeam.providerHosts)) {
						session.updateProviders();
					}
				} else if (providerHostsBefore) {
					void session.updateProviders();
				}
				break;
			case MessageType.Users:
				const usersManager = SessionContainer.instance().users;
				const users: CSUser[] = e.data;
				const meIndex = users.findIndex(u => u.id === this.userId);

				// If we aren't updating the current user, just continue
				if (meIndex === -1) {
					e.data = await usersManager.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						// we might be getting info from other users that we need to trigger
						this._onDidReceiveMessage.fire(e as RTMessage);
					}
					return;
				}

				if (users.length > 1) {
					// Remove the current user, as we will handle that seperately
					users.splice(meIndex, 1);

					e.data = await usersManager.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						this._onDidReceiveMessage.fire(e as RTMessage);
					}

					const me = users[meIndex] as CSMe;
					e.data = [me];
				}

				let me = await usersManager.getMe();

				const userPreferencesBefore = JSON.stringify(me.preferences);

				e.data = await usersManager.resolve(e, {
					onlyIfNeeded: true,
				});
				if (e.data == null || e.data.length === 0) return;

				me = await usersManager.getMe();
				e.data = [me];

				try {
					if (!this._preferences) {
						this._preferences = new CodeStreamPreferences(me.preferences);
					}
					if (me.preferences && JSON.stringify(me.preferences) !== userPreferencesBefore) {
						this._preferences.update(me.preferences);
					}
					if (me.broadcasterV3Token && this._events) {
						this._events.setV3BroadcasterToken(me.broadcasterV3Token);
					}
				} catch {
					debugger;
				}

				break;
		}

		this._onDidReceiveMessage.fire(e as RTMessage);
	}

	grantBroadcasterChannelAccess(token: string, channel: string): Promise<{}> {
		return this.put(`/grant/${channel}`, {}, token);
	}

	@log()
	private getMe() {
		return this.get<CSGetMeResponse>("/users/me", tokenHolder.accessToken);
	}

	@log()
	async trackProviderPost(request: CSTrackProviderPostRequest) {
		try {
			return await this.post(
				`/provider-posts/${request.provider}`,
				request,
				tokenHolder.accessToken
			);
		} catch (ex) {
			debugger;
			Logger.error(ex, `Failed updating ${request.provider} post count`);
			return undefined;
		}
	}

	@log()
	async updatePreferences(request: UpdatePreferencesRequest) {
		safeEncode(request.preferences);
		const update = await this.put<CSMePreferences, any>(
			"/preferences",
			request.preferences,
			tokenHolder.accessToken
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);

		if (this._preferences) {
			this._preferences.update(user.preferences!);
		}
		return { preferences: user.preferences || {} };
	}

	@log()
	async updateStatus(request: UpdateStatusRequest) {
		let currentStatus = {};
		const me = await SessionContainer.instance().users.getMe();
		if (me.status) {
			currentStatus = {
				...me.status,
			};
		}
		const update = await this.put<{ status: { [teamId: string]: CSMeStatus } }, any>(
			"/users/me",
			{
				status: {
					...currentStatus,
					...request.status,
				},
			},
			tokenHolder.accessToken
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);

		return { user };
	}

	@log()
	async updateInvisible(request: UpdateInvisibleRequest) {
		const update = await this.put<{ status: { invisible: boolean } }, any>(
			"/users/me",
			{ status: { invisible: request.invisible } },
			tokenHolder.accessToken
		);

		const user = await SessionContainer.instance().session.resolveUserAndNotify(update.user);
		return { user };
	}

	@log()
	updatePresence(request: UpdatePresenceRequest) {
		return this.put<CSUpdatePresenceRequest, CSUpdatePresenceResponse>(
			`/presence`,
			request,
			tokenHolder.accessToken
		);
	}

	// async createFileStream(relativePath: string, repoId: string) {
	// 	return this.createStream<CSCreateFileStreamRequest, CSCreateFileStreamResponse>({
	// 		teamId: this._teamId,
	// 		type: StreamType.File,
	// 		repoId: repoId,
	// 		file: relativePath
	// 	});
	// }

	@log()
	async fetchFileStreams(request: FetchFileStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSFileStream>>(
			`/streams?teamId=${this.teamId}&repoId=${request.repoId}`,
			tokenHolder.accessToken
		);
	}

	private async getStreams<R extends CSGetStreamsResponse<CSStream>>(
		url: string,
		token?: string
	): Promise<R> {
		let more: boolean | undefined = true;
		let lt: string | undefined;
		const response = { streams: [] as CSStream[] };

		while (more) {
			const pagination = lt ? `&lt=${lt}` : "";
			const page = await this.get<R>(`${url}${pagination}`, token);
			response.streams.push(...page.streams);
			more = page.more;
			lt = page.streams.length ? page.streams[page.streams.length - 1].sortId : undefined;
		}

		return response as R;
	}

	@log()
	followCodeError(request: FollowCodeErrorRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.put<FollowCodeErrorRequest, FollowCodeErrorResponse>(
			`/code-errors/${pathType}/${request.id}`,
			request,
			tokenHolder.accessToken
		);
	}

	@log()
	async createExternalPost(request: CreateExternalPostRequest): Promise<CSCreatePostResponse> {
		throw new Error("Not supported");
	}

	@log()
	createPost(request: CreatePostRequest) {
		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		const session = SessionContainer.instance().session;
		if (session.isOnPrem) {
			request.inviteInfo = {
				serverUrl: this.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false,
			};
		}

		const result = this.post<CSCreatePostRequest, CSCreatePostResponse>(
			`/posts`,
			{ ...request, teamId: this.teamId },
			tokenHolder.accessToken
		);
		return result;
	}

	@log()
	async deletePost(request: DeletePostRequest) {
		const response = await this.delete<CSDeletePostResponse>(
			`/posts/${request.postId}`,
			tokenHolder.accessToken
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: response.posts,
		});

		return { ...response, post };
	}

	@log()
	async editPost(request: EditPostRequest) {
		const response = await this.put<CSEditPostRequest, CSEditPostResponse>(
			`/posts/${request.postId}`,
			request,
			tokenHolder.accessToken
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post],
		});
		return { ...response, post };
	}

	@log()
	async updatePostSharingData(request: UpdatePostSharingDataRequest) {
		const response = await this.put<
			CSUpdatePostSharingDataRequest,
			CSUpdatePostSharingDataResponse
		>(`/posts/${request.postId}`, request, tokenHolder.accessToken);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post],
		});
		return { ...response, post };
	}

	@log()
	async sharePostViaServer(request: SharePostViaServerRequest) {
		const provider = getProvider(request.providerId);
		if (!provider) {
			throw new Error("Invalid providerId");
		}
		try {
			const response = await this.post<CSProviderShareRequest, CSProviderShareResponse>(
				`/provider-share/${provider.name}`,
				{
					postId: request.postId,
				},
				tokenHolder.accessToken
			);
			const [post] = await SessionContainer.instance().posts.resolve({
				type: MessageType.Streams,
				data: [response.post],
			});
			return { ...response, post };
		} catch (ex) {
			if (provider.name === "slack") {
				const telemetry = Container.instance().telemetry;
				telemetry.track({
					eventName: "codestream/codemarks/slack_sharing failed",
					properties: {
						meta_data: `error: ex.message`,
						event_type: "response",
					},
				});
			}
			throw ex;
		}
	}

	@log()
	async fetchPostReplies(request: FetchPostRepliesRequest) {
		const post = await SessionContainer.instance().posts.getById(request.postId);
		const response = await this.get<CSGetPostsResponse>(
			`/posts?teamId=${this.teamId}&streamId=${request.streamId}&parentPostId=${request.postId}`,
			tokenHolder.accessToken
		);

		// when fetching replies to code errors, we may end up with authors that aren't part of the
		// current team, we'll need to fetch and store those authors
		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchPosts(request: FetchPostsRequest | Partial<FetchPostsRequest>) {
		let limit = request.limit;
		if (!limit || limit > 100) {
			limit = 100;
		}

		const params: { [k: string]: any } = {
			teamId: this.teamId,
			limit,
		};

		if (request.streamId) {
			params.streamId = request.streamId;
		}
		if (request.before) {
			params.before = request.before;
		}
		if (request.after) {
			params.after = request.after;
		}
		if (request.inclusive === true) {
			params.inclusive = request.inclusive;
		}

		const response = await this.get<CSGetPostsResponse>(
			`/posts?${qs.stringify(params)}`,
			tokenHolder.accessToken
		);

		if (response.posts && request.streamId) {
			response.posts.sort((a: CSPost, b: CSPost) => (a.seqNum as number) - (b.seqNum as number));
		}

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchAndStoreUnknownAuthors(posts: CSPost[]) {
		const unknownAuthorIds: string[] = [];
		for (const post of posts) {
			if (
				!unknownAuthorIds.includes(post.creatorId) &&
				!(await SessionContainer.instance().users.getByIdFromCache(post.creatorId))
			) {
				unknownAuthorIds.push(post.creatorId);
			}
		}

		if (unknownAuthorIds.length > 0) {
			const request: FetchUsersRequest = {
				userIds: unknownAuthorIds,
			};
			const usersResponse = await this.fetchUsers(request);
			await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: usersResponse.users,
			});
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: usersResponse.users,
			});
		}
	}

	@log()
	getPost(request: GetPostRequest) {
		return this.get<CSGetPostResponse>(
			`/posts/${request.postId}?teamId=${this.teamId}`,
			tokenHolder.accessToken
		);
	}

	@log()
	getPosts(request: GetPostsRequest) {
		return this.get<CSGetPostsResponse>(
			`/posts?${qs.stringify({
				teamId: this.teamId,
				streamId: request.streamId,
				ids: request.postIds && request.postIds.join(","),
			})}`,
			tokenHolder.accessToken
		);
	}

	@log()
	markPostUnread(request: MarkPostUnreadRequest) {
		return this.put<CSMarkPostUnreadRequest, CSMarkPostUnreadResponse>(
			`/unread/${request.postId}`,
			request,
			tokenHolder.accessToken
		);
	}

	@log()
	markItemRead(request: MarkItemReadRequest) {
		return this.put<CSMarkItemReadRequest, CSMarkItemReadResponse>(
			`/read-item/${request.itemId}`,
			{ numReplies: request.numReplies },
			tokenHolder.accessToken
		);
	}

	@log()
	async reactToPost(request: ReactToPostRequest) {
		const response = await this.put<CSReactions, CSReactToPostResponse>(
			`/react/${request.postId}`,
			request.emojis,
			tokenHolder.accessToken
		);

		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: [response.post],
		});
		return { ...response, post: post };
	}

	fetchMsTeamsConversations(
		request: CSMsTeamsConversationRequest
	): Promise<CSMsTeamsConversationResponse> {
		return this.get<any>(
			`/msteams_conversations?teamId=${this.teamId}&tenantId=${request.tenantId}`,
			tokenHolder.accessToken
		);
	}

	triggerMsTeamsProactiveMessage(
		request: TriggerMsTeamsProactiveMessageRequest
	): Promise<TriggerMsTeamsProactiveMessageResponse> {
		return this.post<any, any>(
			"/msteams_conversations",
			{ ...request, teamId: this.teamId },
			tokenHolder.accessToken
		);
	}

	@log()
	fetchReviews(request: FetchReviewsRequest): Promise<FetchReviewsResponse> {
		const params: ParsedUrlQueryInput = {
			teamId: this.teamId,
		};
		if (request.reviewIds?.length ?? 0 > 0) {
			params.ids = request.reviewIds;
		}
		if (request.streamId != null) {
			params.streamId = request.streamId;
		}

		return this.get<CSGetReviewsResponse>(
			`/reviews?${qs.stringify(params)}`,
			tokenHolder.accessToken
		);
	}

	@log()
	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		const params: ParsedUrlQueryInput = {
			teamId: this.teamId,
		};
		if (request.codeErrorIds?.length ?? 0 > 0) {
			params.ids = request.codeErrorIds;
		}
		/* The need to pass streamId or streamIds is deprecated
		if (request.streamIds != null) {
			params.streamIds = request.streamIds;
		}
		*/
		const response = await this.get<CSGetCodeErrorsResponse>(
			`/code-errors?${qs.stringify(params)}`,
			tokenHolder.accessToken
		);

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		clearResolvedFlag(response.codeErrors);

		return response;
	}

	@log()
	async claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse> {
		const response = await this.post<ClaimCodeErrorRequest, ClaimCodeErrorResponse>(
			`/code-errors/claim/${this.teamId}`,
			{
				objectId: request.objectId,
				objectType: request.objectType,
			},
			tokenHolder.accessToken
		);
		// Clear out resolved: true from all stack lines (each user has a different local path)
		if (response.codeError) {
			clearResolvedFlag([response.codeError]);
		}
		Logger.log(`Response to claim code error, objectId=${request.objectId}:`, response);
		return response;
	}

	@log()
	getReview(request: GetReviewRequest): Promise<GetReviewResponse> {
		return this.get<CSGetReviewResponse>(`/reviews/${request.reviewId}`, tokenHolder.accessToken);
	}

	@log()
	async getCodeError(request: GetCodeErrorRequest): Promise<GetCodeErrorResponse> {
		const response = await this.get<CSGetCodeErrorResponse>(
			`/code-errors/${request.codeErrorId}`,
			tokenHolder.accessToken
		);
		if (response.codeError) {
			clearResolvedFlag([response.codeError]);
		}
		return response;
	}

	@log()
	updateReview(request: UpdateReviewRequest) {
		const { id, ...params } = request;

		const capabilities = SessionContainer.instance().session.apiCapabilities;

		// check to see if we're setting the status of the review,
		// and if so, use the specialized API calls
		if (capabilities && capabilities.multipleReviewersApprove && params.status) {
			const routeMap: { [key: string]: string } = {
				approved: "/approve",
				rejected: "/reject",
				open: "/reopen",
			} as any;
			const route = routeMap[params.status];
			if (route) {
				return this.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
					`/reviews${route}/${id}`,
					{},
					tokenHolder.accessToken
				);
			} else {
				Logger.warn("Unknown route for status: ", params);
			}
		}

		return this.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
			`/reviews/${id}`,
			params,
			tokenHolder.accessToken
		);
	}

	@log()
	updateCodeError(request: UpdateCodeErrorRequest) {
		const { id, ...params } = request;
		return this.put<CSUpdateCodeErrorRequest, CSUpdateCodeErrorResponse>(
			`/code-errors/${id}`,
			params,
			tokenHolder.accessToken
		);
	}

	@log()
	async deleteReview(request: DeleteReviewRequest) {
		await this.delete(`/reviews/${request.id}`, tokenHolder.accessToken);
		return {};
	}

	@log()
	async deleteCodeError(request: DeleteCodeErrorRequest) {
		await this.delete(`/code-errors/${request.id}`, tokenHolder.accessToken);
		return {};
	}

	@log()
	fetchReviewDiffs(request: FetchReviewDiffsRequest): Promise<FetchReviewDiffsResponse> {
		return this.get<CSGetReviewDiffsResponse>(
			`/reviews/diffs/${request.reviewId}`,
			tokenHolder.accessToken
		);
	}

	@log()
	fetchReviewCheckpointDiffs(
		request: FetchReviewCheckpointDiffsRequest
	): Promise<FetchReviewCheckpointDiffsResponse> {
		return this.get<CSGetReviewCheckpointDiffsResponse>(
			`/reviews/checkpoint-diffs/${request.reviewId}`,
			tokenHolder.accessToken
		);
	}

	@log()
	createChannelStream(request: CreateChannelStreamRequest) {
		return this.post<CSCreateChannelStreamRequest, CSCreateChannelStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			tokenHolder.accessToken
		);
	}

	@log()
	createDirectStream(request: CreateDirectStreamRequest) {
		return this.post<CSCreateDirectStreamRequest, CSCreateDirectStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			tokenHolder.accessToken
		);
	}

	@log()
	fetchStreams(request: FetchStreamsRequest) {
		if (
			request.types == null ||
			request.types.length === 0 ||
			(request.types.includes(StreamType.Channel) && request.types.includes(StreamType.Direct))
		) {
			return this.getStreams<
				CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>
			>(`/streams?teamId=${this.teamId}`, tokenHolder.accessToken);
		}

		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&type=${request.types[0]}`,
			tokenHolder.accessToken
		);
	}

	@log()
	fetchUnreadStreams(request: FetchUnreadStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&unread`,
			tokenHolder.accessToken
		);
	}

	@log()
	async getStream(request: GetStreamRequest) {
		return this.get<CSGetStreamResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams/${request.streamId}`,
			tokenHolder.accessToken
		);
	}

	@log()
	async archiveStream(request: ArchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: true });
	}

	@log()
	closeStream(request: CloseStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: true });
	}

	@log()
	async joinStream(request: JoinStreamRequest) {
		const response = await this.put<CSJoinStreamRequest, CSJoinStreamResponse>(
			`/join/${request.streamId}`,
			{},
			tokenHolder.accessToken
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	async leaveStream(request: LeaveStreamRequest) {
		// Get a copy of the original stream & copy its membership array (since it will be mutated)
		const originalStream = {
			...(await SessionContainer.instance().streams.getById(request.streamId)),
		};
		if (originalStream.memberIds != null) {
			originalStream.memberIds = originalStream.memberIds.slice(0);
		}

		if (this._events !== undefined) {
			this._events.unsubscribeFromStream(request.streamId);
		}

		try {
			const response = await this.updateStream(request.streamId, {
				$pull: { memberIds: [this._userId] },
			});
			return { stream: response.stream as CSChannelStream };
		} catch (ex) {
			Logger.error(ex);

			// Since this can happen because we have no permission to the stream anymore,
			// simulate removing ourselves from the membership list
			if (originalStream.memberIds != null) {
				const index = originalStream.memberIds.findIndex(m => m === this._userId);
				if (index !== -1) {
					originalStream.memberIds.splice(index, 1);
				}
			}
			return { stream: originalStream as CSChannelStream };
		}
	}

	@log()
	markStreamRead(request: MarkStreamReadRequest) {
		return this.put(`/read/${request.streamId}`, {}, tokenHolder.accessToken);
	}

	@log()
	async muteStream(request: MuteStreamRequest) {
		void (await this.updatePreferences({
			preferences: {
				$set: { [`mutedStreams.${request.streamId}`]: request.mute },
			},
		}));

		const stream = await SessionContainer.instance().streams.getById(request.streamId);
		return { stream: stream };
	}

	@log()
	openStream(request: OpenStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: false });
	}

	@log()
	renameStream(request: RenameStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { name: request.name });
	}

	@log()
	setStreamPurpose(request: SetStreamPurposeRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { purpose: request.purpose });
	}

	@log()
	unarchiveStream(request: UnarchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: false });
	}

	private async updateStream<T extends CSChannelStream | CSDirectStream | CSObjectStream>(
		streamId: string,
		changes: { [key: string]: any }
	) {
		const response = await this.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${streamId}`,
			{
				...changes,
			},
			tokenHolder.accessToken
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as T };
	}

	@log()
	async updateStreamMembership(request: UpdateStreamMembershipRequest) {
		const response = await this.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${request.streamId}`,
			{
				$push: request.add == null ? undefined : { memberIds: request.add },
				$pull: request.remove == null ? undefined : { memberIds: request.remove },
			},
			tokenHolder.accessToken
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream],
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	@lspHandler(CreateTeamRequestType)
	createTeam(request: CreateTeamRequest) {
		return this.post("/teams", request, tokenHolder.accessToken);
	}

	@lspHandler(SendPasswordResetEmailRequestType)
	async sendPasswordResetEmail(request: SendPasswordResetEmailRequest) {
		await this.put("/no-auth/forgot-password", request);
	}

	@lspHandler(SetPasswordRequestType)
	async setPassword(request: SetPasswordRequest) {
		return this.put<CSSetPasswordRequest, CSSetPasswordResponse>(
			"/password",
			{ newPassword: request.password },
			tokenHolder.accessToken
		);
	}

	@log()
	fetchTeams(request: FetchTeamsRequest) {
		let params = "";
		if (request.mine) {
			params = `&mine`;
		}

		if (request.teamIds && request.teamIds.length) {
			params += `&ids=${request.teamIds.join(",")}`;
		}

		return this.get<CSGetTeamsResponse>(
			`/teams${params ? `?${params.substring(1)}` : ""}`,
			tokenHolder.accessToken
		);
	}

	@log()
	getTeam(request: GetTeamRequest) {
		return this.get<CSGetTeamResponse>(`/teams/${request.teamId}`, tokenHolder.accessToken);
	}

	fetchCompanies(request: FetchCompaniesRequest): Promise<FetchCompaniesResponse> {
		const params: { [k: string]: any } = {};

		if (request.mine) {
			params.mine = true;
		} else if (request.companyIds?.length ?? 0 > 0) {
			params.ids = request.companyIds!.join(",");
		}

		return this.get<CSGetCompaniesResponse>(
			`/companies?${qs.stringify(params)}`,
			tokenHolder.accessToken
		);
	}

	getCompany(request: GetCompanyRequest): Promise<GetCompanyResponse> {
		return this.get<CSGetCompanyResponse>(
			`/companies/${request.companyId}`,
			tokenHolder.accessToken
		);
	}

	async joinCompany(request: JoinCompanyRequest): Promise<JoinCompanyResponse> {
		// if we're connecting to the server through Service Gateway, then use a special path
		// that allows us to bypass login service (since we don't have a New Relic issued access
		// token till we join a company) ... note, we only do this if this is a brand new user,
		// who hasn't yet chosen whether they will create an org or join one, in other words,
		// they don't yet have a teamId in their session
		const csAuth = !this.teamId && this._usingServiceGatewayAuth ? "/cs-auth" : "";

		return this.put(`${csAuth}/join-company/${request.companyId}`, {}, tokenHolder.accessToken);
	}

	async logoutCompany(request: LogoutCompanyRequest): Promise<LogoutCompanyResponse> {
		return this.put(`/logout`, {}, tokenHolder.accessToken);
	}

	async declineInvite(request: DeclineInviteRequest): Promise<DeclineInviteResponse> {
		return this.put(`/decline-invite/${request.companyId}`, {}, tokenHolder.accessToken);
	}

	async joinCompanyFromEnvironment(request: JoinCompanyRequest): Promise<JoinCompanyResponse> {
		const { serverUrl, userId, toServerUrl } = request.fromEnvironment!;

		// explicitly set the host to call, because even though we're switching, the
		// switch may not have fully sync'd yet
		this.setServerUrl(toServerUrl);

		// NOTE that tokenHolder.accessToken here is the access token for the server we are switching FROM,
		// this is OK, since in this request, the access token actually gets passed on to the
		// server we are switching FROM, by the server we are switching TO
		// isn't this awesome???
		const xenvRequest = {
			serverUrl,
			userId,
		};

		return this.put(
			`/xenv/join-company/${request.companyId}`,
			xenvRequest,
			tokenHolder.accessToken
		);
	}

	@lspHandler(UpdateCompanyRequestType)
	@log()
	async updateCompany(request: UpdateCompanyRequest): Promise<UpdateCompanyResponse> {
		return this.put(`/companies/${request.companyId}`, request, tokenHolder.accessToken);
	}

	@lspHandler(DeleteCompanyRequestType)
	@log()
	deleteCompany(request: DeleteCompanyRequest): Promise<DeleteCompanyResponse> {
		return this.delete<DeleteCompanyResponse>(
			`/companies/${request.companyId}`,
			tokenHolder.accessToken
		);
	}

	async setCompanyTestGroups(
		companyId: string,
		request: { [key: string]: string }
	): Promise<CSCompany> {
		const response = await this.put<{ [key: string]: string }, { company: any }>(
			`/company-test-group/${companyId}`,
			request,
			tokenHolder.accessToken
		);
		const companies = (await SessionContainer.instance().companies.resolve({
			type: MessageType.Companies,
			data: [response.company],
		})) as CSCompany[];
		return companies[0];
	}

	async addCompanyNewRelicInfo(companyId: string, accountIds?: number[], orgIds?: number[]) {
		if (!accountIds && !orgIds) {
			return false;
		}

		const body: {
			accountIds?: number[];
			orgIds?: number[];
		} = {};
		if (accountIds) {
			body.accountIds = accountIds;
		}
		if (orgIds) {
			body.orgIds = accountIds;
		}

		const response = await this.post<
			{ accountIds?: number[]; orgIds?: number[] },
			{ company: any }
		>(
			`/companies/add-nr-info/${companyId}`,
			{
				accountIds,
				orgIds,
			},
			tokenHolder.accessToken
		);

		return true;
	}

	@log()
	@lspHandler(CreateCompanyRequestType)
	createCompany(request: CreateCompanyRequest) {
		// if we're connecting to the server through Service Gateway, then use a special path
		// that allows us to bypass login service (since we don't have a New Relic issued access
		// token till we join a company) ... note, we only do this if this is a brand new user,
		// who hasn't yet chosen whether they will create an org or join one, in other words,
		// they don't yet have a teamId in their session
		const csAuth = !this.teamId && this._usingServiceGatewayAuth ? "/cs-auth" : "";

		return this.post(`${csAuth}/companies`, request, tokenHolder.accessToken);
	}

	@log()
	@lspHandler(CreateForeignCompanyRequestType)
	async createForeignCompany(request: CreateForeignCompanyRequest) {
		const body = {
			...request.request,
			serverUrl: request.host.publicApiUrl,
		};

		const response: CreateForeignCompanyResponse = await this.post(
			"/create-xenv-company",
			body,
			tokenHolder.accessToken
		);

		const users = await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [response.user],
		});
		Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Users,
			data: users,
		});

		return response;
	}

	@lspHandler(CreateTeamTagRequestType)
	async createTeamTag(request: CSTeamTagRequest) {
		await this.post(`/team-tags/${request.team.id}`, { ...request.tag }, tokenHolder.accessToken);
	}

	@lspHandler(DeleteTeamTagRequestType)
	async deleteTeamTag(request: CSTeamTagRequest) {
		await this.delete(`/team-tags/${request.team.id}/${request.tag.id}`, tokenHolder.accessToken);
	}

	@lspHandler(UpdateTeamTagRequestType)
	async updateTeamTag(request: CSTeamTagRequest) {
		await this.put(
			`/team-tags/${request.team.id}/${request.tag.id}`,
			{ ...request.tag },
			tokenHolder.accessToken
		);
	}

	@lspHandler(UpdateTeamAdminRequestType)
	async updateTeamAdmin(request: UpdateTeamAdminRequest) {
		await this.put(
			`/teams/${request.teamId}`,
			{
				$push: request.add == null ? undefined : { adminIds: request.add },
				$pull: request.remove == null ? undefined : { adminIds: request.remove },
			},
			tokenHolder.accessToken
		);
	}

	@lspHandler(UpdateTeamRequestType)
	async updateTeam(request: UpdateTeamRequest) {
		await this.put(`/teams/${request.teamId}`, { ...request }, tokenHolder.accessToken);
	}

	@lspHandler(UpdateTeamSettingsRequestType)
	async updateTeamSettings(request: UpdateTeamSettingsRequest) {
		await this.put(
			`/team-settings/${request.teamId}`,
			{ ...request.settings },
			tokenHolder.accessToken
		);
	}

	@lspHandler(AddBlameMapRequestType)
	async addBlameMap(request: AddBlameMapRequest) {
		await this.post(
			`/add-blame-map/${request.teamId}`,
			{ email: request.email, userId: request.userId },
			tokenHolder.accessToken
		);
	}

	@lspHandler(DeleteBlameMapRequestType)
	async deleteBlameMap(request: DeleteBlameMapRequest) {
		await this.put(
			`/delete-blame-map/${request.teamId}`,
			{ email: request.email },
			tokenHolder.accessToken
		);
	}

	@lspHandler(ServiceEntitiesViewedRequestType)
	async serviceEntitiesViewed(request: ServiceEntitiesViewedRequest) {
		await this.post(
			`/entities`,
			{ teamId: request.teamId, entityId: request.entityId },
			tokenHolder.accessToken
		);
	}

	@log()
	async fetchUsers(request: FetchUsersRequest) {
		let path = `/users?teamId=${this.teamId}`;
		if (request.userIds) {
			path += `&ids=${request.userIds.join(",")}`;
		}

		const response = await this.get<CSGetUsersResponse>(path, tokenHolder.accessToken);

		// Find ourselves and replace it with our model
		const index = response.users.findIndex(u => u.id === this._userId);
		const me = await SessionContainer.instance().users.getMe();
		if (index !== -1 && me) response.users.splice(index, 1, me);

		return response;
	}

	@log()
	getUser(request: GetUserRequest) {
		if (request.userId === this.userId) {
			return this.getMe();
		}

		return this.get<CSGetUserResponse>(`/users/${request.userId}`, tokenHolder.accessToken);
	}

	@log()
	inviteUser(request: InviteUserRequest) {
		const postUserRequest = { ...request, teamId: this.teamId };
		const session = SessionContainer.instance().session;

		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		if (session.isOnPrem) {
			postUserRequest.inviteInfo = {
				serverUrl: this.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false,
			};
		}

		return this.post<CSInviteUserRequest, CSInviteUserResponse>(
			"/users",
			postUserRequest,
			tokenHolder.accessToken
		);
	}

	@log()
	deleteUser(request: DeleteUserRequest) {
		return this.delete<DeleteUserResponse>(`/users/${request.userId}`, tokenHolder.accessToken);
	}

	@lspHandler(DeleteMeUserRequestType)
	@log()
	deleteMeUser(request: DeleteMeUserRequest) {
		return this.delete<DeleteMeUserResponse>(`/users/${request.userId}`, tokenHolder.accessToken);
	}

	@log()
	kickUser(request: KickUserRequest) {
		return this.put<any, KickUserResponse>(
			`/teams/${request.teamId}`,
			{
				$addToSet: { removedMemberIds: [request.userId] },
			},
			tokenHolder.accessToken
		);
	}

	@log()
	updateUser(request: UpdateUserRequest) {
		if (request.email) {
			return this.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/change-email/",
				request,
				tokenHolder.accessToken
			);
		} else {
			return this.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/users/" + this.userId,
				request,
				tokenHolder.accessToken
			);
		}
	}

	@log()
	async getPreferences() {
		const preferences = await this.get<GetPreferencesResponse>(
			"/preferences",
			tokenHolder.accessToken
		);
		safeDecode(preferences);
		return preferences;
	}

	@log()
	async getApiCapabilities(): Promise<CSApiCapabilities> {
		const response = await this.get<CSGetApiCapabilitiesResponse>(`/no-auth/capabilities`);
		return response.capabilities;
	}

	@log()
	async connectThirdPartyProvider(request: { providerId: string; sharing?: boolean }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const response = await this.get<{ code: string }>(
				`/provider-auth-code?teamId=${this.teamId}${request.sharing ? "&sharing=true" : ""}`,
				tokenHolder.accessToken
			);
			const params: { [key: string]: string } = {
				code: response.code,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.sharing) {
				params.sharing = true.toString();
			}
			// TODO: feature flag
			if (providerConfig.hasServerToken && true) {
				params.requestServerToken = true.toString();
			}

			const query = Object.keys(params)
				.map(param => `${param}=${encodeURIComponent(params[param])}`)
				.join("&");
			void SessionContainer.instance().session.agent.sendRequest(AgentOpenUrlRequestType, {
				url: `${this.baseUrl}/no-auth/provider-auth/${providerConfig.name}?${query}`,
			});
			// this response is never used.
			return response;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: {
			0: (request: ThirdPartyProviderSetInfoRequest) => `${request.providerId}`,
		},
	})
	async setThirdPartyProviderInfo(request: ThirdPartyProviderSetInfoRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: CSThirdPartyProviderSetInfoRequestData = {
				data: request.data,
				teamId: this.teamId,
			};

			const response = await this.put<CSThirdPartyProviderSetInfoRequestData, { user: any }>(
				`/provider-info/${providerConfig.name}`,
				params,
				tokenHolder.accessToken
			);

			// the webview needs to know about the change to the user object with the new provider access token
			// before it can proceed to display the provider as selected in the issues selector for codemarks,
			// so we need to force the data to resolve and send a notification directly from here before returning
			// REALLY don't know how else to do this
			const users = (await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: [response.user],
			})) as CSUser[];
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: users,
			});
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async disconnectThirdPartyProvider(request: { providerId: string; providerTeamId?: string }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { teamId: string; host?: string; subId?: string } = {
				teamId: this.teamId,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.providerTeamId) {
				params.subId = request.providerTeamId;
			}

			void (await this.put<{ teamId: string; host?: string }, {}>(
				`/provider-deauth/${providerConfig.name}`,
				params,
				tokenHolder.accessToken
			));
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	refreshNewRelicToken(refreshToken: string): Promise<CSNewRelicProviderInfo> {
		const cc = Logger.getCorrelationContext();

		Logger.log(cc, "Incoming refresh New Relic token request");
		if (this._refreshNRTokenPromise) {
			Logger.log(cc, "Promise already made");
			return this._refreshNRTokenPromise;
		}

		this._refreshNRTokenPromise = new Promise((resolve, reject) => {
			Logger.log(cc, "Calling provider refresh for New Relic token...");
			const url = "/no-auth/provider-refresh/newrelic";
			this.put<{ refreshToken: string }, CSNewRelicProviderInfo>(
				url,
				{
					refreshToken: refreshToken, //+ "x", // uncomment to test roadblock
				},
				undefined,
				{ skipInterceptors: true }
			)
				.then(response => {
					if (response.accessToken) {
						Logger.log("New Relic access token successfully refreshed, setting...");
						tokenHolder.setAccessToken("CodestreamApi.refreshNewRelicToken", response.accessToken, {
							expiresAt: response.expiresAt!,
							refreshToken: response.refreshToken!,
							tokenType: response.tokenType! as CSAccessTokenType,
						});
						if (SessionContainer.isInitialized()) {
							SessionContainer.instance().session.onAccessTokenChanged(
								response.accessToken,
								response.refreshToken,
								response.tokenType as CSAccessTokenType
							);
						}
					}
					delete this._refreshNRTokenPromise;
					if (this._refreshTokenFailed) {
						Logger.log("Recovering from refresh token failure status, session now active");
						if (SessionContainer.isInitialized()) {
							SessionContainer.instance().session.onSessionTokenStatusChanged(
								SessionTokenStatus.Active
							);
						}
						this._refreshTokenFailed = false;
					}
					resolve(response);
				})
				.catch(ex => {
					Logger.log(`New Relic access token refresh failed, status code ${ex.statusCode}:`, ex);
					Logger.error(ex, cc);

					if (ex.statusCode === 403) {
						delete this._refreshNRTokenPromise;
						if (SessionContainer.isInitialized()) {
							Logger.log("Setting session expired");
							SessionContainer.instance().session.onSessionTokenStatusChanged(
								SessionTokenStatus.Expired
							);
						} else {
							Logger.log(
								`Session is either not initialized (${SessionContainer.isInitialized()}), or token refresh has already failed, not setting session expired`
							);
						}
						this._refreshTokenFailed = true;
					}
					delete this._refreshNRTokenPromise;
					reject(ex);
				});
		});
		return this._refreshNRTokenPromise;
	}

	@log({
		args: { 1: () => false },
	})
	async refreshThirdPartyProvider(request: {
		providerId: string;
		sharing?: boolean;
		subId?: string;
	}): Promise<CSMe> {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { [key: string]: string } = {
				teamId: this.teamId,
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}

			const team = `teamId=${this.teamId}`;
			const host = providerConfig.isEnterprise
				? `&host=${encodeURIComponent(providerConfig.host!)}`
				: "";
			const sharing = request.sharing ? "&sharing=true" : "";
			const subId = request.subId ? `&subId=${request.subId}` : "";
			const url = `/provider-refresh/${providerConfig.name}?${team}${host}${sharing}${subId}`;
			const response = await this.get<{ user: any }>(url, tokenHolder.accessToken);

			const user = await SessionContainer.instance().session.resolveUserAndNotify(response.user);
			return user as CSMe;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async addEnterpriseProviderHost(
		request: AddEnterpriseProviderHostRequest
	): Promise<AddEnterpriseProviderHostResponse> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.put<CSAddProviderHostRequest, CSAddProviderHostResponse>(
				`/provider-host/${request.provider}/${request.teamId}`,
				{ host: request.host, ...request.data },
				tokenHolder.accessToken
			);

			await SessionContainer.instance().teams.resolve({
				type: MessageType.Teams,
				data: [response.team],
			});
			SessionContainer.instance().session.updateProviders();
			return { providerId: response.providerId };
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async removeEnterpriseProviderHost(request: RemoveEnterpriseProviderHostRequest): Promise<void> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.delete<CSRemoveProviderHostResponse>(
				`/provider-host/${request.provider}/${request.teamId}/${encodeURIComponent(
					request.providerId
				)}`,
				tokenHolder.accessToken
			);

			await SessionContainer.instance().teams.resolve({
				type: MessageType.Teams,
				data: [response.team],
			});
			SessionContainer.instance().session.updateProviders();
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@lspHandler(ProviderTokenRequestType)
	async setProviderToken(request: ProviderTokenRequest) {
		const repoInfo =
			request.repoInfo &&
			`${request.repoInfo.teamId}|${request.repoInfo.repoId}|${request.repoInfo.commitHash}`;
		return this.post(`/no-auth/provider-token/${request.provider}`, {
			token: request.token,
			data: request.data,
			invite_code: request.inviteCode,
			repo_info: repoInfo || undefined,
			no_signup: request.noSignup,
			signup_token: request.signupToken,
		});
	}

	@lspHandler(UploadFileRequestType)
	async uploadFile(request: UploadFileRequest) {
		const formData = new FormData();
		if (request.buffer) {
			if (typeof request.buffer !== "string") {
				throw new ResponseError(ERROR_GENERIC_USE_ERROR_MESSAGE, "Unsupported buffer type");
			}
			const base64String = request.buffer;
			// string off dataUri / content info from base64 string
			let bareString = "";
			const commaIndex = base64String.indexOf(",");
			if (commaIndex === -1) {
				bareString = base64String;
			} else {
				bareString = base64String.substring(commaIndex + 1);
			}
			formData.append("file", new Blob([await Buffer.from(bareString, "base64")]), request.name);
		}
		const url = `${this.baseUrl}/upload-file/${this.teamId}`;
		const tokenHeader =
			tokenHolder.tokenType === CSAccessTokenType.ACCESS_TOKEN ? "x-access-token" : "x-id-token";
		const headers = new Headers({
			//Authorization: `Bearer ${this._token}`,
			[tokenHeader]: tokenHolder.accessToken!,
		});

		const response = await this.fetchClient.customFetch(url, {
			method: "post",
			body: formData,
			headers,
		});
		if (!response.ok) {
			const body = await response.text();
			throw new ResponseError(
				ERROR_GENERIC_USE_ERROR_MESSAGE,
				`Error uploading file: ${response.status} ${body}`
			);
		}
		return await response.json();
	}

	@lspHandler(GetNewRelicSignupJwtTokenRequestType)
	async getNewRelicSignupJwtToken(
		request: GetNewRelicSignupJwtTokenRequest
	): Promise<GetNewRelicSignupJwtTokenResponse> {
		const session = SessionContainer.instance().session;
		Logger.log(`getNewRelicSignupJwtToken environment: ${session.environment}`);
		if (session.environment === CodeStreamEnvironment.Unknown || isEmpty(session.environment)) {
			await session.verifyConnectivity();
		}
		const response = await this.get<GetNewRelicSignupJwtTokenResponse>(
			`/signup-jwt`,
			tokenHolder.accessToken
		);
		const baseLandingUrl =
			SessionContainer.instance().session.newRelicLandingServiceUrl ??
			"https://landing.service.newrelic.com";
		return {
			...response,
			baseLandingUrl,
		};
	}

	lookupNewRelicOrganizations(
		request: LookupNewRelicOrganizationsRequest
	): Promise<LookupNewRelicOrganizationsResponse> {
		return this.post<LookupNewRelicOrganizationsRequest, LookupNewRelicOrganizationsResponse>(
			`/lookup-nr-orgs`,
			request,
			tokenHolder.accessToken
		);
	}

	announceHistoryFetch(info: HistoryFetchInfo): void {
		const session = SessionContainer.instance().session;
		const queryParams: ParsedUrlQueryInput = { ...info };
		if (session.announceHistoryFetches()) {
			this.get<{}>("/history-fetch?" + qs.stringify(queryParams));
		}
	}

	async fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse> {
		throw new Error("Not supported");
	}

	async delete<R extends object>(url: string, token?: string | AccessToken): Promise<R> {
		const init: ExtraRequestInit = {};
		if (!token && url.indexOf("/no-auth/") === -1) {
			token = tokenHolder.accessToken;
			init.skipInterceptors = true;
		}
		let resp = undefined;
		if (resp === undefined) {
			resp = this.fetch<R>(url, { ...init, method: "DELETE" }, token) as Promise<R>;
		}
		return resp;
	}

	async get<R extends object>(url: string, token?: string | AccessToken): Promise<R> {
		const init: ExtraRequestInit = {};
		if (!token && url.indexOf("/no-auth/") === -1) {
			token = tokenHolder.accessToken;
			init.skipInterceptors = true;
		}
		return this.fetch<R>(url, { ...init, method: "GET" }, token) as Promise<R>;
	}

	async post<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string | AccessToken
	): Promise<R> {
		const init: ExtraRequestInit = {};
		if (!token && url.indexOf("/no-auth/") === -1) {
			token = tokenHolder.accessToken;
			init.skipInterceptors = true;
		}
		return this.fetch<R>(
			url,
			{
				...init,
				method: "POST",
				body: JSON.stringify(body),
			},
			token
		);
	}

	async put<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string | AccessToken,
		init?: ExtraRequestInit
	): Promise<R> {
		if (!init) {
			init = {};
		}
		if (!token && url.indexOf("/no-auth/") === -1) {
			// Logger.debug(`token swapped to this._token ${tokenHolder.accessToken}`);
			token = tokenHolder.accessToken;
			init.skipInterceptors = true;
		}
		return this.fetch<R>(
			url,
			{
				...init,
				method: "PUT",
				body: JSON.stringify(body),
			},
			token
		);
	}

	/*private*/
	async fetch<R extends object>(
		url: string,
		init?: RequestInit,
		accessToken?: string | AccessToken
	): Promise<R> {
		const start = process.hrtime();

		let token, tokenType, refreshToken;
		if (typeof accessToken === "object") {
			token = accessToken.value;
			tokenType = accessToken.tokenType;
			refreshToken = accessToken.refreshToken;
		} else {
			token = accessToken;
			tokenType = tokenHolder.tokenInfo?.tokenType;
			refreshToken = tokenHolder.tokenInfo?.refreshToken;
		}
		const sanitizedUrl = CodeStreamApiProvider.sanitizeUrl(url);
		let traceResult;
		try {
			if (init !== undefined || token !== undefined) {
				if (init === undefined) {
					init = {};
				}

				if (init.headers === undefined) {
					init.headers = new Headers();
				}

				if (init.headers instanceof Headers) {
					init.headers.append("Accept", "application/json");
					init.headers.append("Content-Type", "application/json");
					if (!isEmpty(this._clientId)) {
						init.headers.append("X-CS-Client-Machine-ID", this._clientId);
					}

					if (token !== undefined) {
						if (tokenType) {
							if (tokenType === CSAccessTokenType.ACCESS_TOKEN) {
								init.headers.append("x-access-token", token);
							} else {
								init.headers.append("x-id-token", token);
							}
						} else {
							init.headers.append("Authorization", `Bearer ${token}`);
						}
					}

					// for Unified Identity, set this header ... eventually we can remove this,
					// when all clients are updated to the Unified Identity version
					init.headers.append("X-CS-Enable-UId", "1");
					init.headers.append("X-CS-Plugin-IDE", this._version.ide.name);
					init.headers.append("X-CS-Plugin-IDE-Detail", this._version.ide.detail);
					init.headers.append(
						"X-CS-Plugin-Version",
						`${this._version.extension.version}+${this._version.extension.build}`
					);
					init.headers.append("X-CS-IDE-Version", this._version.ide.version);
				}
			}

			const method = (init && init.method) || "GET";
			const absoluteUrl = `${this.baseUrl}${url}`;

			const context =
				this._middleware.length > 0
					? ({
							url: absoluteUrl,
							method: method,
							request: init,
					  } as CodeStreamApiMiddlewareContext)
					: undefined;

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onRequest === undefined) continue;

					try {
						await mw.onRequest(context);
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onRequest FAILED`
						);
					}
				}
			}

			let json: Promise<R> | undefined;
			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onProvideResponse === undefined) continue;

					try {
						json = mw.onProvideResponse(context);
						if (json !== undefined) break;
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onProvideResponse FAILED`
						);
					}
				}
			}

			let id;
			let resp: Response | undefined;
			let retryCount = 0;
			let triedRefresh = false;
			let responseBody = "";
			if (json === undefined) {
				while (!resp) {
					[resp, retryCount] = await this.fetchClient.fetchCore(0, absoluteUrl, init);
					if (!resp.ok) {
						const resp2 = resp.clone();
						responseBody = (await resp2.text()) ?? "";
					}
					if (
						!triedRefresh &&
						!resp.ok &&
						(resp.status === 403 || resp.status === 401) &&
						refreshToken &&
						init?.headers instanceof Headers
					) {
						if (responseBody.match(/token expired/) || resp.status === 401) {
							Logger.log(
								"On CodeStream API request, token was found to be expired, attempting to refresh..."
							);
							let tokenInfo;
							try {
								tokenInfo = await this.refreshNewRelicToken(refreshToken);
								Logger.log("NR access token successfully refreshed, trying request again...");
								token = tokenInfo.accessToken;
								if (tokenInfo.tokenType === CSAccessTokenType.ACCESS_TOKEN) {
									init?.headers.set("x-access-token", token);
								} else {
									init?.headers.set("x-id-token", token);
								}
								//init.headers.set("Authorization", `Bearer ${token}`);
								triedRefresh = true;
								resp = undefined;
							} catch (ex) {
								Logger.warn("Exception thrown refreshing NR access token:", ex);
								// allow the original (failed) flow to continue, more meaningful than throwing an exception on refresh
							}
						} else {
							Logger.warn(`Non-expired token found with ${resp.status} error, not refreshing`);
						}
					}
				}

				if (context !== undefined) {
					context.response = resp;
				}

				id = resp.headers.get("x-request-id");

				if (resp.ok) {
					traceResult = `API(${id}): Completed ${method} ${sanitizedUrl}`;
					json = resp.json() as Promise<R>;
				}
			}

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onResponse === undefined) continue;

					try {
						await mw.onResponse(context, json);
					} catch (ex) {
						Logger.error(
							ex,
							`API(${id}): ${method} ${this.baseUrl} ${sanitizedUrl}: Middleware(${mw.name}).onResponse FAILED`
						);
					}
				}
			}

			if (resp !== undefined && !resp.ok) {
				traceResult = `API(${id}): FAILED(${retryCount}x) ${method} ${this.baseUrl} ${sanitizedUrl} ${resp.status}`;
				Container.instance().errorReporter.reportBreadcrumb({
					message: traceResult,
					category: "apiErrorResponse",
				});
				throw await this.handleErrorResponse(resp);
			}

			const _json = await json;

			if (Container.instance().agent.recordRequests && init) {
				const now = Date.now();
				const { method, body } = init;

				const urlForFilename = sanitize(
					sanitizedUrl.split("?")[0].replace(/\//g, "_").replace("_", "")
				);
				const filename = `/tmp/dump-${now}-csapi-${method}-${urlForFilename}.json`;

				const out = {
					url: url,
					request: typeof body === "string" ? JSON.parse(body) : body,
					response: _json,
				};
				const outString = JSON.stringify(out, null, 2);

				await fs.writeFile(filename, outString, { encoding: "utf8" });
				Logger.log(`Written ${filename}`);
			}

			return CodeStreamApiProvider.normalizeResponse(_json);
		} finally {
			Logger.log(
				`${traceResult}${
					init && init.body ? ` body=${CodeStreamApiProvider.sanitize(init && init.body)}` : ""
				} \u2022 ${Strings.getDurationMilliseconds(start)} ms`
			);
		}
	}

	private async handleErrorResponse(response: Response): Promise<Error> {
		let message = response.statusText;
		let data: any;
		if (response.status >= 400 && response.status < 500) {
			try {
				data = await response.json();
				if (data.code) {
					message += `(${data.code})`;
				}
				if (data.message) {
					message += `: ${data.message}`;
				}
				if (data.info) {
					if (data.info.name) {
						message += `\n${data.info.name || data.info}`;
					}
					if (data.message === "Validation error") {
						message += ` ${Array.from(Objects.values(data.info)).join(", ")}`;
					}
				}
			} catch {}
		}

		Container.instance().errorReporter.reportMessage({
			source: "agent",
			type: ReportingMessageType.Error,
			message: `[Server Error]: ${message}`,
			extra: {
				data,
				responseStatus: response.status,
				requestId: response.headers.get("x-request-id"),
				requestUrl: response.url,
			},
		});

		return new ServerError(message, data, response.status);
	}

	// TODO: Move somewhere more generic
	static isStreamSubscriptionRequired(stream: CSStream, userId: string, teamId: string): boolean {
		if (stream.teamId !== teamId) return false;
		if (stream.deactivated || stream.type === StreamType.File) return false;
		if (stream.type === StreamType.Channel) {
			if (stream.memberIds === undefined) return false;
			if (!stream.memberIds.includes(userId)) return false;
		}
		return true;
	}

	// TODO: Move somewhere more generic
	static isStreamUnsubscribeRequired(stream: CSStream, userId: string): boolean {
		if (stream.type !== StreamType.Channel) {
			return false;
		}
		if (stream.memberIds && !stream.memberIds.includes(userId)) {
			return true;
		}
		return false;
	}

	static normalizeResponse<R extends object>(obj?: { [key: string]: any }): R {
		// FIXME maybe the api server should never return arrays with null elements?
		if (obj != null) {
			for (const [key, value] of Object.entries(obj)) {
				if (key === "_id") {
					obj["id"] = value;
				}

				if (Array.isArray(value)) {
					obj[key] = value.map(v => this.normalizeResponse(v));
				} else if (typeof value === "object") {
					obj[key] = this.normalizeResponse(value);
				}
			}
		}

		return obj as R;
	}

	static sanitize(body: BodyInit | undefined) {
		if (body === undefined || typeof body !== "string") return "";

		return body.replace(
			/("\w*?apikey\w*?":|"\w*?password\w*?":|"\w*?secret\w*?":|"\w*?token\w*?":)".*?"/gi,
			'$1"<hidden>"'
		);
	}

	static sanitizeUrl(url: string) {
		return url.replace(
			/(\b\w*?apikey\w*?=|\b\w*?password\w*?=|\b\w*?secret\w*?=|\b\w*?token\w*?=)(?:.+?)(?=&|$)/gi,
			"$1<hidden>"
		);
	}

	async verifyConnectivity() {
		const response: VerifyConnectivityResponse = {
			ok: true,
		};

		try {
			Logger.log("Verifying API server connectivity");

			const resp = await this.fetchClient.customFetch(this.baseUrl + "/no-auth/capabilities", {
				timeout: 5000,
			});

			Logger.log(`API server status: ${resp.status}`);
			if (!resp.ok) {
				response.ok = false;
				response.error = {
					message: resp.status.toString() + resp.statusText,
					maintenanceMode: !!resp.headers.get("x-cs-api-maintenance-mode"),
				};
			} else {
				const json: any = await resp.json();
				response.capabilities = json.capabilities;
				response.environment = json.environment;
				response.isOnPrem = json.isOnPrem;
				response.isProductionCloud = json.isProductionCloud;
				response.newRelicLandingServiceUrl = json.newRelicLandingServiceUrl;
				response.newRelicApiUrl = json.newRelicApiUrl;
				response.newRelicSecApiUrl = json.newRelicSecApiUrl;
				response.o11yServerUrl = json.o11yServerUrl;
				response.telemetryEndpoint = json.telemetryEndpoint;
				response.environmentHosts = json.environmentHosts;
			}
		} catch (err) {
			Logger.log(`Error connecting to the API server: ${err.message}`);
			response.ok = false;
			if (err.name === "AbortError") {
				response.error = {
					message: "Connection to CodeStream API server timed out after 5 seconds",
				};
			} else {
				response.error = {
					message: err.message,
				};
			}
		}

		return response;
	}

	async pollForMaintenanceMode() {
		const response: PollForMaintenanceModeResponse = {
			ok: true,
		};

		try {
			Logger.log("Verifying API server connectivity");

			const nonJsonCapabilitiesResponse = await this.fetchClient.customFetch(
				this.baseUrl + "/no-auth/capabilities",
				{
					timeout: 5000,
				}
			);

			response.maintenanceMode = !!nonJsonCapabilitiesResponse.headers.get(
				"x-cs-api-maintenance-mode"
			);
		} catch (err) {
			Logger.log(`Error connecting to the API server: ${err.message}`);
			response.ok = false;
			if (err.name === "AbortError") {
				response.error = {
					message: "Connection to CodeStream API server timed out after 5 seconds",
				};
			} else {
				response.error = {
					message: err.message,
				};
			}
		}

		return response;
	}
}
