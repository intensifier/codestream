import { GraphQLClient } from "graphql-request";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import {
	ERROR_LOGGED_OUT,
	ERROR_NRQL_INVALID_INPUT,
	ERROR_NR_CONNECTION_INVALID_API_KEY,
	ERROR_NR_CONNECTION_MISSING_API_KEY,
	ERROR_NR_CONNECTION_MISSING_URL,
	ERROR_NR_INSUFFICIENT_API_KEY,
} from "@codestream/protocols/agent";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";
import { VersionInfo } from "../../types";
import { CodeStreamSession } from "../../session";
import { log } from "../../system/decorators/log";
import { Logger } from "../../logger";
import { InternalError, ReportSuppressedMessages } from "../../agentError";
import { makeHtmlLoggable } from "@codestream/utils/system/string";
import { Functions } from "../../system/function";
import { isEmpty as _isEmpty } from "lodash";
import {
	GraphqlNrqlError,
	GraphqlNrqlTimeoutError,
	isGraphqlNrqlError,
	AccessTokenError,
} from "./newrelic.types";
import * as Dom from "graphql-request/dist/types.dom";
import { ContextLogger } from "../contextLogger";
import { Disposable } from "../../system/disposable";
import { NrApiConfig, PRODUCTION_EU_GRAPHQL_URL, PRODUCTION_US_GRAPHQL_URL } from "./nrApiConfig";
import { FetchCore } from "../../system/fetchCore";
import { isSuppressedException } from "../../system/suppressedNetworkExceptions";
import { tokenHolder } from "./TokenHolder";

const ignoredErrors = [GraphqlNrqlTimeoutError];

export type OnGraphqlClientConnected = (newRelicUserId: number) => Promise<void>;

// NR graphql specific error
export interface HttpErrorResponse {
	response: {
		status: number;
		error: string;
		errors?: [
			{
				extensions?: {
					errorClass?: string;
				};
				message?: string;
			},
		];
		headers: Dom.Headers;
	};
	request: {
		query: string;
		variables: object;
	};
}

interface Timeseries {
	contents?: { function: string; simple: boolean }[];
	messages?: {}[];
}

export interface ResponseMetadata {
	facet?: string;
	eventType: string;
	rawSince: string;
	contents: {
		timeSeries: Timeseries;
	};
	timeSeries?: Timeseries;
}

function isHttpErrorResponse(ex: unknown): ex is HttpErrorResponse {
	const httpErrorResponse = ex as HttpErrorResponse;
	return (
		httpErrorResponse?.response?.error !== undefined &&
		httpErrorResponse?.response?.status !== undefined &&
		httpErrorResponse?.response?.headers !== undefined &&
		httpErrorResponse?.request?.query !== undefined
	);
}

export function isInvalidInputErrorResponse(ex: unknown): ex is HttpErrorResponse {
	const httpErrorResponse = ex as HttpErrorResponse;
	const errors = httpErrorResponse?.response?.errors;
	return (
		Array.isArray(errors) && errors.length && errors[0]?.extensions?.errorClass === "INVALID_INPUT"
	);
}

export function escapeNrql(nrql: string) {
	return nrql.replace(/\\/g, "\\\\\\\\").replace(/\n/g, " ");
}

export class NewRelicGraphqlClient implements Disposable {
	private _client: GraphQLClient | undefined;
	private _clientUrlNeedsUpdate: boolean = false;
	private _newRelicUserId: number | undefined = undefined;
	private _accountIds: number[] | undefined = undefined;
	private _onGraphqlClientConnected = new Array<OnGraphqlClientConnected>();
	private _additionalHeaders: { [key: string]: string } = {};

	constructor(
		private nrApiConfig: NrApiConfig,
		private session: CodeStreamSession,
		private providerInfo: CSNewRelicProviderInfo | undefined,
		private versionInfo: VersionInfo,
		private isProductionCloud: boolean,
		private fetchClient: FetchCore
	) {}

	get graphqlUrl() {
		return this.nrApiConfig.graphqlUrl;
	}

	get apiUrl() {
		return this.nrApiConfig.apiUrl;
	}

	addOnGraphqlClientConnected(onGraphqlClientConnected: OnGraphqlClientConnected) {
		this._onGraphqlClientConnected?.push(onGraphqlClientConnected);
	}

	get headers() {
		const headers: { [key: string]: string } = this.nrApiConfig.baseHeaders;

		const token = tokenHolder.accessToken;
		if (token) {
			if (tokenHolder.tokenType === "access") {
				headers["x-access-token"] = token;
			} else {
				headers["x-id-token"] = token;
			}
		}

		Object.keys(this._additionalHeaders).map(ah => {
			headers[ah] = this._additionalHeaders[ah];
		});

		return headers;
	}

	addHeader(key: string, value: string): void {
		this._additionalHeaders[key] = value;
	}

	protected async client(useOtherRegion?: boolean): Promise<GraphQLClient> {
		let client: GraphQLClient;
		const accessToken = tokenHolder.accessToken;
		if (!accessToken) {
			throw new ResponseError(ERROR_LOGGED_OUT, "User is not logged in");
		}

		if (useOtherRegion) {
			const newGraphQlBaseUrl = this.graphqlUrl;
			if (newGraphQlBaseUrl === PRODUCTION_US_GRAPHQL_URL) {
				client = this._client = await this.createClientAndValidateKey(
					PRODUCTION_EU_GRAPHQL_URL,
					accessToken
				);
			} else if (newGraphQlBaseUrl === PRODUCTION_EU_GRAPHQL_URL) {
				client = this._client = await this.createClientAndValidateKey(
					PRODUCTION_US_GRAPHQL_URL,
					accessToken
				);
			} else {
				client =
					this._client ?? (await this.createClientAndValidateKey(this.graphqlUrl, accessToken));
			}
			this._clientUrlNeedsUpdate = true;
		} else {
			if (this._clientUrlNeedsUpdate) {
				client = await this.createClientAndValidateKey(this.graphqlUrl, accessToken);
				this._clientUrlNeedsUpdate = false;
			} else {
				client =
					this._client ?? (await this.createClientAndValidateKey(this.graphqlUrl, accessToken));
			}
		}

		client.setHeaders(this.headers);
		ContextLogger.setData({
			nrUrl: this.graphqlUrl,
			versionInfo: {
				version: this.versionInfo?.extension?.version,
				build: this.versionInfo?.extension?.build,
			},
			ide: this.versionInfo?.ide,
			isProductionCloud: this.isProductionCloud,
		});
		return client;
	}

	protected createClient(graphQlBaseUrl?: string, accessToken?: string): GraphQLClient {
		if (!graphQlBaseUrl) {
			throw new ResponseError(ERROR_NR_CONNECTION_MISSING_URL, "Could not get a New Relic API URL");
		}
		if (!accessToken) {
			throw new ResponseError(
				ERROR_NR_CONNECTION_MISSING_API_KEY,
				"Could not get a New Relic API key"
			);
		}
		const options = {
			fetch: this.fetchClient.customFetch.bind(this.fetchClient),
		};
		const client = new GraphQLClient(graphQlBaseUrl, options);
		client.setHeaders(this.headers);

		return client;
	}

	private async validateApiKey(client: GraphQLClient): Promise<{
		userId: number;
		organizationId?: number;
		accounts: { id: number; name: string }[];
	}> {
		try {
			const response = await client.request<{
				actor: {
					user: {
						id: number;
					};
					organization?: {
						id: number;
					};
					accounts: [
						{
							id: number;
							name: string;
						},
					];
				};
			}>(`{
				actor {
					user {
						id
          }
					accounts {
						id,
						name
					}
				}
			}`);
			return {
				userId: response.actor.user.id,
				accounts: response.actor.accounts,
				organizationId: response.actor.organization?.id,
			};
		} catch (ex) {
			const accessTokenError = this.getAccessTokenError(ex);
			throw new ResponseError(
				ERROR_NR_CONNECTION_INVALID_API_KEY,
				accessTokenError?.message || ex.message || ex.toString()
			);
		}
	}

	async createClientAndValidateKey(apiUrl: string, apiKey: string): Promise<GraphQLClient> {
		if (this._client && this._newRelicUserId && this._accountIds) {
			return this._client;
		}
		this._client = this.createClient(apiUrl, apiKey);
		const { userId, accounts } = await this.validateApiKey(this._client!);
		this._newRelicUserId = userId;
		ContextLogger.log(`Found ${accounts.length} New Relic accounts`);
		this._accountIds = accounts.map(_ => _.id);
		this.fireOnGraphqlClientConnected(userId);
		return this._client;
	}

	private fireOnGraphqlClientConnected(newRelicUserId: number) {
		// Avoid circular dependency between this class and NrOrgProvider
		for (const onGraphqlClientConnected of this._onGraphqlClientConnected) {
			setImmediate(() => onGraphqlClientConnected(newRelicUserId));
		}
	}

	private async clientRequestWrap<T>(
		query: string,
		variables: Record<string, string>,
		useOtherRegion?: boolean
	) {
		const client = await this.client(useOtherRegion);
		try {
			//throw new Error("oops"); // uncomment to test roadblock
			return await client.request<T>(query, variables);
			// fetchCore will have retried 3 times by now
		} catch (ex) {
			if (isInvalidInputErrorResponse(ex)) {
				throw ex;
			}
			throw ex;
		}
	}

	private getAccessTokenError(ex: any): { message: string } | undefined {
		const requestError = ex as {
			response: {
				errors: {
					extensions: {
						error_code?: string;
						errorClass?: string;
						classification?: string;
					};
					message: string;
				}[];
			};
		};
		if (
			requestError &&
			requestError.response &&
			requestError.response.errors &&
			requestError.response.errors.length
		) {
			return requestError.response.errors.find(
				_ => _.extensions && _.extensions.error_code === "BAD_API_KEY"
			);
		}
		return undefined;
	}

	@log()
	async getUserId(): Promise<number | undefined> {
		try {
			if (this._newRelicUserId != null) {
				return this._newRelicUserId;
			}

			if (this.providerInfo && this.providerInfo.data && this.providerInfo.data.userId) {
				try {
					const id = this.providerInfo.data.userId;
					this._newRelicUserId = parseInt(id.toString(), 10);
					ContextLogger.log("getUserId (found data)", {
						userId: id,
					});
				} catch (ex) {
					ContextLogger.warn("getUserId", {
						error: ex,
					});
				}
			}
			if (this._newRelicUserId) return this._newRelicUserId;

			const response = await this.query(`{ actor { user { id } } }`);
			const id = response.actor?.user?.id;
			if (id) {
				this._newRelicUserId = parseInt(id, 10);
				ContextLogger.log("getUserId (found api)", {
					userId: id,
				});
				return this._newRelicUserId;
			}
		} catch (ex) {
			ContextLogger.warn("getUserId " + ex.message, {
				error: ex,
			});
		}
		return undefined;
	}

	async query<T = any>(
		query: string,
		variables: any = undefined,
		isMultiRegion = false
	): Promise<T> {
		if (this.providerInfo && this.providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		let response: any;
		let responseOther: any;
		let ex: Error | undefined;
		try {
			let potentialResponse, potentialOtherResponse;
			if (isMultiRegion) {
				const currentRegionPromise = await this.clientRequestWrap<T>(query, variables, false);
				const otherRegionPromise = await this.clientRequestWrap<T>(query, variables, true);
				[potentialResponse, potentialOtherResponse] = await Promise.all([
					currentRegionPromise,
					otherRegionPromise,
				]);
			} else {
				potentialResponse = await this.clientRequestWrap<T>(query, variables, false);
			}
			// GraphQL returns happy HTTP 200 response for api level errors
			if (potentialOtherResponse) {
				this.checkGraphqlErrors(potentialResponse);
				this.checkGraphqlErrors(potentialOtherResponse);
				response = potentialResponse;
				responseOther = potentialOtherResponse;
			} else {
				this.checkGraphqlErrors(potentialResponse);
				response = potentialResponse;
			}
		} catch (potentialEx) {
			if (isInvalidInputErrorResponse(potentialEx)) {
				const message = potentialEx.response.errors![0].message || "NRQL Syntax Error";
				Logger.warn(message);
				ex = new ResponseError(ERROR_NRQL_INVALID_INPUT, message);
				response = undefined;
			}

			if (isHttpErrorResponse(potentialEx)) {
				const contentType = potentialEx.response.headers.get("content-type");
				const niceText = contentType?.toLocaleLowerCase()?.includes("text/html")
					? makeHtmlLoggable(potentialEx.response.error)
					: potentialEx.response.error;
				const loggableError = `Error HTTP ${contentType} ${potentialEx.response.status}: ${niceText}`;
				ex = new Error(`Error HTTP ${contentType} ${potentialEx.response.status}: Internal Error`);
				Logger.warn(loggableError);
			}
			Logger.warn(potentialEx.message);
			if (!ex) {
				ex = potentialEx;
			}
		}

		// If multiRegion, and we are doing an entitySearch query, add region values
		if (responseOther) {
			let responseRegion, responseRegionOther;
			if (this.graphqlUrl === PRODUCTION_US_GRAPHQL_URL) {
				responseRegion = "US";
				responseRegionOther = "EU";
			} else {
				responseRegion = "EU";
				responseRegionOther = "US";
			}
			if (response && response.actor) {
				for (let i = 0; i < response.actor.entitySearch.results.entities.length; i++) {
					response.actor.entitySearch.results.entities[i].region = responseRegion;
				}
				for (let i = 0; i < responseOther.actor.entitySearch.results.entities.length; i++) {
					responseOther.actor.entitySearch.results.entities[i].region = responseRegionOther;
				}
			}

			const combinedArray = [
				...responseOther.actor.entitySearch.results.entities,
				...response.actor.entitySearch.results.entities,
			].filter((obj, index, self) => self.findIndex(o => o.guid === obj.guid) === index);

			if (!_isEmpty(combinedArray)) {
				response.actor.entitySearch.results.entities = combinedArray;
			}
		}

		if (!response && ex) {
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
			ContextLogger.error(ex, `query caught:`);
			const exType = isSuppressedException(ex);
			if (exType !== undefined) {
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				const accessTokenError = this.getAccessTokenError(ex);
				if (accessTokenError) {
					throw new AccessTokenError(accessTokenError.message, ex, true);
				}
				const insufficientApiKeyError = this.getInsufficientApiKeyError(ex);
				if (insufficientApiKeyError) {
					Logger.error(ex, "Root cause error for ERROR_NR_INSUFFICIENT_API_KEY");
					throw new ResponseError(ERROR_NR_INSUFFICIENT_API_KEY, "Insufficient New Relic API key");
				}

				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return this.clientRequestWrap<T>(query, variables); //(await this.client()).request<T>(query, variables);
	}

	private getInsufficientApiKeyError(ex: unknown): { message: string } | undefined {
		const requestError = ex as {
			response: {
				errors: {
					extensions: {
						error_code?: string;
						errorClass?: string;
						classification?: string;
					};
					message: string;
				}[];
			};
		};
		if (
			requestError &&
			requestError.response &&
			requestError.response.errors &&
			requestError.response.errors.length
		) {
			return requestError.response.errors.find(
				_ =>
					_.extensions &&
					_.extensions.errorClass === "SERVER_ERROR" &&
					_.extensions.classification === "DataFetchingException"
			);
		}
		return undefined;
	}

	// Public for tests
	public checkGraphqlErrors(response: unknown): void {
		if (isGraphqlNrqlError(response)) {
			const timeoutError = response.errors.find(err => err.extensions?.errorClass === "TIMEOUT");
			if (timeoutError) {
				throw new GraphqlNrqlTimeoutError(response.errors, timeoutError.message);
			}
			const firstMessage = response.errors[0].message;
			throw new GraphqlNrqlError(response.errors, firstMessage);
		}
	}

	/**
	 * Generates a timestamp range from a given timestamp in ms
	 *
	 * @private
	 * @param {number} [timestampInMilliseconds]
	 * @param {number} [plusOrMinusInMinutes=5]
	 * @return {*}  {({ startTime: number; endTime: number } | undefined)}
	 * @memberof NewRelicProvider
	 */
	generateTimestampRange(
		timestampInMilliseconds?: number,
		plusOrMinusInMinutes: number = 5
	): { startTime: number; endTime: number } | undefined {
		try {
			if (!timestampInMilliseconds || isNaN(timestampInMilliseconds)) return undefined;

			timestampInMilliseconds = parseInt(timestampInMilliseconds.toString(), 10);

			if (timestampInMilliseconds < 0) return undefined;

			return {
				startTime: timestampInMilliseconds - plusOrMinusInMinutes * 60 * 1000,
				endTime: timestampInMilliseconds + plusOrMinusInMinutes * 60 * 1000,
			};
		} catch (ex) {
			ContextLogger.warn("generateTimestampRange failed", {
				timestampInMilliseconds: timestampInMilliseconds,
				plusOrMinusInMinutes: plusOrMinusInMinutes,
				error: ex,
			});
		}
		return undefined;
	}

	async runNrqlWithMetadata<T>(
		accountId: number,
		nrql: string,
		timeout: number = 60
	): Promise<{
		results: T[];
		rawResponse: {
			metadata: ResponseMetadata;
		};
	}> {
		const query = `query Nrql($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${nrql}", timeout: ${timeout}) {
						results
						rawResponse
					}
				}
			}
	  	}`;
		const results = await this.query<{
			actor: {
				account: {
					nrql: {
						results: T[];
						rawResponse: {
							metadata: ResponseMetadata;
						};
					};
				};
			};
		}>(query, { accountId });
		return results.actor.account.nrql;
	}

	async runNrql<T>(accountId: number, nrql: string, timeout: number = 60): Promise<T[]> {
		const query = `query Nrql($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${nrql}", timeout: ${timeout}) {
						results
					}
				}
			}
	  	}`;
		const results = await this.query<{
			actor: {
				account: {
					nrql: {
						results: T[];
					};
				};
			};
		}>(query, { accountId });
		return results.actor.account.nrql.results;
	}

	async runAsyncNrql<T>(accountId: number, nrql: string): Promise<T[]> {
		const query = `query Nrql($accountId:Int!, $nrql:Nrql!) {
			actor {
				account(id: $accountId) {
					nrql(query: $nrql, timeout: 1, async: true) {
						results
						queryProgress {
							completed
							queryId
						}
					}
				}
			}
		}`;

		const queryResults = await this.query<{
			actor: {
				account: {
					nrql: {
						results: T[];
						queryProgress: {
							completed: boolean;
							queryId: string;
						};
					};
				};
			};
		}>(query, { accountId, nrql });

		//bail out early if, for some reason, we got something back that quickly
		if (queryResults.actor.account.nrql.queryProgress.completed) {
			return queryResults.actor.account.nrql.results;
		}

		const queryId = queryResults.actor.account.nrql.queryProgress.queryId;

		const queryProgress = `query Nrql($accountId:Int!, $queryId:Id!) {
			actor {
			  account(id: $accountId) {
				nrqlQueryProgress( queryId: $queryId) {
				  results
				  queryProgress {
					completed
				  }
				}
			  }
			}
		  }`;

		let completed = false;
		let results: T[] = [];

		while (!completed) {
			const queryProgressResults = await this.query<{
				actor: {
					account: {
						nrqlQueryProgress: {
							results: T[];
							queryProgress: {
								completed: boolean;
							};
						};
					};
				};
			}>(queryProgress, { accountId, queryId });

			completed = queryProgressResults.actor.account.nrqlQueryProgress.queryProgress.completed;
			results = queryProgressResults.actor.account.nrqlQueryProgress.results;

			await Functions.wait(5000);
		}

		return results;
	}

	errorLogIfNotIgnored(ex: Error, message: string, ...params: any[]): void {
		const match = ignoredErrors.find(ignored => ex instanceof ignored);
		if (!match) {
			ContextLogger.error(ex, message, params);
		}
	}

	contextWarnLogIfNotIgnored(message: string, ...params: any[]) {
		ContextLogger.warn(message, params);
	}

	/*
  Not actually used - agent is restarted at logout but keeping for
  possible future use
  */
	dispose(): void {
		this._onGraphqlClientConnected = [];
		delete this._client;
		delete this.providerInfo;
	}
}
