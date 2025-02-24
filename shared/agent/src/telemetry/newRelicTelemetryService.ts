"use strict";
import UUID from "uuid";
import uuid from "uuid/v4";
import { Logger } from "../logger";
import { CodeStreamSession, SessionStatusChangedEvent } from "../session";
import { SessionStatus } from "../types";

// FIXME: sorry, typescript purists: i simply gave up trying to get the type definitions for this module to work
import { TelemetryData, TelemetryEventName } from "@codestream/protocols/agent";
import Analytics from "analytics-node";
import { FetchCore } from "../system/fetchCore";
import { debug } from "../system";

/**
 * NOTE: this still sends one event to segment
 */
export class NewRelicTelemetryService {
	private _segmentInstance: Analytics | undefined;
	private _superProps: { [key: string]: any };
	private _distinctId?: string;
	private _anonymousId: string;
	private _hasOptedOut: boolean;
	private _session: CodeStreamSession;
	private _readyPromise: Promise<void>;

	private _onReady: () => void = () => {};
	private fetchClient = new FetchCore();

	/**
	 * @param {boolean} hasOptedOut - Has the user opted out of tracking?
	 * @param {{ [key: string]: string | number }} [opts] - Additional options
	 */
	constructor(
		session: CodeStreamSession,
		hasOptedOut: boolean,
		opts?: { [key: string]: string | number | boolean }
	) {
		Logger.debug("Telemetry created");

		this._session = session;
		this._superProps = {};
		this._hasOptedOut = false;

		session.ready().then(() => this.initialize());

		const props = {
			...opts,
			//Endpoint: session.versionInfo.ide.name,
			//"Endpoint Detail": session.versionInfo.ide.detail,
		};
		this._superProps = props;
		this._hasOptedOut = hasOptedOut;
		this._anonymousId = uuid();

		session.onDidChangeSessionStatus(this.onSessionStatusChanged);

		this._readyPromise = new Promise<void>(resolve => {
			this._onReady = () => {
				Logger.debug("Telemetry is ready");
				resolve();
			};
		});
	}

	async ready() {
		return this._readyPromise;
	}

	async initialize() {
		Logger.debug("Telemetry initializing...");
		let token = "";
		try {
			token = await this._session.api.getTelemetryKey();
		} catch (ex) {
			Logger.error(ex);
		}

		try {
			this._segmentInstance = new Analytics(token);
		} catch (ex) {
			Logger.error(ex);
		}
		Logger.debug("Telemetry initialized");
		this._onReady();
	}

	private onSessionStatusChanged = async (event: SessionStatusChangedEvent) => {
		if (event.getStatus() === SessionStatus.SignedOut) return;

		const { preferences } = await this._session.api.getPreferences();

		// legacy consent
		if ("telemetryConsent" in preferences) {
			this.setConsent(preferences.telemetryConsent!);
		} else {
			this.setConsent(!Boolean(preferences.telemetryOptOut));
		}
	};

	identify(id: string, props?: { [key: string]: any }) {
		this._distinctId = id;
		if (this._hasOptedOut || this._segmentInstance == null) {
			return;
		}

		try {
			Logger.debug(`Telemetry identify ${this._distinctId}`);
			/*
			this._segmentInstance.identify({
				userId: this._distinctId,
				anonymousId: this._anonymousId,
				traits: props,
			});
			this._segmentInstance.flush();
			*/
		} catch (ex) {
			Logger.error(ex);
		}
	}

	setAnonymousId(id: string) {
		if (this._hasOptedOut || this._segmentInstance == null) {
			return;
		}
		try {
			Logger.debug(`Telemetry setAnonymousId ${id}`);
			this._anonymousId = id;
			/*
			this._segmentInstance.identify({
				anonymousId: id,
			});
			this._segmentInstance.flush();
			*/
		} catch (ex) {
			Logger.error(ex);
		}
	}

	getAnonymousId() {
		return this._anonymousId;
	}

	setConsent(hasConsented: boolean) {
		this._hasOptedOut = !hasConsented;
	}

	setSuperProps(props: { [key: string]: string | number | boolean }) {
		this._superProps = props;
	}

	addSuperProps(props: { [key: string]: string | number | boolean }) {
		this._superProps = {
			...this._superProps,
			...props,
		};
	}

	@debug()
	track(event: TelemetryEventName, data?: TelemetryData) {
		const cc = Logger.getCorrelationContext();

		if (this._hasOptedOut || this._segmentInstance == null) {
			Logger.debug("Cannot track, user has opted out or no segment instance");
			return;
		}

		const payload: { [key: string]: any } = { ...data, ...this._superProps };

		//if (this._distinctId != null) {
		//	payload["distinct_id"] = this._distinctId;
		//}

		Logger.debug(
			`Tracking userId=${this._distinctId} anonymousId=${this._anonymousId}:`,
			event,
			payload
		);
		try {
			if (event === "codestream/user/login succeeded") {
				this._segmentInstance.track({
					userId: this._distinctId,
					anonymousId: this._anonymousId,
					event,
					properties: payload,
				});
				this._segmentInstance.flush();
			}
		} catch (ex) {
			Logger.error(ex, cc);
		}
		try {
			if (this._session.newRelicTaxonomyEnforcerUrl) {
				this.fetchClient
					.customFetch(`${this._session.newRelicTaxonomyEnforcerUrl}/events`, {
						method: "POST",
						body: JSON.stringify({
							event: event,
							properties: payload,
							messageId: UUID(),
							timestamp: new Date(),
							userId: this._distinctId,
							anonymousId: this._anonymousId,
							type: "track",
						}),
						headers: {
							"Content-Type": "application/json",
						},
					})
					.catch((ex: any) => {
						Logger.error(ex, cc);
					});
			}
		} catch (ex: any) {
			Logger.error(ex, cc);
		}
	}
}
