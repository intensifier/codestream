import { CSCodeError } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";
import { CSAsyncError, NewRelicErrorGroup } from "@codestream/protocols/agent";
import { Range } from "vscode-languageserver-protocol";
import { Discussion } from "../types";

export enum CodeErrorsActionsTypes {
	AddCodeErrors = "ADD_CODEERRORS",
	SetFunctionToEdit = "@codeErrors/SetFunctionToEdit",
	SetFunctionToEditFailed = "@codeErrors/SetFunctionToEditFailed",
	SetGrokError = "@codeErrors/SetGrokError",
	SetGrokLoading = "@codeErrors/SetGrokLoading",
	SetGrokRepliesLength = "@codeErrors/SetGrokRepliesLength",
	UpdateCodeErrors = "@codeErrors/UpdateCodeErrors",
	Delete = "@codeErrors/Delete",
	HandleDirectives = "@codeErrors/HandleDirectives",
	AddProviderError = "@codeErrors/AddError",
	ClearProviderError = "@codeErrors/ClearError",
	SetErrorGroup = "@codeError/SetErrorGroup",
	IsLoadingErrorGroup = "@codeError/IsLoadingErrorGroup",
	ResetNrAi = "@codeError/ResetNrAiState",
	SetDemoMode = "@codeError/SetDemoMode",
	SetDiscussion = "@codeError/SetDiscussion",
}

export type FunctionToEdit = {
	codeBlock: string;
	symbol: string;
	uri: string;
	range: Range;
	namespace?: string;
	language?: string;
};

export type CodeErrorsState = {
	bootstrapped: boolean;
	codeErrors: Index<CSCodeError>;
	errorGroups: Index<{
		id: string;
		error?: string;
		isLoading?: boolean;
		errorGroup: NewRelicErrorGroup;
	}>;
	functionToEdit?: FunctionToEdit;
	grokRepliesLength: number;
	grokError: CSAsyncError | undefined;
	functionToEditFailed: boolean;
	demoMode: { enabled: boolean; count: number };
	discussion?: Discussion;
};
