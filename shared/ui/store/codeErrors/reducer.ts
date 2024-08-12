import { CSCodeError } from "@codestream/protocols/api";

import { toMapBy } from "../../utils";
import * as activeIntegrationsActions from "../activeIntegrations/actions";
import { ActiveIntegrationsActionType } from "../activeIntegrations/types";
import { ActionType } from "../common";
import * as actions from "./actions";
import { CodeErrorsActionsTypes, CodeErrorsState } from "./types";
import { NewRelicErrorGroup } from "@codestream/protocols/agent";

type CodeErrorsActions = ActionType<typeof actions>;
type ActiveIntegrationsActions = ActionType<typeof activeIntegrationsActions>;

const initialState: CodeErrorsState = {
	bootstrapped: false,
	codeErrors: {},
	errorGroups: {},
	grokRepliesLength: 0,
	grokError: undefined,
	functionToEditFailed: false,
	demoMode: { enabled: false, count: 0 },
	discussion: { threadId: "", comments: [] },
};

export function reduceCodeErrors(
	state = initialState,
	action: CodeErrorsActions | ActiveIntegrationsActions
): CodeErrorsState {
	switch (action.type) {
		case CodeErrorsActionsTypes.AddCodeErrors: {
			const newCodeErrors = toMapBy("entityGuid", action.payload);
			for (const id in newCodeErrors) {
				const existingCodeError = state.codeErrors[id];
				if (existingCodeError) {
					// preserve resolved stack traces
					newCodeErrors[id].stackTraces = existingCodeError.stackTraces;
				}
			}
			return {
				bootstrapped: state.bootstrapped,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				errorGroups: state.errorGroups,
				codeErrors: { ...state.codeErrors, ...newCodeErrors },
				functionToEdit: state.functionToEdit,
				functionToEditFailed: state.functionToEditFailed,
				demoMode: state.demoMode,
			};
		}
		case CodeErrorsActionsTypes.UpdateCodeErrors: {
			return {
				bootstrapped: state.bootstrapped,
				errorGroups: state.errorGroups,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				codeErrors: { ...state.codeErrors, ...toMapBy("entityGuid", action.payload) },
				functionToEdit: state.functionToEdit,
				functionToEditFailed: state.functionToEditFailed,
				demoMode: state.demoMode,
			};
		}

		case CodeErrorsActionsTypes.SetDiscussion: {
			return { ...state, discussion: action.payload };
		}
		case CodeErrorsActionsTypes.SetFunctionToEdit: {
			if (action.payload) {
				console.debug("nraiFunctionToEdit", action.payload);
			}
			return { ...state, functionToEdit: action.payload };
		}
		case CodeErrorsActionsTypes.ResetNrAi: {
			return {
				...state,
				functionToEdit: undefined,
				functionToEditFailed: false,
				grokError: undefined,
				grokRepliesLength: 0,
			};
		}
		case CodeErrorsActionsTypes.SetFunctionToEditFailed: {
			return { ...state, functionToEditFailed: action.payload };
		}
		// case CodeErrorsActionsTypes.SetGrokError: {
		// 	return { ...state, grokError: action.payload };
		// }
		case CodeErrorsActionsTypes.SetGrokRepliesLength: {
			return { ...state, grokRepliesLength: action.payload };
		}
		case CodeErrorsActionsTypes.Delete: {
			const nextCodeErrors = { ...state.codeErrors };
			delete nextCodeErrors[action.payload];
			return {
				bootstrapped: state.bootstrapped,
				codeErrors: nextCodeErrors,
				errorGroups: state.errorGroups,
				functionToEdit: state.functionToEdit,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				functionToEditFailed: state.functionToEditFailed,
				demoMode: state.demoMode,
			};
		}
		case CodeErrorsActionsTypes.SetErrorGroup: {
			const nextErrorGroups = { ...state.errorGroups };

			nextErrorGroups[action.payload.id] = {
				errorGroup: action.payload.data,
				id: action.payload.id,
			};
			return {
				...state,
				errorGroups: nextErrorGroups,
			};
		}
		case CodeErrorsActionsTypes.IsLoadingErrorGroup: {
			const nextErrorGroups = { ...state.errorGroups };
			nextErrorGroups[action.payload.id] = {
				...nextErrorGroups[action.payload.id],
				isLoading: action.payload.data.isLoading,
			};
			return {
				...state,
				errorGroups: nextErrorGroups,
			};
		}
		case ActiveIntegrationsActionType.DeleteForProvider: {
			// if the user is disconnecting from NR, remove all the errorGroups
			if (action.payload.providerId === "newrelic*com") {
				return {
					...state,
					errorGroups: {},
				};
			} else {
				return state;
			}
		}
		case CodeErrorsActionsTypes.HandleDirectives: {
			const nextErrorGroups = { ...state.errorGroups };
			nextErrorGroups[action.payload.id] = {
				...nextErrorGroups[action.payload.id],
			};

			const errorGroupWrapper = nextErrorGroups[action.payload.id];
			if (errorGroupWrapper.errorGroup) {
				for (const directive of action.payload.data) {
					switch (directive.type) {
						case "assignRepository": {
							if (errorGroupWrapper.errorGroup.entity) {
								errorGroupWrapper.errorGroup.entity.repo = directive.data.repo;
							}
							break;
						}
						case "removeAssignee": {
							errorGroupWrapper.errorGroup.assignee = undefined;
							break;
						}
						case "setAssignee": {
							errorGroupWrapper.errorGroup.assignee = directive.data.assignee;
							break;
						}
						case "setState": {
							errorGroupWrapper.errorGroup.state = directive.data.state;
							break;
						}
					}
				}
			}
			return { ...state, errorGroups: nextErrorGroups };
		}
		case CodeErrorsActionsTypes.SetDemoMode: {
			return {
				...state,
				demoMode: { enabled: action.payload, count: state.demoMode.count + 1 },
			};
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function getCodeError(state: CodeErrorsState, id: string): CSCodeError | undefined {
	return state.codeErrors[id];
}

// TODO fix me get the type for the result
export function getErrorGroup(
	state: CodeErrorsState,
	codeError: CSCodeError | undefined
): NewRelicErrorGroup | undefined {
	if (!codeError || codeError.objectType !== "errorGroup" || !codeError.entityGuid)
		return undefined;
	return state.errorGroups[codeError.entityGuid!]?.errorGroup;
}
