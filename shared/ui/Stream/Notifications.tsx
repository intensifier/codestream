import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { Checkbox } from "../src/components/Checkbox";
import { setUserPreference, closeModal } from "./actions";
import {
	CSNotificationDeliveryPreference,
	CSNotificationPreference,
} from "@codestream/protocols/api";
import { Dialog } from "../src/components/Dialog";

export const Notifications = props => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const hasDesktopNotifications = state.ide.name === "VSC" || state.ide.name === "JETBRAINS";
		const notificationDeliverySupported = isFeatureEnabled(state, "notificationDeliveryPreference");
		const emailSupported = isFeatureEnabled(state, "emailSupport");

		return {
			notificationPreference: state.preferences.notifications || CSNotificationPreference.InvolveMe,
			notificationDeliveryPreference:
				state.preferences.notificationDelivery || CSNotificationDeliveryPreference.All,
			notifyPerformanceIssues: state.preferences.notifyPerformanceIssues === false ? false : true,
			weeklyEmailDelivery: state.preferences.weeklyEmailDelivery === false ? false : true,
			hasDesktopNotifications,
			notificationDeliverySupported,
			emailSupported,
		};
	});

	const [loading, setLoading] = useState(false);
	const [loadingDelivery, setLoadingDelivery] = useState(false);
	const [loadingNotifyPerformanceIssues, setLoadingNotifyPerformanceIssues] = useState(false);
	const [loadingWeeklyEmailDelivery, setLoadingWeeklyEmailDelivery] = useState(false);

	const handleChange = async (value: string) => {
		setLoading(true);
		dispatch(setUserPreference({ prefPath: ["notifications"], value }));
		setLoading(false);
	};

	const handleChangeWeeklyEmailDelivery = async (value: boolean) => {
		setLoadingWeeklyEmailDelivery(true);
		dispatch(setUserPreference({ prefPath: ["weeklyEmailDelivery"], value }));
		setLoadingWeeklyEmailDelivery(false);
	};

	const handleChangeDelivery = async (value: string) => {
		setLoadingDelivery(true);
		dispatch(setUserPreference({ prefPath: ["notificationDelivery"], value }));
		setLoadingDelivery(false);
	};

	const handleChangeNotifyPerformanceIssues = async (value: boolean) => {
		setLoadingNotifyPerformanceIssues(true);
		dispatch(setUserPreference({ prefPath: ["notifyPerformanceIssues"], value }));
		setLoadingNotifyPerformanceIssues(false);
	};

	return (
		<Dialog title="Notification Settings" onClose={() => dispatch(closeModal())}>
			<form className="standard-form vscroll">
				<fieldset className="form-body">
					<div id="controls">
						{derivedState.hasDesktopNotifications && derivedState.notificationDeliverySupported && (
							<div>
								<div style={{ marginTop: "20px" }}>
									<Checkbox
										name="notifyPerformanceIssues"
										checked={derivedState.notifyPerformanceIssues}
										onChange={handleChangeNotifyPerformanceIssues}
										loading={loadingNotifyPerformanceIssues}
									>
										Notify me about performance issues
									</Checkbox>
								</div>
							</div>
						)}
						<p>&nbsp;</p>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
