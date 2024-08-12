import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestRepository,
	GetReposScmRequestType,
	ReposScm,
	SwitchBranchRequestType,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { setProviderError } from "@codestream/webview/store/codeErrors/thunks";
import { bootstrapReviews } from "@codestream/webview/store/reviews/thunks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { logError } from "../../../logger";
import { LoadingMessage } from "../../../src/components/LoadingMessage";
import { CodeStreamState } from "../../../store";
import { Button } from "../../../src/components/Button";
import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
import Icon from "../../Icon";
import { Link } from "../../Link";
import { Tab, Tabs } from "../../../src/components/Tabs";
import copy from "copy-to-clipboard";
import { GHOST } from "./PullRequestTimelineItems";
import {
	clearCurrentPullRequest,
	setCurrentPullRequest,
	setCurrentReview,
} from "../../../store/context/actions";
import {
	clearPullRequestCommits,
	getCurrentProviderPullRequest,
	getCurrentProviderPullRequestLastUpdated,
} from "../../../store/providerPullRequests/slice";
import {
	api,
	clearPullRequestFiles,
	getPullRequestConversations,
	getPullRequestConversationsFromProvider,
} from "../../../store/providerPullRequests/thunks";
import * as reviewSelectors from "../../../store/reviews/reducer";
import { getPreferences } from "../../../store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../../../utilities/hooks";
import { HostApi } from "../../../webview-api";
import { confirmPopup } from "../../Confirm";
import {
	PRAction,
	PRActionButtons,
	PRAuthor,
	PRBadge,
	PRBranch,
	PREditTitle,
	PRHeader,
	PRPlusMinus,
	PRStatus,
	PRStatusButton,
	PRStatusMessage,
	PRTitle,
} from "../../PullRequestComponents";
import Tooltip from "../../Tooltip";
import { PullRequestFileComments } from "../../PullRequestFileComments";
import Timestamp from "../../Timestamp";
import ScrollBox from "../../ScrollBox";
import { PullRequestFilesChangedTab } from "../../PullRequestFilesChangedTab";
import { PullRequestCommitsTab } from "../../PullRequestCommitsTab";
import { PullRequestConversationTab } from "./PullRequestConversationTab";
import { PullRequestReviewButton } from "./PullRequestReviewButton";
import { MergeScreen } from "./MergeScreen";

const Root = styled.div`
	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
		.wide-text {
			display: none;
		}
	}
	a {
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
		}
	}
	.mine {
		background: rgba(90, 127, 255, 0.08);
	}
	.codestream .stream & ul.contains-task-list {
		margin: 0 !important;
		padding: 0 !important;
		white-space: normal;
		li.task-list-item {
			margin: 0 !important;
			padding: 3px 0 3px 30px !important;
			list-style: none;
			input {
				margin-left: -30px;
			}
		}
	}
`;

interface ReposScmPlusName extends ReposScm {
	name: string;
}

const EMPTY_HASH = {};
const EMPTY_HASH2 = {};
const EMPTY_ARRAY = [];

export type autoCheckedMergeabilityStatus = "UNCHECKED" | "CHECKED" | "UNKNOWN";

export const PullRequest = () => {
	const dispatch = useAppDispatch();
	const [isOpen, setIsOpen] = useState(false);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		return {
			viewPreference: getPreferences(state).pullRequestView || "auto",
			reviewsStateBootstrapped: state.reviews.bootstrapped,
			reviewLinks: reviewSelectors.getAllReviewLinks(state),
			currentUser,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			currentPullRequestCommentId: state.context.currentPullRequest
				? state.context.currentPullRequest.commentId
				: undefined,
			currentPullRequestSource: state.context.currentPullRequest
				? state.context.currentPullRequest.source
				: undefined,
			previousPullRequestView: state.context.currentPullRequest
				? state.context.currentPullRequest.previousView
				: undefined,
			currentPullRequest: currentPullRequest,
			currentPullRequestLastUpdated: providerPullRequestLastUpdated,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
			textEditorUri: state.editorContext.textEditorUri,
			reposState: state.repos,
			checkoutBranch: state.context.pullRequestCheckoutBranch,
			prRepoId: currentPullRequest?.conversations?.repository?.prRepoId,
			labels: currentPullRequest?.conversations?.repository?.pullRequest?.labels,
		};
	});

	const pr = derivedState.currentPullRequest?.conversations?.repository?.pullRequest;
	useEffect(() => {
		if (!derivedState.currentPullRequestCommentId) return;

		const dataCommentId = document.querySelector(
			`[data-comment-id="${derivedState.currentPullRequestCommentId}"]`
		);
		if (dataCommentId) {
			dataCommentId.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
		}
	}, [derivedState.currentPullRequestCommentId]);

	const [activeTab, setActiveTab] = useState(1);
	const [scrollPosition, setScrollPosition] = useState(EMPTY_HASH2);
	const [bbRepo, setBbRepo] = useState<FetchThirdPartyPullRequestRepository>();
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);
	const [openRepos, setOpenRepos] = useState<ReposScmPlusName[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
	const [currentRepoChanged, setCurrentRepoChanged] = useState(false);

	const [oneLayerModal, setOneLayerModal] = useState(false);
	const [autoCheckedMergeability, setAutoCheckedMergeability] =
		useState<autoCheckedMergeabilityStatus>("UNCHECKED");
	const [prCommitsRange, setPrCommitsRange] = useState<string[]>([]);

	const switchActiveTab = tab => {
		// remember the scroll position of the tab we just left
		const container = document.getElementById("pr-scroll-container");
		if (container) setScrollPosition({ ...scrollPosition, [activeTab]: container.scrollTop });
		setActiveTab(tab);
	};

	const PRError = styled.div`
		padding: 0px 15px 20px 15px;
		display: flex;
		align-items: center;
		> .icon {
			flex-grow: 0;
			flex-shrink: 0;
			display: inline-block;
			margin-right: 15px;
			transform: scale(1.5);
			color: #ff982d;
		}
		> div {
			color: #ff982d;
			flex-grow: 10;
			display: flex;
			align-items: center;
			button {
				margin-left: auto;
			}
		}
		strong {
			font-weight: normal;
			color: var(--text-color-highlight);
		}
		a {
			text-decoration: none;
			color: var(--text-color-highlight);
			&:hover {
				color: var(--text-color-info) !important;
			}
		}
	`;

	const _assignState = (pr, src?: string) => {
		if (!pr || !pr.repository) return;
		console.warn("_assignState src", src);
		setBbRepo(pr.repository);
		setTitle(pr.repository.pullRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
	};

	const initialFetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = await dispatch(
			getPullRequestConversations({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		).unwrap();
		setGeneralError("");
		if (response?.error && response?.error.message) {
			setIsLoadingPR(false);
			setIsLoadingMessage("");
			setGeneralError(response.error.message);
			console.error(response.error.message);
			return undefined;
		} else {
			_assignState(response, "initialFetch");
			return response;
		}
	};

	/**
	 * This is called when a user clicks the "reload" button.
	 * with a "hard-reload" we need to refresh the conversation and file data
	 * @param message
	 */
	const reload = async (message?: string) => {
		console.log("PullRequest is reloading");
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);
		const response = await dispatch(
			getPullRequestConversationsFromProvider({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		).unwrap();
		_assignState(response, "reload");

		// just clear the files and commits data -- it will be fetched if necessary (since it has its own api call)
		dispatch(
			clearPullRequestFiles(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		);
		dispatch(
			clearPullRequestCommits({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		);
	};

	const checkout = async () => {
		if (!pr) return;

		setIsLoadingBranch(true);

		const repoId = derivedState.prRepoId || "";
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: pr!.headRefName,
			repoId: repoId,
		});
		if (result.error) {
			logError(result.error, {
				prRepoId: derivedState.prRepoId,
				branch: pr.headRefName,
				repoId: repoId,
				prRepository: pr!.repository,
			});

			confirmPopup({
				title: "Git Error",
				className: "wide",
				message: (
					<div className="monospace" style={{ fontSize: "11px" }}>
						{result.error}
					</div>
				),
				centered: false,
				buttons: [{ label: "OK", className: "control-button" }],
			});
			setIsLoadingBranch(false);
		} else {
			setIsLoadingBranch(false);
			getOpenRepos();
		}
	};

	useEffect(() => {
		if (pr && pr.headRefName && derivedState.checkoutBranch) {
			checkout();
			// clear the branch flag
			dispatch(setCurrentPullRequest(pr.providerId, pr.id));
		}
	}, [pr && pr.headRefName, derivedState.checkoutBranch]);

	useEffect(() => {
		if (!pr) return;

		const _didChangeDataNotification = HostApi.instance.on(DidChangeDataNotificationType, e => {
			if (e.type === ChangeDataType.Commits) {
				getOpenRepos().then(_ => {
					const currentOpenRepo = openRepos.find(
						_ =>
							_?.name.toLowerCase() === pr.repository?.name?.toLowerCase() ||
							_?.folder?.name?.toLowerCase() === pr.repository?.name?.toLowerCase()
					);
					setCurrentRepoChanged(
						!!(e.data.repo && currentOpenRepo && currentOpenRepo.currentBranch == pr.headRefName)
					);
				});
			}
		});

		return () => {
			_didChangeDataNotification && _didChangeDataNotification.dispose();
		};
	}, [openRepos, pr]);

	const saveTitle = async () => {
		try {
			setIsLoadingMessage("Saving Title...");
			setSavingTitle(true);
			dispatch(
				api({
					method: "updatePullRequestTitle",
					params: {
						providerId: derivedState.currentPullRequestProviderId!,
						id: derivedState.currentPullRequestId!,
						title: title,
					},
				})
			);
		} catch (er) {
			dispatch(
				setProviderError(
					derivedState.currentPullRequestProviderId!,
					derivedState.currentPullRequestId!,
					{
						message: "Error saving title",
					}
				)
			);
		} finally {
			setSavingTitle(false);
			setEditingTitle(false);
			setIsLoadingMessage("");
		}
	};

	const getOpenRepos = async () => {
		const { reposState } = derivedState;
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
		});
		if (response && response.repositories) {
			const repos = response.repositories.map(repo => {
				const id = repo.id || "";
				return { ...repo, name: reposState[id] ? reposState[id].name : "" };
			});
			setOpenRepos(repos);
		}
	};

	const closeFileComments = () => {
		// note we're passing no value for the 3rd argument, which clears
		// the commentId
		if (oneLayerModal && pr) {
			//TODO: not sure why pr.id is a number, but should be a string. Causes error when closing modal.
			dispatch(setCurrentPullRequest(pr.providerId, pr.id.toString(), "", "", "sidebar-diffs"));
		}

		if (!oneLayerModal && pr) {
			//TODO: not sure why pr.id is a number, but should be a string. Causes error when closing modal.
			dispatch(setCurrentPullRequest(pr.providerId, pr.id.toString(), "", "", "details"));
		}
	};

	const linkHijacker = (e: any) => {
		if (e && e.target.tagName === "A" && e.target.text === "Changes reviewed on CodeStream") {
			const review = Object.values(derivedState.reviewLinks).find(
				_ => _.permalink === e.target.href.replace("?src=Bitbucket", "")
			);
			if (review) {
				e.preventDefault();
				e.stopPropagation();
				dispatch(clearCurrentPullRequest());
				dispatch(setCurrentReview(review.id));
			}
		}
	};

	useEffect(() => {
		document.addEventListener("click", linkHijacker);
		return () => {
			document.removeEventListener("click", linkHijacker);
		};
	}, [derivedState.reviewLinks]);

	const numComments = useMemo(() => {
		if (!pr || !pr.timelineItems.nodes) return 0;
		const num = pr.timelineItems.nodes.length;

		return num;
	}, [pr, pr?.updatedAt]);

	useDidMount(() => {
		if (!derivedState.reviewsStateBootstrapped) {
			dispatch(bootstrapReviews());
		}
		if (
			derivedState.currentPullRequestCommentId &&
			!derivedState.composeCodemarkActive &&
			derivedState.previousPullRequestView === "sidebar-diffs"
		) {
			setOneLayerModal(true);
		}

		getOpenRepos();
		initialFetch();
	});

	const _checkMergeabilityStatus = async () => {
		if (
			!derivedState.currentPullRequest ||
			!derivedState.currentPullRequest.conversations ||
			!derivedState.currentPullRequest.conversations.repository ||
			!derivedState.currentPullRequest.conversations.repository.pullRequest
		)
			return undefined;
		try {
			const response = await dispatch(
				api({
					method: "getPullRequestLastUpdated",
					params: {},
					options: { preventClearError: true },
				})
			).unwrap();
			if (
				derivedState.currentPullRequest &&
				response &&
				response.mergeable !==
					derivedState.currentPullRequest.conversations.repository.pullRequest.mergeable
			) {
				console.log(
					"getPullRequestLastUpdated is updating (mergeable)",
					derivedState.currentPullRequest.conversations.repository.pullRequest.mergeable,
					response.mergeable
				);
				reload();
				return response.mergeable !== "UNKNOWN";
			}
		} catch (ex) {
			console.error(ex);
		}
		return undefined;
	};

	const isMergeable = () => {
		if (pr?.viewerCanUpdate && pr?.state === "OPEN") {
			return true;
		} else {
			return false;
		}
	};

	const checkMergeabilityStatus = useCallback(() => {
		_checkMergeabilityStatus();
	}, [derivedState.currentPullRequest, derivedState.currentPullRequestId]);

	let interval;
	let intervalCounter = 0;
	useEffect(() => {
		interval && clearInterval(interval);
		if (!derivedState.currentPullRequest) return;

		interval = setInterval(
			async () => {
				// checks for 15 min
				if (intervalCounter >= 15) {
					interval && clearInterval(interval);
					intervalCounter = 0;
					console.warn(`stopped getPullRequestLastUpdated interval counter=${intervalCounter}`);
					return;
				}
				try {
					const response = await dispatch(
						api({
							method: "getPullRequestLastUpdated",
							params: {},
							options: { preventClearError: true, preventErrorReporting: true },
						})
					).unwrap();
					if (
						derivedState.currentPullRequest &&
						response &&
						response.updatedAt &&
						derivedState.currentPullRequestLastUpdated &&
						// if more than 5 seconds "off""
						(Date.parse(response.updatedAt) -
							Date.parse(derivedState.currentPullRequestLastUpdated)) /
							1000 >
							5
					) {
						console.warn(
							"getPullRequestLastUpdated is updating",
							response.updatedAt,
							derivedState.currentPullRequestLastUpdated,
							intervalCounter
						);
						intervalCounter = 0;
						reload();
						clearInterval(interval);
					} else {
						intervalCounter++;
						console.log("incrementing counter", intervalCounter);
					}
				} catch (ex) {
					console.error(ex);
					interval && clearInterval(interval);
				}
			},
			1000 * 60 * 19
		); //300000 === 5 minute interval

		return () => {
			interval && clearInterval(interval);
		};
	}, [
		derivedState.currentPullRequestLastUpdated,
		derivedState.currentPullRequest,
		autoCheckedMergeability,
	]);

	const breakpoints = {
		auto: "630px",
		"side-by-side": "10px",
		vertical: "100000px",
	};

	const addViewPreferencesToTheme = theme => ({
		...theme,
		breakpoint: breakpoints[derivedState.viewPreference],
	});

	if (!pr) {
		if (generalError) {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<div style={{ textAlign: "left", width: "100%" }}>
						Error Loading Pull Request:
						<br />
						<div style={{ overflow: "auto", width: "100%", height: "7vh" }}>
							{generalError.replace(/\\t/g, "     ").replace(/\\n/g, "")}
						</div>
					</div>
				</div>
			);
		} else {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Pull Request...</LoadingMessage>
				</div>
			);
		}
	} else {
		const statusIcon = pr.state === "OPEN" || pr.state === "CLOSED" ? "pull-request" : "git-merge";
		const action = pr.merged ? "merged " : "wants to merge ";

		if (oneLayerModal) {
			return (
				<ThemeProvider theme={addViewPreferencesToTheme}>
					<Root className="panel full-height">
						<PullRequestFileComments
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							commentId={derivedState.currentPullRequestCommentId}
							quote={() => {}}
							onClose={closeFileComments}
							prCommitsRange={prCommitsRange}
						/>
					</Root>
				</ThemeProvider>
			);
		}

		return (
			<ThemeProvider theme={addViewPreferencesToTheme}>
				<Root className="bitbucket">
					{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
					<PRHeader>
						<PRTitle className={editingTitle ? "editing" : ""}>
							{editingTitle ? (
								<PREditTitle>
									<input
										id="title-input"
										name="title"
										value={title}
										className="input-text control"
										autoFocus
										type="text"
										onChange={e => setTitle(e.target.value)}
										placeholder=""
									/>
									<Button onClick={saveTitle} isLoading={savingTitle}>
										Save
									</Button>
									<Button
										variant="secondary"
										onClick={() => {
											setTitle("");
											setSavingTitle(false);
											setEditingTitle(false);
										}}
									>
										Cancel
									</Button>
								</PREditTitle>
							) : (
								<>
									{title || pr.title}{" "}
									<Tooltip title="Open on Bitbucket" placement="top" delay={1}>
										<span>
											<Link href={pr.url}>
												#{pr.number}
												<Icon name="link-external" className="open-external" />
											</Link>
										</span>
									</Tooltip>
								</>
							)}
						</PRTitle>
						<PRStatus>
							<PRStatusButton
								disabled
								fullOpacity
								variant={
									pr.isDraft
										? "neutral"
										: pr.state === "OPEN"
										? "success"
										: pr.state === "MERGED"
										? "merged"
										: pr.state === "CLOSED"
										? "destructive"
										: "primary"
								}
							>
								<Icon name={statusIcon} />
								{pr.isDraft ? "Draft" : pr.state ? pr.state.toLowerCase() : ""}
							</PRStatusButton>
							<PRStatusMessage>
								<PRAuthor>{(pr.author || GHOST).login}</PRAuthor>
								<PRAction>
									{action} {pr.commits && pr.commits.totalCount} commits into{" "}
									<Link href={`${pr.repoUrl}/tree/${pr.baseRefName}`}>
										<PRBranch>
											{pr.repository.name}:{pr.baseRefName}
										</PRBranch>
									</Link>
									{" from "}
									<Link href={`${pr.url}`}>
										<PRBranch>{pr.headRefName}</PRBranch>
									</Link>{" "}
									<Icon
										title="Copy"
										placement="bottom"
										name="copy"
										className="clickable"
										onClick={e => copy(pr.url)}
									/>
								</PRAction>
								<Timestamp time={pr.createdAt} relative />
							</PRStatusMessage>
							<PRActionButtons>
								{isOpen ? (
									<MergeScreen
										pr={pr}
										onClose={() => {
											setIsOpen(false);
										}}
									></MergeScreen>
								) : (
									<>
										{pr.viewerCanUpdate && (
											<span>
												<Icon
													title="Edit Title"
													trigger={["hover"]}
													delay={1}
													onClick={() => {
														setTitle(pr.title);
														setEditingTitle(true);
													}}
													placement="bottom"
													name="pencil"
												/>
											</span>
										)}
										<PullRequestReviewButton pullRequest={pr}></PullRequestReviewButton>
										<span className={isMergeable() ? "" : "disabled"}>
											<Icon
												name="git-merge"
												title={
													<>
														Merge
														{!isMergeable() && (
															<div className="subtle smaller" style={{ maxWidth: "200px" }}>
																Disabled: {`Cannot merge`}
															</div>
														)}
													</>
												}
												trigger={["hover"]}
												className="clickable"
												delay={1}
												placement="bottom"
												{...(isMergeable()
													? {
															onClick: e => {
																setIsOpen(true);
															},
													  }
													: {})}
											/>
										</span>
									</>
								)}
							</PRActionButtons>
						</PRStatus>
						{derivedState.currentPullRequest &&
							derivedState.currentPullRequest.error &&
							derivedState.currentPullRequest.error.message && (
								<PRError>
									<Icon name="alert" />
									<div>{derivedState.currentPullRequest.error.message}</div>
								</PRError>
							)}
						<Tabs style={{ marginTop: 0 }}>
							<Tab onClick={e => switchActiveTab(1)} active={activeTab == 1}>
								<Icon name="comment" />
								<span className="wide-text">Conversation</span>
								<PRBadge>{numComments}</PRBadge>
							</Tab>
							<Tab onClick={e => switchActiveTab(2)} active={activeTab == 2}>
								<Icon name="git-commit" />
								<span className="wide-text">Commits</span>
								<PRBadge>{pr.commits.totalCount}</PRBadge>
							</Tab>
							<PRPlusMinus>
								<span className="added">+{pr.additions}</span>{" "}
								<span className="deleted">-{pr.deletions}</span>
							</PRPlusMinus>
						</Tabs>
					</PRHeader>
					{!derivedState.composeCodemarkActive && (
						<ScrollBox>
							<div
								className="channel-list vscroll"
								id="pr-scroll-container"
								style={{ paddingTop: "10px" }}
							>
								{activeTab === 1 && (
									<PullRequestConversationTab
										autoCheckedMergeability={autoCheckedMergeability}
										checkMergeabilityStatus={checkMergeabilityStatus}
										setIsLoadingMessage={setIsLoadingMessage}
										initialScrollPosition={scrollPosition[1]}
									/>
								)}
								{activeTab === 2 && (
									<PullRequestCommitsTab
										pr={pr}
										bbRepo={bbRepo}
										initialScrollPosition={scrollPosition[2]}
									/>
								)}
								{activeTab === 4 && (
									<PullRequestFilesChangedTab
										key="files-changed"
										pr={pr}
										initialScrollPosition={scrollPosition[4]}
										setIsLoadingMessage={setIsLoadingMessage}
										prCommitsRange={prCommitsRange}
										setPrCommitsRange={setPrCommitsRange}
									/>
								)}
							</div>
						</ScrollBox>
					)}
					{!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
						<PullRequestFileComments
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							commentId={derivedState.currentPullRequestCommentId}
							quote={() => {}}
							onClose={closeFileComments}
							prCommitsRange={prCommitsRange}
						/>
					)}
				</Root>
			</ThemeProvider>
		);
	}
};
