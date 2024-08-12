import React from "react";
import ScrollBox from "./ScrollBox";
import { CodeStreamState } from "../store";
import { useAppDispatch, useAppSelector } from "../utilities/hooks";

import { PanelHeader } from "../src/components/PanelHeader";

import CancelButton from "./CancelButton";
import { closePanel } from "./actions";
import Icon from "./Icon";
import copy from "copy-to-clipboard";
import { generateCsv } from "./GenerateCsvFunction";

export const ExportPanel = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return { webviewFocused: state.context.hasFocus, repos: state.repos };
	});
	const data = generateCsv();

	return (
		<div className="panel full-height activity-panel">
			<PanelHeader
				title={
					<span>
						Data Export{" "}
						<Icon
							name="copy"
							className="clickable"
							onClick={() => (data ? copy(data) : "")}
							title="Copy Export to Clipboard"
						/>
					</span>
				}
			>
				<CancelButton onClick={() => dispatch(closePanel())} />
			</PanelHeader>
			<ScrollBox>
				<div className="channel-list vscroll" style={{ padding: "0 0 0 0" }}>
					<textarea
						className="monospace"
						style={{
							width: "100%",
							height: "calc(100% - 5px)",
							whiteSpace: "nowrap",
							overflow: "auto",
						}}
					>
						{data}
					</textarea>
				</div>
			</ScrollBox>
		</div>
	);
};
