import {
	Account,
	GetAllAccountsRequestType,
	GetNRQLRequestType,
	NRQLResult,
	ResultsTypeGuess,
	isNRErrorResponse,
	GetNRQLResponse,
} from "@codestream/protocols/agent";
import {
	BrowserEngines,
	IdeNames,
	OpenEditorViewNotificationType,
} from "@codestream/protocols/webview";
import { parseId } from "@codestream/webview/utilities/newRelic";
import { Disposable } from "@codestream/webview/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { OptionProps, components } from "react-select";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { HostApi } from "../../webview-api";
import Button from "../Button";
import { fuzzyTimeAgoinWords } from "../Timestamp";
import ExportResults from "./ExportResults";
import { NRQLEditorApi, NRQLEditor } from "./NRQLEditor";
import { NRQLResultsArea } from "./NRQLResultsArea";
import { NRQLResultsBar } from "./NRQLResultsBar";
import { NRQLResultsStackedBar } from "./NRQLResultsStackedBar";
import { NRQLResultsBillboard } from "./NRQLResultsBillboard";
import { NRQLResultsJSON } from "./NRQLResultsJSON";
import { NRQLResultsLine } from "./NRQLResultsLine";
import { NRQLResultsPie } from "./NRQLResultsPie";
import { NRQLResultsTable } from "./NRQLResultsTable";
import { NRQLVisualizationDropdown } from "./NRQLVisualizationDropdown";
import { RecentQueries } from "./RecentQueries";
import { PanelHeaderTitleWithLink } from "../PanelHeaderTitleWithLink";
import { DropdownWithSearch } from "../DropdownWithSearch";
import { useDidMount } from "../../utilities/hooks";

const QueryWrapper = styled.div`
	width: 100%;
	padding: 0px;
`;

const ActionRow = styled.div`
	width: 100%;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 0;
`;

const AccountRecentContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;

const AccountContainer = styled.div`
	flex-grow: 1;
`;

const RecentContainer = styled.div`
	margin-left: auto;
`;

const DropdownContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-bottom: 8px;
`;

const ButtonContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;

const SinceContainer = styled.div`
	display: flex;
	justify-content: space-between;
	margin-bottom: 8px;
`;

const ResultsRow = styled.div`
	flex: 1;
	width: 100%;
`;

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const ResultsContainer = styled.div`
	padding: 0px 20px 14px 20px;
	width: 100%;
	height: 100%;
	overflow: hidden;
`;

const ResizeEditorContainer = styled.div`
	resize: vertical;
	overflow: auto;
	min-height: 120px;
	max-height: 40vh;
	border: var(--base-border-color) solid 1px;
	padding: 8px;
`;

const CodeText = styled.span`
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	color: var(--text-color);
`;
interface SelectOptionType {
	label: string;
	value: string;
}

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>{props.data?.label}</OptionName>
		</>
	);
	return <components.Option {...props} children={children} />;
};

const DEFAULT_QUERY = "FROM ";

export const DEFAULT_VISUALIZATION_GUESS = {
	selected: "",
	enabled: [],
};

export const NRQLPanel = (props: {
	accountId?: number;
	entryPoint: string;
	entityGuid?: string;
	query?: string;
	ide?: { name?: IdeNames; browserEngine?: BrowserEngines };
}) => {
	const supports = {
		export: props.ide?.name === "VSC" || props.ide?.name === "JETBRAINS",
		// default to true! currently JsBrowser works!
		enhancedEditor: true, // !props.ide || props?.ide?.browserEngine !== "JxBrowser",
	};

	const initialAccountId = props.accountId
		? props.accountId
		: props.entityGuid
		? parseId(props.entityGuid)?.accountId
		: undefined;

	const [userQuery, setUserQuery] = useState<string>("");
	const [results, setResults] = useState<NRQLResult[]>([]);
	const [noResults, setNoResults] = useState<boolean>(false);
	const [noResultResponse, setNoResultsResponse] = useState<GetNRQLResponse[]>([]);
	const [eventType, setEventType] = useState<string>();
	const [facet, setFacet] = useState<string[] | undefined>(undefined);
	const [since, setSince] = useState<string>();
	const [selectedAccount, setSelectedAccount] = useState<
		{ label: string; value: number } | undefined
	>(undefined);
	const [accounts, setAccounts] = useState<{ name: string; id: number }[] | undefined>(undefined);
	const [resultsTypeGuess, setResultsTypeGuess] = useState<ResultsTypeGuess>(
		DEFAULT_VISUALIZATION_GUESS as ResultsTypeGuess
	);
	const [hasAlias, setHasAlias] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [nrqlError, setNRQLError] = useState<string | undefined>("");
	const [shouldRefetchRecentQueriesTimestamp, setShouldRefetchRecentQueriesTimestamp] = useState<
		number | undefined
	>(undefined);
	const nrqlEditorRef = useRef<NRQLEditorApi>(null);
	const { height: editorHeight, ref: editorRef } = useResizeDetector();
	const { width, height, ref } = useResizeDetector();
	const trimmedHeight: number = (height ?? 0) - (height ?? 0) * 0.05;
	const { width: entitySearchWidth, ref: entitySearchRef } = useResizeDetector();

	let accountsPromise;

	useDidMount(() => {
		HostApi.instance.track("codestream/nrql/webview displayed", {
			event_type: "modal_display",
			meta_data: `entry_point: ${props.entryPoint}`,
		});

		accountsPromise = HostApi.instance
			.send(GetAllAccountsRequestType, {})
			.then(result => {
				setAccounts(result.accounts);
				let foundAccount: Account | undefined = undefined;
				if (result?.accounts?.length) {
					if (initialAccountId) {
						foundAccount = result.accounts.find(_ => _.id === initialAccountId);
					}
					if (!foundAccount) {
						foundAccount = result.accounts[0];
					}
					if (foundAccount) {
						setSelectedAccount(formatSelectedAccount(foundAccount));
					}
				}
				if (!foundAccount) {
					handleError("Missing account");
				} else {
					if (props.query) {
						setUserQuery(props.query);
						executeNRQL(foundAccount.id, props.query);
					}
				}
			})
			.catch(ex => {
				handleError(ex?.message || "Error fetching accounts");
			});
	});

	const accountId = useMemo(() => {
		return (selectedAccount?.value || initialAccountId)!;
	}, [selectedAccount]);

	const disposables: Disposable[] = [];

	useEffect(() => {
		disposables.push(
			HostApi.instance.on(OpenEditorViewNotificationType, e => {
				if (!nrqlEditorRef?.current) return;

				const value = e.query || "";
				nrqlEditorRef.current!.setValue(value);
				setUserQuery(value);
				executeNRQL(accountId, value);
			})
		);
		return () => {
			disposables && disposables.forEach(_ => _.dispose());
		};
	}, [accountId]);

	const handleError = (message: string) => {
		setNRQLError(message);
		console.error(message);
	};

	const executeNRQL = async (
		accountId: number,
		nrqlQuery: string,
		options: { isRecent: boolean } = { isRecent: false }
	) => {
		try {
			if (!accountId) {
				handleError("Please provide an account");
				return;
			}
			if (!nrqlQuery) {
				handleError("Please provide a query to run");
				return;
			}
			if (nrqlQuery === DEFAULT_QUERY) {
				handleError("Please provide a query to run");
				return;
			}

			setIsLoading(true);
			_resetQueryCore();

			const response = await HostApi.instance.send(GetNRQLRequestType, {
				accountId,
				query: nrqlQuery,
			});

			if (!response) {
				handleError("An unexpected error occurred while running query; please contact support.");
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			if (!response.results || !response.results.length) {
				setNoResults(!response.results || !response.results.length);
				setNoResultsResponse([response]);
			}

			if (response.results && response.results.length > 0) {
				HostApi.instance.track("codestream/nrql/query submitted", {
					account_id: response.accountId,
					event_type: "response",
					meta_data: `default_visualization: ${response.resultsTypeGuess?.selected}`,
					meta_data_2: `recent_query: ${options.isRecent}`,
				});

				setResults(response.results);

				if (response.resultsTypeGuess && response.resultsTypeGuess.enabled) {
					setResultsTypeGuess({
						selected: response.resultsTypeGuess.enabled.includes(resultsTypeGuess?.selected || "")
							? resultsTypeGuess.selected || ""
							: response.resultsTypeGuess.selected,
						enabled: response.resultsTypeGuess.enabled,
					});
				}

				if (response.metadata) {
					setEventType(response.metadata.eventType);
					if (response.metadata.since) {
						if (/^[0-9]+$/.test(response.metadata.since)) {
							setSince(fuzzyTimeAgoinWords(Number(response.metadata.since)) + " ago");
						} else {
							setSince(response.metadata.since.toLowerCase());
						}
					}
					setFacet(response.metadata.facet);
					setHasAlias(response.metadata.hasAlias);
				}
				setShouldRefetchRecentQueriesTimestamp(new Date().getTime());
			}
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const _resetQueryCore = () => {
		setNRQLError(undefined);
		setResults([]);
		setEventType("");
		setSince("");
		setNoResults(false);
	};

	const resetQuery = () => {
		nrqlEditorRef.current!.setValue(DEFAULT_QUERY);
		setUserQuery(DEFAULT_QUERY);

		_resetQueryCore();
	};

	const formatSelectedAccount = (account: Account) => {
		return {
			label: `Account: ${account.id} - ${account.name}`,
			value: account.id,
		};
	};

	const handleVisualizationDropdownCallback = value => {
		setResultsTypeGuess(prevState => ({
			...prevState,
			selected: value,
		}));
	};

	return (
		<>
			<div id="modal-root"></div>
			<PanelHeader
				title={
					<PanelHeaderTitleWithLink
						text={
							<span>
								Save and share queries with <CodeText>.nrql</CodeText> files
							</span>
						}
						href={`https://docs.newrelic.com/docs/codestream/observability/query-builder/#nrql-files`}
						title="Query Your Data"
					/>
				}
			>
				<QueryWrapper>
					<div className="search-input">
						<div style={{ marginBottom: "10px" }}>
							<AccountRecentContainer>
								<AccountContainer>
									<div style={{ width: "100%" }} ref={entitySearchRef}>
										<DropdownWithSearch
											id="input-account-autocomplete"
											name="account-autocomplete"
											loadOptions={async (
												search: string,
												_loadedOptions,
												additional?: { nextCursor?: string }
											) => {
												await accountsPromise;

												return {
													options: accounts!
														.filter(_ =>
															search
																? _.name.toLowerCase().indexOf(search.toLowerCase()) > -1
																: true
														)
														.map(account => {
															return formatSelectedAccount(account);
														}),
													hasMore: false,
												};
											}}
											handleChangeCallback={setSelectedAccount}
											customOption={Option}
											tabIndex={1}
											customWidth={entitySearchWidth?.toString()}
											selectedOption={selectedAccount}
										/>
									</div>
								</AccountContainer>
								<RecentContainer>
									<RecentQueries
										lastRunTimestamp={shouldRefetchRecentQueriesTimestamp}
										onSelect={e => {
											if (!e) return;
											// a query may cross accounts -- get the account for it
											const newAccount = formatSelectedAccount(e.accounts[0]);
											setSelectedAccount(newAccount);

											let value = e.query;
											if (nrqlEditorRef?.current) {
												nrqlEditorRef.current!.setValue(value);
											}
											setUserQuery(value!);
											executeNRQL((newAccount?.value || accountId)!, value!, {
												isRecent: true,
											});
										}}
									/>
								</RecentContainer>
							</AccountRecentContainer>
						</div>
						<ResizeEditorContainer ref={editorRef}>
							{accountId && (
								<NRQLEditor
									key={accountId}
									className="input-text control"
									defaultValue={props.query || DEFAULT_QUERY}
									height={`${editorHeight}px`}
									onChange={e => {
										setUserQuery(e.value || "");
									}}
									onSubmit={e => {
										setUserQuery(e.value!);
										executeNRQL(accountId, e.value!);
									}}
									useSimpleEditor={!supports.enhancedEditor}
									ref={nrqlEditorRef}
									accountId={accountId}
								/>
							)}
						</ResizeEditorContainer>
						<ActionRow>
							<DropdownContainer></DropdownContainer>
							<ButtonContainer>
								<Button
									style={{ padding: "0 10px", marginRight: "5px" }}
									isSecondary={true}
									onClick={() => {
										resetQuery();
									}}
								>
									Clear
								</Button>
								<Button
									data-testid="run"
									style={{ padding: "0 10px" }}
									onClick={() => executeNRQL(accountId, userQuery)}
									loading={isLoading}
								>
									Run
								</Button>
							</ButtonContainer>
						</ActionRow>
					</div>
				</QueryWrapper>
			</PanelHeader>
			<ResultsContainer ref={ref}>
				<ResultsRow>
					{since && (
						<SinceContainer>
							<div style={{ paddingTop: "2px" }}>
								<small>Since {since}</small>
							</div>

							<div style={{ marginLeft: "auto", marginRight: "8px", fontSize: "11px" }}>
								<NRQLVisualizationDropdown
									accountId={accountId}
									onSelectCallback={handleVisualizationDropdownCallback}
									resultsTypeGuess={resultsTypeGuess}
								/>
							</div>

							{supports.export && (
								<div style={{ paddingTop: "2px" }}>
									<ExportResults results={results} accountId={accountId} />
								</div>
							)}
						</SinceContainer>
					)}
					<div>
						{!nrqlError && !isLoading && results && results.length > 0 && (
							<>
								{resultsTypeGuess.selected === "table" && (
									<NRQLResultsTable
										width={width || "100%"}
										height={trimmedHeight}
										results={results}
										facet={facet}
									/>
								)}
								{resultsTypeGuess.selected === "billboard" && (
									<NRQLResultsBillboard
										results={results}
										eventType={eventType}
										hasAlias={hasAlias}
									/>
								)}
								{resultsTypeGuess.selected === "area" && (
									<NRQLResultsArea eventType={eventType} results={results} />
								)}
								{resultsTypeGuess.selected === "line" && (
									<NRQLResultsLine
										height={trimmedHeight}
										eventType={eventType}
										results={results}
										facet={facet!}
									/>
								)}
								{resultsTypeGuess.selected === "json" && <NRQLResultsJSON results={results} />}
								{resultsTypeGuess.selected === "bar" && (
									<NRQLResultsBar height={trimmedHeight} results={results} facet={facet!} />
								)}
								{resultsTypeGuess.selected === "stackedBar" && (
									<NRQLResultsStackedBar
										height={trimmedHeight}
										results={results}
										facet={facet!}
										eventType={eventType}
									/>
								)}
								{resultsTypeGuess.selected === "pie" && (
									<NRQLResultsPie results={results} facet={facet!} />
								)}
							</>
						)}
						{noResults && <div style={{ textAlign: "center" }}>No results found</div>}
						{nrqlError && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								{nrqlError}
							</div>
						)}
					</div>
				</ResultsRow>
			</ResultsContainer>
		</>
	);
};
