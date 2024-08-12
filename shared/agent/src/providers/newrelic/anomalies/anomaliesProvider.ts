import {
	DetectTeamAnomaliesRequest,
	DetectTeamAnomaliesRequestType,
	DidChangeCodelensesNotificationType,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityAnomaliesResponse,
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesRequestType,
	GetObservabilityResponseTimesResponse,
} from "@codestream/protocols/agent";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { Logger } from "../../../logger";
import { Functions } from "../../../system/function";
import Cache from "@codestream/utils/system/timedCache";
import { SessionContainer } from "../../../container";
import { CSAccessTokenType, DEFAULT_CLM_SETTINGS } from "@codestream/protocols/api";
import { CodeStreamAgent } from "../../../agent";
import { ReposProvider } from "../repos/reposProvider";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { DeploymentsProvider } from "../deployments/deploymentsProvider";
import { URI } from "vscode-uri";
import { EntityAccountResolver } from "../clm/entityAccountResolver";
import { Disposable } from "../../../system/disposable";
import wait = Functions.wait;
import { AnomalyDetectorDrillDown } from "../anomalyDetectionDrillDown";
import { FetchCore } from "../../../system/fetchCore";
import { tokenHolder } from "../TokenHolder";
import { getAnomalyDetectionMockResponse } from "../anomalyDetectionMockResults";

@lsp
export class AnomaliesProvider implements Disposable {
	private _observabilityAnomaliesTimedCache = new Cache<Promise<GetObservabilityAnomaliesResponse>>(
		{
			defaultTtl: 45 * 60 * 1000, // 45 minutes
		}
	);
	private _lastObservabilityAnomaliesResponse = new Map<
		string,
		GetObservabilityAnomaliesResponse
	>();
	private _pollObservabilityAnomaliesTimeout: string | number | NodeJS.Timeout | undefined;

	constructor(
		private agent: CodeStreamAgent,
		private entityAccountResolver: EntityAccountResolver,
		private reposProvider: ReposProvider,
		private graphqlClient: NewRelicGraphqlClient,
		private deploymentsProvider: DeploymentsProvider,
		private fetchClient: FetchCore
	) {
		this.init();
	}

	private init() {
		// this._pollObservabilityAnomaliesTimeout = setTimeout(
		// 	this.pollObservabilityAnomalies.bind(this),
		// 	2 * 60 * 1000
		// );
	}

	getLastObservabilityAnomaliesResponse(entityGuid: string) {
		const mockResponse = getAnomalyDetectionMockResponse(entityGuid);
		if (mockResponse) return mockResponse;
		const result = SessionContainer.instance().session.getCachedAnomalyData(entityGuid);
		return (
			result && {
				responseTime: result.durationAnomalies,
				errorRate: result.errorRateAnomalies,
			}
		);
	}

	private observabilityAnomaliesCacheKey(request: GetObservabilityAnomaliesRequest): string {
		return [
			request.entityGuid,
			request.sinceDaysAgo,
			request.baselineDays,
			request.sinceLastRelease,
			request.minimumErrorPercentage,
			request.minimumResponseTime,
			request.minimumSampleRate,
			request.minimumRatio,
		].join("|");
	}

	@lspHandler(GetObservabilityAnomaliesRequestType)
	@log()
	async getObservabilityAnomalies(
		request: GetObservabilityAnomaliesRequest
	): Promise<GetObservabilityAnomaliesResponse> {
		const cacheKey = this.observabilityAnomaliesCacheKey(request);
		try {
			const cached = await this._observabilityAnomaliesTimedCache.get(cacheKey);
			if (cached) {
				this._lastObservabilityAnomaliesResponse.set(request.entityGuid, cached);
				return cached;
			}
		} catch (e) {
			// ignore
		}

		this._lastObservabilityAnomaliesResponse.delete(request.entityGuid);

		let lastEx;
		const fn = async () => {
			try {
				const anomalyDetector = new AnomalyDetectorDrillDown(
					request,
					this.deploymentsProvider,
					this.graphqlClient,
					this.reposProvider
				);
				const promise = anomalyDetector.execute();
				this._observabilityAnomaliesTimedCache.put(cacheKey, promise);
				const response = await promise;
				this._lastObservabilityAnomaliesResponse.set(request.entityGuid, response);
				return true;
			} catch (ex) {
				this._observabilityAnomaliesTimedCache.remove(cacheKey);
				Logger.warn(ex.message);
				lastEx = ex.message;
				return false;
			}
		};
		await Functions.withExponentialRetryBackoff(fn, 5, 1000);
		const response = this._observabilityAnomaliesTimedCache.get(cacheKey) || {
			responseTime: [],
			errorRate: [],
			error: lastEx,
			didNotifyNewAnomalies: false,
		};

		this.agent.sendNotification(DidChangeCodelensesNotificationType, undefined);

		return response;
	}

	@lspHandler(GetObservabilityResponseTimesRequestType)
	@log()
	getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		return this._getObservabilityResponseTimes(request);
	}

	private async _getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		const parsedUri = URI.parse(request.fileUri);
		const filePath = parsedUri.fsPath;
		const { result, error } = await this.entityAccountResolver.resolveEntityAccount(filePath);
		if (!result)
			return {
				responseTimes: [],
			};

		// const query =
		// 	`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
		// 	`FROM Metric WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
		// 	`AND (metricTimesliceName LIKE 'Java/%' OR metricTimesliceName LIKE 'Custom/%')` +
		// 	`FACET metricTimesliceName AS name ` +
		// 	`SINCE 7 days ago LIMIT MAX`;

		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
			`AND (name LIKE 'Java/%' OR name LIKE 'Custom/%')` +
			`FACET name ` +
			`SINCE 7 days ago LIMIT MAX`;

		const results = await this.graphqlClient.runNrql<{ name: string; value: number }>(
			result.entity.accountId,
			query,
			200
		);
		return {
			responseTimes: results,
		};
	}

	async pollObservabilityAnomalies() {
		try {
			await this.pollObservabilityAnomaliesCore();
		} catch (ex) {
			Logger.warn(ex);
		} finally {
			this._pollObservabilityAnomaliesTimeout = setTimeout(
				this.pollObservabilityAnomaliesCore.bind(this),
				24 * 60 * 60 * 1000
			);
		}
	}

	private async pollObservabilityAnomaliesCore() {
		try {
			const { repos, error } = await this.reposProvider.getObservabilityRepos({});
			if (error) {
				Logger.warn("pollObservabilityAnomalies: " + (error.error.message || error.error.type));
				return;
			}
			if (!repos?.length) {
				Logger.log("pollObservabilityAnomalies: no observability repos");
				return;
			}
			const entityGuids = new Set<string>();
			for (const observabilityRepo of repos) {
				for (const account of observabilityRepo.entityAccounts) {
					entityGuids.add(account.entityGuid);
				}
			}

			const me = await SessionContainer.instance().users.getMe();
			const clmSettings = me.preferences?.clmSettings || DEFAULT_CLM_SETTINGS;
			let didNotifyNewAnomalies = false;
			for (const entityGuid of entityGuids) {
				Logger.log(
					"pollObservabilityAnomalies: Getting observability anomalies for entity " + entityGuid
				);
				const response = await this.getObservabilityAnomalies({
					entityGuid,
					sinceDaysAgo: parseInt(clmSettings.compareDataLastValue),
					baselineDays: parseInt(clmSettings.againstDataPrecedingValue),
					sinceLastRelease: clmSettings.compareDataLastReleaseValue,
					minimumErrorPercentage: parseFloat(clmSettings.minimumErrorPercentage),
					minimumResponseTime: parseFloat(clmSettings.minimumAverageDurationValue),
					minimumSampleRate: parseFloat(clmSettings.minimumBaselineValue),
					minimumRatio: parseFloat(clmSettings.minimumChangeValue) / 100 + 1,
					notifyNewAnomalies: !didNotifyNewAnomalies,
				});
				if (response.didNotifyNewAnomalies) {
					didNotifyNewAnomalies = true;
				}

				await wait(10 * 60 * 1000);
			}
		} catch (e) {
			Logger.warn("pollObservabilityAnomaliesCore error", e);
		}
	}

	@lspHandler(DetectTeamAnomaliesRequestType)
	@log()
	async detectTeamAnomalies(request: DetectTeamAnomaliesRequest) {
		const me = await SessionContainer.instance().users.getMe();
		const url = SessionContainer.instance().session.o11yServerUrl;
		const tokenHeader =
			tokenHolder.tokenType === CSAccessTokenType.ACCESS_TOKEN ? "x-access-token" : "x-id-token";
		const token = tokenHolder.accessToken;
		const teamId = me?.teamIds[0];
		if (!url || !token || !me || !teamId) return {};

		let headers: { [key: string]: string } = {
			"Content-Type": "application/json",
			[tokenHeader]: token,
		};
		return this.fetchClient.customFetch(`${url}/detect/${teamId}`, {
			method: "post",
			headers,
		});
	}

	/*
	Not actually used - agent is restarted at logout but keeping for
	possible future use
	*/
	dispose(): void {
		clearTimeout(this._pollObservabilityAnomaliesTimeout);
		this._observabilityAnomaliesTimedCache.clear();
	}
}
