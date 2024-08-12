import React, { useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./ErrorRow";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { IdeNames, OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { CLMSettings } from "@codestream/protocols/api";
import { setCurrentObservabilityAnomaly } from "@codestream/webview/store/context/actions";
import { closeAllPanels } from "@codestream/webview/store/context/thunks";
import Tooltip from "./Tooltip";
import {
	DetectionMethod,
	ObservabilityAnomaly,
	ObservabilityRepo,
	TelemetryData,
} from "@codestream/protocols/agent";
import Icon from "./Icon";
import styled from "styled-components";
import { isEmpty as _isEmpty } from "lodash-es";
import { getNrAiUserId } from "@codestream/webview/store/users/reducer";

interface Props {
	accountId: number;
	observabilityAnomalies: ObservabilityAnomaly[];
	observabilityRepo: ObservabilityRepo;
	detectionMethod?: DetectionMethod;
	entityGuid?: string;
	entityName?: string;
	title?: string;
	collapseDefault?: boolean;
	noAnomaly?: boolean;
}

const TransactionIconSpan = styled.span`
	padding-top: 3px;
	margin-right: 4px;
`;

const FilePathWrapper = styled.div`
	display: flex;
	align-items: baseline;
`;

const FilePathMiddleSection = styled.span`
	overflow: hidden;
	height: inherit;
	flex: 0 1 auto;
	white-space: nowrap;
	direction: rtl;
	text-overflow: ellipsis;
	text-overflow: "...";
	min-width: 14px;
`;

export const ObservabilityAnomaliesGroup = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			ideName: encodeURIComponent(state.ide.name || ""),
			nrAiUserId: getNrAiUserId(state),
			userId: state.session.userId,
			demoMode: state.codeErrors.demoMode,
			clmSettings,
			isProductionCloud: state.configs.isProductionCloud,
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);
	const [numToShow, setNumToShow] = useState(5);
	const [hoveredRowIndex, setHoveredRowIndex] = useState<string | undefined>(undefined);
	const hasMoreAnomaliesToShow = props.observabilityAnomalies.length > numToShow;

	const handleClickTelemetry = (anomaly: ObservabilityAnomaly) => {
		const event: TelemetryData = {
			entity_guid: props.entityGuid,
			account_id: props.accountId,
			meta_data: `anomaly_category: ${anomaly.scope ? "metric" : "transaction"}`,
			meta_data_2: `anomaly_type: ${
				anomaly.type === "duration"
					? "avg_duration"
					: anomaly.type === "errorRate"
					? "error_rate"
					: ""
			}`,
			meta_data_3: `language: ${props.observabilityAnomalies[0]?.language ?? "<unknown>"}`,
			meta_data_5: `anomaly_prefix: ${anomaly.name.split("/")[0]}`,
			event_type: "click",
		};

		console.debug("CLM Anomaly Clicked", event);

		HostApi.instance.track("codestream/anomaly_link clicked", event);
	};

	const handleClick = (anomaly: ObservabilityAnomaly) => {
		handleClickTelemetry(anomaly);
		dispatch(closeAllPanels());
		dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!, props.entityName));

		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "anomaly",
			title: "Anomaly",
			entryPoint: "tree_view",
			entityGuid: props.entityGuid,
			entityName: props.entityName,
			anomaly: anomaly,
			clmSettings: derivedState.clmSettings as CLMSettings,
			isProductionCloud: derivedState.isProductionCloud,
			nrAiUserId: derivedState.nrAiUserId,
			userId: derivedState.userId,
			demoMode: derivedState.demoMode.enabled,
			ide: {
				name: derivedState.ideName as IdeNames,
			},
		});
	};

	const formatFilePath = (filepath: String) => {
		const sections = filepath.split("/");
		const first = sections[0];
		const middle = sections.slice(1, -1).join("/");
		const last = sections[sections.length - 1];

		return (
			<FilePathWrapper>
				<span>
					{first}
					{!_isEmpty(middle) && <>/</>}
				</span>
				{!_isEmpty(middle) && <FilePathMiddleSection>{middle}</FilePathMiddleSection>}
				<span>/{last}</span>
			</FilePathWrapper>
		);
	};

	const getAnomalyTypeLabel = (type: "errorRate" | "duration") => {
		switch (type) {
			case "duration":
				return "Average Duration";
			case "errorRate":
				return "Error Rate";
			default:
				return "";
		}
	};

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const tooltipContent = anomaly => {
		const roundedPercentage = getRoundedPercentage(anomaly.ratio);
		let roundedPercentageText =
			roundedPercentage > 0 ? `+${roundedPercentage}%` : `+${roundedPercentage}%`;
		const anomalyTypeText = getAnomalyTypeLabel(anomaly.type);

		return (
			<div>
				<div style={{ overflowWrap: "break-word", marginBottom: "4px" }}>{anomaly.text}</div>
				<div>
					{anomalyTypeText}: <span style={{ color: "red" }}>{roundedPercentageText}</span>
				</div>
			</div>
		);
	};

	return (
		<>
			{
				<>
					{props.observabilityAnomalies.length == 0 ? (
						<ErrorRow
							customPadding={"0 10px 0 50px"}
							title={"No anomalies found"}
							icon="thumbsup"
						/>
					) : (
						<>
							{props.observabilityAnomalies.slice(0, numToShow).map((anomaly, index) => {
								return (
									<>
										<Row
											style={{
												padding: "0 10px 0 42px",
											}}
											className={"pr-row"}
											onClick={e => {
												handleClick(anomaly);
											}}
											onMouseEnter={() => {
												setHoveredRowIndex(`parent_${index}`);
											}}
											onMouseLeave={() => {
												setHoveredRowIndex(undefined);
											}}
										>
											<TransactionIconSpan>
												<Icon
													style={{ paddingTop: "2px", paddingLeft: "0px" }}
													className="subtle"
													name="anomaly"
													data-testid={`anomaly-index-${index}`}
												/>
											</TransactionIconSpan>
											<Tooltip title={tooltipContent(anomaly)} placement="topRight" delay={1}>
												{formatFilePath(anomaly.text)}
											</Tooltip>

											<AnomalyValue
												anomaly={anomaly}
												noAnomaly={props?.noAnomaly}
												isHovered={hoveredRowIndex === `parent_${index}` ? true : false}
											/>
										</Row>
										{anomaly.children &&
											anomaly.children
												.sort((a, b) => b.ratio - a.ratio)
												.map((child, childIndex) => {
													return (
														<Row
															style={{
																padding: "0 10px 0 54px",
															}}
															className={"pr-row"}
															onClick={e => {
																handleClick(child);
															}}
															onMouseEnter={() => {
																setHoveredRowIndex(`child_${index}_${childIndex}`);
															}}
															onMouseLeave={() => {
																setHoveredRowIndex(undefined);
															}}
														>
															<TransactionIconSpan>
																<Icon
																	style={{ paddingTop: "2px", paddingLeft: "0px" }}
																	className="subtle"
																	name="anomaly"
																/>
															</TransactionIconSpan>
															<Tooltip title={tooltipContent(child)} placement="topRight" delay={1}>
																{formatFilePath(child.text)}
															</Tooltip>
															<AnomalyValue
																anomaly={child}
																noAnomaly={props?.noAnomaly}
																isHovered={
																	hoveredRowIndex === `child_${index}_${childIndex}` ? true : false
																}
															/>
														</Row>
													);
												})}
									</>
								);
							})}
						</>
					)}
					{hasMoreAnomaliesToShow && (
						<div
							style={{ padding: "0px 10px 0px 50px", cursor: "pointer" }}
							onClick={() => {
								const newNumToShow = numToShow + 5;
								setNumToShow(newNumToShow);
							}}
						>
							Show More
						</div>
					)}
				</>
			}
		</>
	);
});

interface AnomalyValueProps {
	anomaly: ObservabilityAnomaly;
	noAnomaly?: boolean;
	isHovered: boolean;
}
const AnomalyValue = React.memo((props: AnomalyValueProps) => {
	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const getTypeAndValueOutput = (type: "errorRate" | "duration", ratio) => {
		if (props.noAnomaly) return <div></div>;
		const roundedPercentage = getRoundedPercentage(ratio);
		let roundedPercentageText =
			roundedPercentage > 0 ? `${roundedPercentage}%+` : `${roundedPercentage}%+`;

		return (
			<div
				style={{
					overflow: "visible",
					marginLeft: "auto",
					textAlign: "right",
					direction: "rtl",
					width: "40%",
				}}
			>
				<span
					style={{
						color: "red",
						display: "inline-block",
						minWidth: "66px",
					}}
				>
					{roundedPercentageText}
				</span>
			</div>
		);
	};

	const iconContent = useMemo(() => {
		return (
			<>
				<div>{getTypeAndValueOutput(props.anomaly.type, props.anomaly.ratio)}</div>
			</>
		);
	}, [props.isHovered, props.anomaly.type, props.anomaly.ratio, props.noAnomaly]);

	return (
		<div style={{ paddingLeft: "0px" }} className="icons">
			{iconContent}
		</div>
	);
});
