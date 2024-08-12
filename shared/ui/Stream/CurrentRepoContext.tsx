import {
	GetFileScmInfoRequestType,
	GetFileScmInfoResponse,
	GetReposScmRequestType,
	ObservabilityRepo,
	ReposScm,
} from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import styled from "styled-components";
import { setUserPreference } from "./actions";
import { CodeStreamState } from "../store";
import { setEditorContext } from "../store/editorContext/actions";
import { useDidMount } from "../utilities/hooks";
import { isNotOnDisk } from "../utils";
import { HostApi } from "../webview-api";
import Icon from "./Icon";
import { useAppDispatch } from "../utilities/hooks";

interface Props {
	currentRepoCallback: (repoId?: string) => void;
	observabilityRepos?: ObservabilityRepo[];
	isHeaderText?: boolean;
	repoName?: string;
	serviceCount?: number;
	suppressCallback?: boolean;
}

interface CurrentRepoContainerProps {
	isHeaderText?: boolean;
}
const CurrentRepoContainer = styled.span<CurrentRepoContainerProps>`
	color: ${props =>
		props.isHeaderText ? "var(--text-color-highlight)" : "var(--text-color-subtle)"};
	display: ${props => (props.isHeaderText ? "flex" : "inherit")};
	margin-left: -4px;
`;

export const CurrentRepoContext = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo,
		};
	}, shallowEqual);

	const [currentRepoName, setCurrentRepoName] = useState<string>(`[repository]`);

	useDidMount(() => {
		onFileChanged();
	});

	useEffect(() => {
		if (String(derivedState.textEditorUri).length > 0) {
			onFileChanged();
		}
	}, [props.observabilityRepos, derivedState.textEditorUri]);

	const onFileChanged = async (checkBranchUpdate = false) => {
		let { scmInfo, textEditorUri } = derivedState;

		const getRepoName = (repo: ReposScm, scmInfo: GetFileScmInfoResponse | undefined) => {
			let repoName;
			if (repo.folder.name) {
				repoName = repo.folder.name;
			}

			if (!repoName && repo.path) {
				repoName = repo.path.substring(repo.path.lastIndexOf("/") + 1);
			}

			if (!repoName && scmInfo?.scm?.repoPath) {
				repoName = scmInfo?.scm?.repoPath.substring(scmInfo?.scm?.repoPath.lastIndexOf("/") + 1);
			}

			return repoName;
		};

		const setCurrentRepo = (repo: ReposScm, scmInfo: GetFileScmInfoResponse | undefined) => {
			if (!props.suppressCallback) {
				const repoName = getRepoName(repo, scmInfo);
				const currentRepoId = repo.id || scmInfo?.scm?.repoId;

				setCurrentRepoName(repoName);
				console.debug(
					`o11y: currentRepoContext: setting currentRepoCallback currentRepo?.id  ${repo.id} scmInfo?.scm?.repoId ${scmInfo?.scm?.repoId}`
				);
				props.currentRepoCallback(currentRepoId);
				dispatch(
					setUserPreference({
						prefPath: ["currentO11yRepoId"],
						value: currentRepoId,
					})
				);
			}
		};

		// case: no file open, or non-file document open, and no previous repo set
		if (textEditorUri === undefined || isNotOnDisk(textEditorUri)) {
			if (currentRepoName === "[repository]") {
				const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
				});
				if (reposResponse.repositories) {
					const currentRepo = reposResponse.repositories[0];
					setCurrentRepo(currentRepo, scmInfo);
				}
			}
			return;
		}

		// case: file opened from different repo
		if (!scmInfo || scmInfo.uri !== textEditorUri || checkBranchUpdate || currentRepoName) {
			if (textEditorUri) {
				scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
					uri: textEditorUri,
				});
			}

			const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true,
			});
			const currentRepo = reposResponse.repositories?.find(
				repo => repo.id === scmInfo?.scm?.repoId
			);
			await dispatch(setEditorContext({ scmInfo }));
			if (currentRepo) {
				setCurrentRepo(currentRepo, scmInfo);
			}
		}

		//await fetchDocumentMarkers(textEditorUri);
	};

	return (
		<CurrentRepoContainer isHeaderText={props.isHeaderText ? true : false}>
			<Icon style={{ transform: "scale(0.7)", display: "inline-block" }} name="repo" />{" "}
			<span
				style={{
					fontSize: "11px",
					fontWeight: "bold",
					margin: props.isHeaderText ? "1px 2px 0px 0px" : "0",
				}}
			>
				{props.repoName?.toUpperCase()}
			</span>
			{props.isHeaderText && (
				<span className="subtle">
					{props.serviceCount === 0 ? "" : <>({props.serviceCount})</>}
				</span>
			)}
		</CurrentRepoContainer>
	);
});
