"use strict";
import {
	AccessToken,
	Capabilities,
	ChangeDataType,
	CodeStreamEnvironment,
	CodeStreamEnvironmentInfo,
	DidRefreshAccessTokenNotification,
	DidChangeDataNotification,
	DidChangeDocumentMarkersNotification,
	DidChangePullRequestCommentsNotification,
	isLoginFailResponse,
	LoginSuccessResponse,
	AgentOpenUrlRequest,
	AgentValidateLanguageExtensionRequest,
	PasswordLoginRequestType,
	TokenLoginRequestType
} from "@codestream/protocols/agent";
import {
	ChannelServiceType,
	CSChannelStream,
	CSDirectStream,
	LoginResult,
	CSMe,
	CSEligibleJoinCompany
} from "@codestream/protocols/api";
import { ConfigurationTarget, Disposable, Event, EventEmitter, Uri } from "vscode";

import { openUrl } from "../urlHandler";
import { validateExtension } from "../extensionValidationHandler";
import { WorkspaceState } from "../common";
import { configuration } from "../configuration";
import { Container } from "../container";
import { Logger } from "../logger";
import { Functions, log, Strings } from "../system";
import { DocMarker } from "./models/marker";
import { Post } from "./models/post";
import { Repository } from "./models/repository";
import {
	ChannelStream,
	ChannelStreamCreationOptions,
	DirectStream,
	ServiceChannelStreamCreationOptions,
	Stream,
	StreamType
} from "./models/stream";
import { Team } from "./models/team";
import { User } from "./models/user";
import {
	MergeableEvent,
	PostsChangedEvent,
	SessionChangedEvent,
	SessionChangedEventType,
	SessionStatusChangedEvent,
	TextDocumentMarkersChangedEvent,
	PullRequestCommentsChangedEvent,
	ReviewsChangedEvent,
	PullRequestsChangedEvent,
	PreferencesChangedEvent
} from "./sessionEvents";
import { SessionState } from "./sessionState";
import * as TokenManager from "./tokenManager";
import { SaveTokenReason } from "./tokenManager";

export {
	ChannelStream,
	ChannelStreamCreationOptions,
	CodeStreamEnvironment,
	CodeStreamEnvironmentInfo,
	DirectStream,
	DocMarker,
	Post,
	PostsChangedEvent,
	Repository,
	SessionChangedEventType,
	SessionStatusChangedEvent,
	Stream,
	StreamType,
	Team,
	TextDocumentMarkersChangedEvent,
	User
};

const instanceId = Functions.shortUuid();

export interface StreamThread {
	id: string | undefined;
	streamId: string;
}

export enum SessionSignedOutReason {
	InvalidRefreshToken = "invalidRefreshToken",
	MaintenanceMode = "maintenanceMode",
	NetworkIssue = "networkIssue",
	SignInFailure = "signInFailure",
	UnsupportedVersion = "unsupportedVersion",
	UserSignedOutFromExtension = "userSignedOutFromExtension",
	UserSignedOutFromWebview = "userSignedOutFromWebview",
	UserWentOffline = "userWentOffline"
}

export enum SessionStatus {
	SignedOut = "signedOut",
	SigningIn = "signingIn",
	SignedIn = "signedIn",
	SigningOut = "signingOut"
}

export class CodeStreamSession implements Disposable {
	private _onDidChangeTextDocumentMarkers = new EventEmitter<TextDocumentMarkersChangedEvent>();
	get onDidChangeTextDocumentMarkers(): Event<TextDocumentMarkersChangedEvent> {
		return this._onDidChangeTextDocumentMarkers.event;
	}

	private _onDidChangePullRequestComments = new EventEmitter<PullRequestCommentsChangedEvent>();
	get onDidChangePullRequestComments(): Event<PullRequestCommentsChangedEvent> {
		return this._onDidChangePullRequestComments.event;
	}

	private _onDidChangePosts = new EventEmitter<PostsChangedEvent>();
	get onDidChangePosts(): Event<PostsChangedEvent> {
		return this._onDidChangePosts.event;
	}

	private fireDidChangePosts = createMergableDebouncedEvent(this._onDidChangePosts);

	private _onDidChangeReviews = new EventEmitter<ReviewsChangedEvent>();
	get onDidChangeReviews(): Event<ReviewsChangedEvent> {
		return this._onDidChangeReviews.event;
	}

	private fireDidChangeReviews = createMergableDebouncedEvent(this._onDidChangeReviews);

	private _onDidChangeSessionStatus = new EventEmitter<SessionStatusChangedEvent>();
	get onDidChangeSessionStatus(): Event<SessionStatusChangedEvent> {
		return this._onDidChangeSessionStatus.event;
	}

	private _onDidChangePreferences = new EventEmitter<PreferencesChangedEvent>();
	get onDidChangePreferences(): Event<PreferencesChangedEvent> {
		return this._onDidChangePreferences.event;
	}

	private fireDidChangePreferences = Functions.debounce(
		(e: PreferencesChangedEvent) => this._onDidChangePreferences.fire(e),
		250,
		{ maxWait: 1000 }
	);

	private _onDidChangePullRequests = new EventEmitter<PullRequestsChangedEvent>();
	get onDidChangePullRequests(): Event<PullRequestsChangedEvent> {
		return this._onDidChangePullRequests.event;
	}

	private fireDidChangePullRequests = createMergableDebouncedEvent(this._onDidChangePullRequests);

	private _onDidChangeCodelenses = new EventEmitter<void>();
	get onDidChangeCodelenses(): Event<void> {
		return this._onDidChangeCodelenses.event;
	}

	private _agentCapabilities: Capabilities | undefined;

	get capabilities() {
		const ide: Capabilities = {
			codemarkApply: true,
			codemarkCompare: true,
			editorTrackVisibleRange: true,
			services: {
				vsls: undefined
			}
		};

		// If we have no agent caps then just use the ide's
		if (this._agentCapabilities === undefined) return ide;

		// Mix IDE caps in with the agent caps
		return {
			...ide,
			...this._agentCapabilities
		};
	}

	private _disposableUnauthenticated: Disposable | undefined;
	private _disposableAuthenticated: Disposable | undefined;

	private _email: string | undefined;
	private _eligibleJoinCompanies: CSEligibleJoinCompany[] | undefined;
	private _teamId: string | undefined;
	private _environmentInfo: CodeStreamEnvironmentInfo | undefined;
	private _isOnPrem: boolean | undefined;
	private _id: string | undefined;
	private _loginPromise: Promise<LoginResult> | undefined;
	private _state: SessionState | undefined;

	constructor(private _serverUrl: string) {
		this.setServerUrl(_serverUrl);
		const config = Container.config;

		this._disposableUnauthenticated = Disposable.from(
			Container.agent.onDidStartLogin(() => this.setStatus(SessionStatus.SigningIn)),
			Container.agent.onDidFailLogin(() => this.setStatus(SessionStatus.SignedOut)),
			Container.agent.onDidLogin(params => {
				this.completeLogin(
					SaveTokenReason.LOGIN_SUCCESS,
					params.data,
					params.data.loginResponse.teamId
				);
			}),
			Container.agent.onDidRequireRestart(() => {
				this.logout();
			}),
			Container.agent.onDidEncounterMaintenanceMode(() => {
				this.logout();
			}),
			Container.agent.onOpenUrl(async (params: AgentOpenUrlRequest) => {
				await openUrl(params.url);
			}),
			Container.agent.onValidateLanguageExtension(
				async (params: AgentValidateLanguageExtensionRequest) => {
					if (params.language) {
						await validateExtension(params?.language);
					}
				}
			),
			Container.agent.onDidRestart(async () => {
				Logger.log("Agent restarted unexpectedly, waiting for it to reinitialize...");
				delete this._loginPromise;
				const teamId = this._teamId;
				const disposable = Container.agent.onAgentInitialized(async () => {
					Logger.log("Agent reinitialized, initiating auto-signin...");
					if (teamId) {
						await this.autoSignin(teamId);
					}
					disposable.dispose();
				});
			}),
			Container.agent.onDidSetEnvironment(info => {
				this._environmentInfo = info;
			})
		);

		if (config.autoSignIn) {
			Logger.log(`autoSignIn enabled`);
			const teamId = Container.context.workspaceState.get(WorkspaceState.TeamId) as string;
			if (teamId) {
				Logger.log(`autoSignIn found teamId`);
				this.setStatus(SessionStatus.SigningIn);
				const disposable = Container.agent.onDidStart(async () => {
					await this.autoSignin(teamId);
					disposable.dispose();
				});
			} else {
				Logger.log(`autoSignIn did not find teamId`);
			}
		} else {
			Logger.log(`autoSignIn disabled`);
		}
	}

	async autoSignin(teamId: string) {
		const config = Container.config;
		let token =
			(await TokenManager.get(this._serverUrl, config.email, teamId)) ||
			(await TokenManager.get(this._serverUrl, config.email));
		if (token) {
			this.login(SaveTokenReason.AUTO_SIGN_IN, config.email, token, teamId);
		} else {
			this.setStatus(SessionStatus.SignedOut);
		}
	}

	dispose() {
		this._disposableUnauthenticated && this._disposableUnauthenticated.dispose();
		this._disposableAuthenticated && this._disposableAuthenticated.dispose();
	}

	private onDocumentMarkersChanged(e: DidChangeDocumentMarkersNotification) {
		this._onDidChangeTextDocumentMarkers.fire(
			new TextDocumentMarkersChangedEvent(this, Uri.parse(e.textDocument.uri))
		);
	}

	private onCodelensesChanged() {
		this._onDidChangeCodelenses.fire(undefined);
	}

	private onPullRequestCommentsChanged(_e: DidChangePullRequestCommentsNotification) {
		this._onDidChangePullRequestComments.fire(new PullRequestCommentsChangedEvent(this));
	}

	private onDataChanged(e: DidChangeDataNotification) {
		switch (e.type) {
			case ChangeDataType.Posts:
				this.fireDidChangePosts(new PostsChangedEvent(this, e));
				break;
			case ChangeDataType.Teams:
				this._state!.updateTeams();
				break;
			case ChangeDataType.Users:
				const user = e.data.find(u => u.id === this.userId) as CSMe;
				if (user != null) {
					this._state!.updateUser(user);
				}
				break;
			case ChangeDataType.Preferences:
				this._state!.updatePreferences(e.data);
				this.fireDidChangePreferences(new PreferencesChangedEvent(this, e));
				break;
			case ChangeDataType.Reviews: {
				this.fireDidChangeReviews(new ReviewsChangedEvent(this, e));
				Container.diffContents.clearLocalContents(e.data.map(_ => _.id));
				break;
			}
			case ChangeDataType.PullRequests:
				this.fireDidChangePullRequests(new PullRequestsChangedEvent(this, e));
				break;
		}
	}

	get email() {
		return this._email;
	}

	get eligibleJoinCompanies() {
		return this._eligibleJoinCompanies;
	}

	get id() {
		return this._id;
	}

	get environmentInfo(): CodeStreamEnvironmentInfo {
		return (
			this._environmentInfo || {
				environment: CodeStreamEnvironment.Unknown,
				isOnPrem: false,
				isProductionCloud: false
			}
		);
	}

	get environment(): CodeStreamEnvironment | string {
		return this._environmentInfo
			? this._environmentInfo.environment
			: CodeStreamEnvironment.Unknown;
	}

	get isOnPrem(): boolean {
		return this._environmentInfo ? this._environmentInfo.isOnPrem : false;
	}

	get isProductionCloud(): boolean {
		return this._environmentInfo ? this._environmentInfo.isProductionCloud : false;
	}

	get serverUrl(): string {
		return this._serverUrl;
	}

	setServerUrl(url: string, environment?: string) {
		this._serverUrl = url;
		if (environment && this._environmentInfo) {
			this._environmentInfo.environment = environment;
		}
	}

	onAccessTokenRefreshed(e: DidRefreshAccessTokenNotification) {
		TokenManager.addOrUpdate(SaveTokenReason.REFRESH, e.url, e.email, e.teamId, {
			url: e.url,
			email: e.email,
			value: e.token,
			refreshToken: e.refreshToken,
			tokenType: e.tokenType,
			teamId: e.teamId
		});
	}

	get signedIn() {
		return this._status === SessionStatus.SignedIn;
	}

	private _status: SessionStatus = SessionStatus.SignedOut;
	get status() {
		return this._status;
	}

	private setStatus(
		status: SessionStatus,
		signedOutReason?: SessionSignedOutReason,
		force: boolean = false
	) {
		if (!force && this._status === status) return;

		this._status = status;
		const e: SessionStatusChangedEvent = {
			getStatus: () => this._status,
			session: this
		};
		e.reason = signedOutReason;

		this._onDidChangeSessionStatus.fire(e);
	}

	@signedIn
	get team() {
		return this._state!.team;
	}

	@signedIn
	get company() {
		return this._state!.company;
	}

	@signedIn
	get user() {
		return this._state!.user;
	}

	get userId() {
		return this._state!.userId;
	}

	@signedIn
	async getChannelByName(name: string): Promise<ChannelStream | undefined> {
		const response = await Container.agent.streams.fetch([StreamType.Channel]);
		const stream = (response.streams as CSChannelStream[]).find(s => s.name === name);
		if (stream === undefined) return stream;

		return new ChannelStream(this, stream);
	}

	@signedIn
	async getChannelByService(
		type: ChannelServiceType,
		key: string
	): Promise<ChannelStream | undefined> {
		const response = await Container.agent.streams.fetch([StreamType.Channel]);
		const stream = (response.streams as CSChannelStream[]).find(
			s => s.serviceType === type && s.serviceKey === key
		);
		if (stream === undefined) return stream;

		return new ChannelStream(this, stream);
	}

	@signedIn
	async getOrCreateChannelByService(
		type: ChannelServiceType,
		key: string,
		creationOptions: ServiceChannelStreamCreationOptions = {}
	) {
		const stream = await this.getChannelByService(type, key);
		if (stream !== undefined) {
			if (
				stream.memberIds != null &&
				creationOptions.membership != null &&
				typeof creationOptions.membership !== "string"
			) {
				// Ensure correct membership
				const missingIds = creationOptions.membership.filter(id => !stream.memberIds!.includes(id));

				const entity = (await Container.agent.streams.invite(stream.id, missingIds))
					.stream as CSChannelStream;

				return new ChannelStream(this, entity);
			}

			return stream;
		}

		const s = (
			await Container.agent.streams.createChannel(
				creationOptions.name!,
				creationOptions.membership,
				creationOptions.privacy,
				creationOptions.purpose,
				{
					serviceType: type,
					serviceKey: key,
					serviceInfo: creationOptions.serviceInfo
				}
			)
		).stream;
		if (s === undefined) throw new Error("Unable to create stream");

		return new ChannelStream(this, s);
	}

	@signedIn
	async getOrCreateChannelByName(
		name: string,
		creationOptions: ChannelStreamCreationOptions = {}
	): Promise<ChannelStream> {
		const stream = await this.getChannelByName(name);
		if (stream !== undefined) {
			if (
				stream.memberIds != null &&
				creationOptions.membership != null &&
				typeof creationOptions.membership !== "string"
			) {
				// Ensure correct membership
				const missingIds = creationOptions.membership.filter(id => !stream.memberIds!.includes(id));

				const entity = (await Container.agent.streams.invite(stream.id, missingIds))
					.stream as CSChannelStream;

				return new ChannelStream(this, entity);
			}

			return stream;
		}

		const s = (
			await Container.agent.streams.createChannel(
				name,
				creationOptions.membership,
				creationOptions.privacy,
				creationOptions.purpose
			)
		).stream;
		if (s === undefined) throw new Error("Unable to create stream");

		return new ChannelStream(this, s);
	}

	@signedIn
	async getDMByMembers(memberIds: string[]): Promise<DirectStream | undefined> {
		const response = await Container.agent.streams.fetch([StreamType.Direct], memberIds);

		const stream = response.streams[0] as CSDirectStream | undefined;
		if (stream === undefined) return stream;

		return new DirectStream(this, stream);
	}

	@signedIn
	async getOrCreateDMByMembers(memberIds: string[]): Promise<DirectStream> {
		const stream = await this.getDMByMembers(memberIds);
		if (stream !== undefined) return stream;

		const s = (await Container.agent.streams.createDirect(memberIds)).stream;
		if (s === undefined) throw new Error("Unable to create stream");

		return new DirectStream(this, s);
	}

	@signedIn
	async getStream(streamId: string): Promise<Stream | undefined> {
		const stream = (await Container.agent.streams.get(streamId)).stream;
		if (stream === undefined) return undefined;

		switch (stream.type) {
			case StreamType.Channel:
				return new ChannelStream(this, stream);
			case StreamType.Direct:
				return new DirectStream(this, stream);
			default:
				throw new Error("Invalid stream type");
		}
	}

	goOffline(hideWebview: boolean = true) {
		if (hideWebview) {
			Container.sidebar.hide();
		}
		return this.logout(SessionSignedOutReason.UserWentOffline);
	}

	async reconnect() {
		Container.sidebar.hide();
		await this.logout(SessionSignedOutReason.UserWentOffline);
		return Container.commands.signIn();
	}

	@signedIn
	hasSingleTeam(): boolean {
		return this._state!.hasSingleTeam();
	}

	@signedIn
	hasSingleCompany(): boolean {
		return this._state!.hasSingleCompany();
	}

	async login(
		saveTokenReason: SaveTokenReason,
		email: string,
		password: string,
		teamId?: string
	): Promise<LoginResult>;
	async login(
		saveTokenReason: SaveTokenReason,
		email: string,
		token: AccessToken,
		teamId?: string
	): Promise<LoginResult>;
	async login(
		saveTokenReason: SaveTokenReason,
		email: string,
		passwordOrToken: string | AccessToken,
		teamId: string
	): Promise<LoginResult> {
		if (this._loginPromise === undefined) {
			this._loginPromise = this.loginCore(saveTokenReason, email, passwordOrToken, teamId);
		}

		const result = await this._loginPromise;
		if (result !== LoginResult.Success) {
			this._loginPromise = undefined;
		}
		return result;
	}

	@log()
	async logout(
		reason: SessionSignedOutReason = SessionSignedOutReason.UserSignedOutFromWebview,
		newServerUrl?: string,
		newEnvironment?: string
	) {
		this._id = undefined;
		this._loginPromise = undefined;

		this.setStatus(SessionStatus.SigningOut);

		try {
			if (
				reason === SessionSignedOutReason.UserSignedOutFromExtension ||
				reason === SessionSignedOutReason.UserSignedOutFromWebview ||
				reason === SessionSignedOutReason.InvalidRefreshToken
			) {
				// Clear the access token
				await Container.context.workspaceState.update(WorkspaceState.TeamId, undefined);
				await TokenManager.clear(SaveTokenReason.LOGOUT, this._serverUrl, this._email!);
				await TokenManager.clear(
					SaveTokenReason.LOGOUT,
					this._serverUrl,
					this._email!,
					this._teamId!
				);
			} else {
				Logger.log(`NOT clearing access token, reason: ${reason}`);
			}

			this._email = undefined;
			this._status = SessionStatus.SignedOut;
			if (newEnvironment && this._environmentInfo) {
				this._environmentInfo!.environment = newEnvironment;
				Container.statusBar.update();
			}

			if (Container.agent !== undefined) {
				void (await Container.agent.logout(reason, newServerUrl));
			}

			if (this._disposableAuthenticated !== undefined) {
				this._disposableAuthenticated.dispose();
				this._disposableAuthenticated = undefined;
			}
		} finally {
			// Clean up saved state
			this._state = undefined;

			setImmediate(() => this.setStatus(SessionStatus.SignedOut, reason, true));
		}
	}

	private async loginCore(
		saveTokenReason: SaveTokenReason,
		email: string,
		passwordOrToken: string | AccessToken,
		teamId: string
	): Promise<LoginResult> {
		this.setServerUrl(Container.config.serverUrl);
		Logger.log(`Signing ${email} into CodeStream (${this.serverUrl})`);

		try {
			this.setStatus(SessionStatus.SigningIn);

			let response;
			if (typeof passwordOrToken === "string") {
				response = await Container.agent.sendRequest(PasswordLoginRequestType, {
					email: email,
					password: passwordOrToken
				});
			} else {
				response = await Container.agent.sendRequest(TokenLoginRequestType, {
					token: passwordOrToken
				});
			}

			if (isLoginFailResponse(response)) {
				if (response.error !== LoginResult.VersionUnsupported) {
					// Clear the access token
					await TokenManager.clear(SaveTokenReason.LOGIN_ERROR, this._serverUrl, email, teamId);
				}

				this.setStatus(SessionStatus.SignedOut, SessionSignedOutReason.SignInFailure);

				return response.error;
			}

			await this.completeLogin(saveTokenReason, response, teamId);

			return LoginResult.Success;
		} catch (ex) {
			ex.message = ex.message.replace("Request initialize failed with message: ", "CodeStream: ");

			Logger.error(ex);
			void (await this.logout(SessionSignedOutReason.SignInFailure));

			throw ex;
		}
	}

	private async completeLogin(
		saveTokenReason: SaveTokenReason,
		response: LoginSuccessResponse,
		teamId: string
	) {
		const user = response.loginResponse.user;
		const email = user.email;
		this._email = email;
		this._teamId = teamId;
		this._agentCapabilities = response.state.capabilities;
		this._eligibleJoinCompanies = response.loginResponse.user.eligibleJoinCompanies || [];

		// Create an id for this session
		this._id = Strings.sha1(`${instanceId}|${this.serverUrl}|${email}|${teamId}`.toLowerCase());

		const token = response.state.token;
		await TokenManager.addOrUpdate(saveTokenReason, this._serverUrl, email, teamId, token);

		// Update the saved e-mail on successful login
		if (email !== Container.config.email) {
			try {
				let target = ConfigurationTarget.Global;

				// Determine where to best save the e-mail
				const emailSetting = configuration.inspect(configuration.name("email").value);
				// If we have an e-mail in the workspace, save it to the workspace
				if (emailSetting !== undefined && emailSetting.workspaceValue !== undefined) {
					target = ConfigurationTarget.Workspace;
				} else {
					// If we don't have an e-mail in the workspace, check if the serverUrl is in the workspace
					const serverUrlSetting = configuration.inspect(configuration.name("serverUrl").value);
					// If we have a serverUrl in the workspace, save the e-mail to the workspace
					if (serverUrlSetting !== undefined && serverUrlSetting.workspaceValue !== undefined) {
						target = ConfigurationTarget.Workspace;
					}
				}

				await configuration.update(configuration.name("email").value, email, target);
			} catch (ex) {
				Logger.error(ex, "failed to update configuration");
			}
		}

		teamId = response.state.teamId;
		try {
			await Container.context.workspaceState.update(WorkspaceState.TeamId, teamId);
		} catch (ex) {
			Logger.error(ex, "failed to update workspaceState");
		}
		let companyId = "";
		if (teamId) {
			const team = response.loginResponse.teams.find(_ => _.id === teamId);
			if (team) {
				const company = response.loginResponse.companies.find(_ => _.id === team.companyId);
				if (company) {
					companyId = company.id;
				}
			}
		}

		this._state = new SessionState(this, companyId, teamId, response.loginResponse);

		this._disposableAuthenticated = Disposable.from(
			Container.agent.onDidChangeCodelenses(this.onCodelensesChanged, this),
			Container.agent.onValidateLanguageExtension(
				async (params: AgentValidateLanguageExtensionRequest) => {
					if (params.language) {
						await validateExtension(params.language);
					}
				}
			),
			Container.agent.onDidChangeDocumentMarkers(this.onDocumentMarkersChanged, this),
			Container.agent.onDidChangePullRequestComments(this.onPullRequestCommentsChanged, this),
			Container.agent.onDidChangeData(this.onDataChanged, this)
		);

		Logger.log(
			`${email} signed into CodeStream (${this.serverUrl}); userId=${this.userId}, teamId=${teamId}`
		);

		this.setStatus(SessionStatus.SignedIn, undefined);
	}
}

function createMergableDebouncedEvent<E extends MergeableEvent<SessionChangedEvent>>(emitter: {
	fire(e?: E): void;
}) {
	return Functions.debounceMerge(
		(e: E) => emitter.fire(e),
		(combined: E[] | undefined, current: E) => {
			if (combined === undefined) return [current];

			combined[0].merge(current);
			return combined;
		},
		250,
		{ maxWait: 1000 }
	);
}

function signedIn(target: CodeStreamSession, propertyName: string, descriptor: any) {
	if (typeof descriptor.value === "function") {
		const method = descriptor.value;
		descriptor.value = function (this: CodeStreamSession, ...args: any[]) {
			if (!this.signedIn) throw new Error("Not Logged In");
			return method!.apply(this, args);
		};
	} else if (typeof descriptor.get === "function") {
		const get = descriptor.get;
		descriptor.get = function (this: CodeStreamSession, ...args: any[]) {
			if (!this.signedIn) throw new Error("Not Logged In");
			return get!.apply(this, args);
		};
	}
}
