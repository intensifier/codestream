import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";
import { CodeStreamState } from "@codestream/webview/store";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import {
	ObservabilityErrorCore,
	ObservabilityRepo,
	ObservabilityRepoError,
} from "@codestream/protocols/agent";
import { shallowEqual } from "react-redux";

interface Props {
	observabilityErrors: ObservabilityRepoError[];
	observabilityRepo?: ObservabilityRepo;
	observabilityAssignments: ObservabilityErrorCore[];
	errorEntityGuid: string;
	noAccess?: string;
	errorMsg?: string;
	errorInboxError?: string;
	domain?: string;
	isServiceSearch?: boolean;
	hasRepoAssociated?: boolean;
}

export const ObservabilityErrorWrapper = React.memo((props: Props) => {
	const { errorMsg } = props;
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const errorDropdownIsExpanded = preferences?.errorDropdownIsExpanded ?? false;

		return {
			errorDropdownIsExpanded,
		};
	}, shallowEqual);

	const handleRowOnClick = () => {
		if (props.isServiceSearch) {
			setIsExpanded(!isExpanded);
		} else {
			const { errorDropdownIsExpanded } = derivedState;

			dispatch(
				setUserPreference({
					prefPath: ["errorDropdownIsExpanded"],
					value: !errorDropdownIsExpanded,
				})
			);
		}
	};

	const expanded = props.isServiceSearch ? isExpanded : derivedState.errorDropdownIsExpanded;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
				data-testid={`observabilty-errors-dropdown`}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ margin: "0 5px 0 2px" }}>Errors</span>
				{errorMsg && (
					<Icon
						style={{ transform: "scale(0.8)" }}
						name="alert"
						className="clickable"
						placement="bottom"
						title={`Last request failed: ${errorMsg}`}
						delay={1}
					/>
				)}
			</Row>
			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => handleRowOnClick()}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							{props.noAccess === "403" ? (
								<>
									Your New Relic account doesn’t have access to the errors integration with
									CodeStream. Contact your New Relic admin to upgrade your account or{" "}
									<Link
										useStopPropagation={true}
										href="https://docs.newrelic.com/docs/accounts/original-accounts-billing/original-users-roles/user-migration"
									>
										migrate to New Relic’s new user model
									</Link>{" "}
									in order to see errors in CodeStream.
								</>
							) : (
								props.noAccess
							)}
						</span>
					</Row>
				) : (
					<>
						<ObservabilityAssignmentsDropdown
							observabilityAssignments={props.observabilityAssignments}
							entityGuid={props.errorEntityGuid}
							errorInboxError={props.errorInboxError}
							domain={props?.domain}
							isServiceSearch={props?.isServiceSearch}
							hasRepoAssociated={props?.hasRepoAssociated}
						/>
						<ObservabilityErrorDropdown
							observabilityErrors={props.observabilityErrors}
							observabilityRepo={props.observabilityRepo}
							entityGuid={props.errorEntityGuid}
							domain={props?.domain}
							isServiceSearch={props?.isServiceSearch}
							hasRepoAssociated={props?.hasRepoAssociated}
						/>
					</>
				))}
		</>
	);
});
