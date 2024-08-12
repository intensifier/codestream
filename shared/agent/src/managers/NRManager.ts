"use strict";

import path from "path";

import {
	AddNewRelicIncludeRequest,
	AddNewRelicIncludeRequestType,
	AddNewRelicIncludeResponse,
	CreateNewRelicConfigFileRequest,
	CreateNewRelicConfigFileRequestType,
	CreateNewRelicConfigFileResponse,
	DidResolveStackTraceLineNotificationType,
	FindCandidateMainFilesRequest,
	FindCandidateMainFilesRequestType,
	FindCandidateMainFilesResponse,
	GetRepoFileFromAbsolutePathRequest,
	GetRepoFileFromAbsolutePathRequestType,
	GetRepoFileFromAbsolutePathResponse,
	InstallNewRelicRequest,
	InstallNewRelicRequestType,
	InstallNewRelicResponse,
	ParseStackTraceRequest,
	ParseStackTraceRequestType,
	ParseStackTraceResponse,
	RepoProjectType,
	ResolveStackTracePathsRequestType,
	ResolveStackTracePositionRequest,
	ResolveStackTracePositionRequestType,
	ResolveStackTracePositionResponse,
	ResolveStackTraceRequest,
	ResolveStackTraceRequestType,
	ResolveStackTraceResponse,
	SourceMapEntry,
	TelemetryData,
	WarningOrError,
} from "@codestream/protocols/agent";
import { CSStackTraceInfo, CSStackTraceLine } from "@codestream/protocols/api";
import { structuredPatch } from "diff";
import { isEmpty } from "lodash";
import { Container, SessionContainer } from "../container";
import { isWindows } from "../git/shell";
import { Logger } from "../logger";
import { calculateLocation, MAX_RANGE_VALUE } from "../markerLocation/calculator";
import { CodeStreamSession } from "../session";
import { log } from "../system/decorators/log";
import { lsp, lspHandler } from "../system/decorators/lsp";
import { Strings } from "../system";
import { xfs } from "../xfs";
import { libraryMatchers } from "./libraryMatcher/libraryMatchers";
import { DotNetCoreInstrumentation } from "./newRelicInstrumentation/dotNetCoreInstrumentation";
import { JavaInstrumentation } from "./newRelicInstrumentation/javaInstrumentation";
import { NodeJSInstrumentation } from "./newRelicInstrumentation/nodeJSInstrumentation";
import { Parser as csharpParser } from "./stackTraceParsers/csharpStackTraceParser";
import { Parser as elixirParser } from "./stackTraceParsers/elixirStackTraceParser";
import { Parser as goParser } from "./stackTraceParsers/goStackTraceParser";
import { Parser as javascriptParser } from "./stackTraceParsers/javascriptStackTraceParser";
import { Parser as javaParser } from "./stackTraceParsers/javaStackTraceParser";
import { Parser as phpParser } from "./stackTraceParsers/phpStackTraceParser";
import { Parser as pythonParser } from "./stackTraceParsers/pythonStackTraceParser";
import { Parser as rubyParser } from "./stackTraceParsers/rubyStackTraceParser";
import fs from "fs";
import { parseId } from "../providers/newrelic/utils";

const ExtensionToLanguageMap: { [key: string]: string } = {
	js: "javascript",
	ts: "javascript",
	rb: "ruby",
	php: "php",
	cs: "csharp",
	py: "python",
	kt: "java",
	java: "java",
	go: "go",
	ex: "elixir",
	exs: "elixir",
};

type Parser = (stack: string) => CSStackTraceInfo;

const StackTraceParsers: { [key: string]: Parser } = {
	javascript: javascriptParser,
	ruby: rubyParser,
	php: phpParser,
	csharp: csharpParser,
	python: pythonParser,
	java: javaParser,
	go: goParser,
	elixir: elixirParser,
};

const MISSING_REF_MESSAGE =
	"Your version of the code may not match the environment that triggered the error. Fetch the following reference to better investigate the error.\n${ref}";
const MISSING_REF_HELP_URL =
	"https://docs.newrelic.com/docs/codestream/observability/error-investigation/#buildsha";
const CONFIGURE_ERROR_REF_HELP_URL =
	"https://docs.newrelic.com/docs/codestream/observability/error-investigation/#buildsha";

@lsp
export class NRManager {
	_nodeJS: NodeJSInstrumentation;
	_java: JavaInstrumentation;
	_dotNetCore: DotNetCoreInstrumentation;

	constructor(readonly session: CodeStreamSession) {
		this._nodeJS = new NodeJSInstrumentation(session);
		this._java = new JavaInstrumentation(session);
		this._dotNetCore = new DotNetCoreInstrumentation(session);
	}

	async resolvePathAtRef(resolvedPath: string, ref?: string): Promise<boolean> {
		Logger.debug(`resolvePathAtRef ${resolvedPath}`);
		try {
			const exists = ref
				? await SessionContainer.instance().git.checkFileExistsForRevision(resolvedPath, ref, true)
				: fs.existsSync(resolvedPath);
			return exists;
		} catch (e) {
			// OK if rev doesn't exist - ganbaru!
			if (
				e.message &&
				(e.message.includes("invalid object name") || e.message.includes("Not a valid object name"))
			) {
				return fs.existsSync(resolvedPath);
			}
		}
		return false;
	}

	// returns info gleaned from parsing a stack trace
	@lspHandler(ParseStackTraceRequestType)
	@log()
	async parseStackTrace({
		entityGuid,
		errorGroupGuid,
		stackTrace,
		occurrenceId,
	}: ParseStackTraceRequest): Promise<ParseStackTraceResponse | undefined> {
		const lines: string[] = typeof stackTrace === "string" ? stackTrace.split("\n") : stackTrace;
		const whole = lines.join("\n");

		// TODO: once we are fetching these stack traces from NR, or once we know the NR entity that was
		// associated with generating the stack trace and can thereby infer the language, we can probably
		// avoid having to determine the language

		// take an educated guess on the language, based on a simple search for file extension,
		// before attempting to parse according to the generating language
		let lang = this.guessStackTraceLanguage(lines);
		if (lang) {
			return StackTraceParsers[lang](whole);
		} else {
			try {
				const telemetry = Container.instance().telemetry;
				const parsed = parseId(errorGroupGuid || "");

				const properties: TelemetryData = {
					meta_data: `error_group_id: ${errorGroupGuid!}`,
					event_type: "response",
				};
				if (occurrenceId) {
					properties.meta_data_2 = `trace_id: ${occurrenceId}`;
				}
				if (entityGuid) {
					properties.entity_guid = entityGuid;
				}
				if (parsed?.accountId) {
					properties.account_id = parsed.accountId;
				}
				telemetry.track({
					eventName: "codestream/errors/error_parsing_stack_trace displayed",
					properties: properties,
				});
			} catch (ex) {
				// ignore
			}
			Logger.error(new Error("GuessStackLanguageFailed"), "language guess failed", {
				languageGuess: lang,
			});

			let info: ParseStackTraceResponse | undefined = undefined;

			for (lang in StackTraceParsers) {
				try {
					info = StackTraceParsers[lang](whole);
				} catch (error) {}
				if (info && info.lines?.length) {
					break;
				}
			}

			// take the last one
			const response = info;
			if (response && !response?.language) {
				// Only show this warning if language wasn't inferred from trying all
				// the StackTraceParsers
				response.warning = {
					message: "Unable to parse language from stack trace",
				};
			}
			return response;
		}
	}
	// parses the passed stack, tries to determine if any of the user's open repos match it, and if so,
	// given the commit hash of the code for which the stack trace was generated, tries to match each line
	// of the stack trace with a line in the user's repo, given that the user may be on a different commit
	@lspHandler(ResolveStackTraceRequestType)
	@log()
	async resolveStackTrace({
		entityGuid,
		errorGroupGuid,
		stackTrace,
		repoId,
		ref,
		occurrenceId,
		codeErrorId,
		stackSourceMap,
		domain,
	}: ResolveStackTraceRequest): Promise<ResolveStackTraceResponse> {
		const { git, repos } = SessionContainer.instance();
		const matchingRepo = await git.getRepositoryById(repoId);
		const matchingRepoPath = matchingRepo?.path;
		let firstWarning: WarningOrError | undefined = undefined;
		let resolvedRef: string | undefined = ref;
		let firstNotification: WarningOrError | undefined = undefined;

		// NOTE: the warnings should not prevent a stack trace from being displayed
		const setWarning = (warning: WarningOrError) => {
			// only set the warning if we haven't already set it.
			if (!firstWarning) firstWarning = warning;
		};

		const setNotification = (notification: WarningOrError) => {
			// only set the warning if we haven't already set it.
			if (!firstNotification) firstNotification = notification;
		};

		if (domain === "BROWSER" && isEmpty(stackSourceMap)) {
			setWarning({
				message: `[Upload a source map] so that an un-minified stack trace can be displayed.`,
				helpUrl: `https://docs.newrelic.com/docs/browser/browser-monitoring/browser-pro-features/upload-source-maps-un-minify-js-errors/`,
			});
		}

		if (!matchingRepoPath) {
			const repo = await repos.getById(repoId);
			setWarning({
				message: `Repo (${
					repo ? repo.name : repoId
				}) not found in your editor. Open it in order to navigate the stack trace.`,
			});
		}

		if (!ref) {
			setNotification({
				message: `[Associate a build sha or release tag with your errors] so that CodeStream can help make sure you’re looking at the right version of the code.`,
				helpUrl: CONFIGURE_ERROR_REF_HELP_URL,
			});
		} else if (matchingRepoPath) {
			try {
				const { git } = SessionContainer.instance();
				// ensure this sha is actually valid for this repo
				if (!(await git.isValidReference(matchingRepoPath, ref))) {
					// if not found, attempt to fetch all
					Logger.log(`NRManager ref (${ref}) not found. fetching...`);
					await git.fetchAllRemotes(matchingRepoPath);

					if (!(await git.isValidReference(matchingRepoPath, ref))) {
						// if still not there, we can't continue
						Logger.log(`NRManager ref (${ref}) not found after fetch`);
						setWarning({
							message: Strings.interpolate(MISSING_REF_MESSAGE, { ref: ref }),
							helpUrl: MISSING_REF_HELP_URL,
						});
						resolvedRef = undefined;
					}
				}
			} catch (ex) {
				Logger.warn("NRManager issue locating ref", {
					repoId: repoId,
					matchingRepo: matchingRepo,
					ref: ref,
				});
				setWarning({
					message: Strings.interpolate(MISSING_REF_MESSAGE, { ref: ref }),
					helpUrl: MISSING_REF_HELP_URL,
				});
				resolvedRef = undefined;
			}
		}

		const parsedStackInfo = await this.parseStackTrace({
			entityGuid,
			errorGroupGuid,
			stackTrace,
			occurrenceId,
		});
		if (!parsedStackInfo) {
			return { error: "Unable to parse stack trace" };
		}
		if (parsedStackInfo.parseError) {
			return { error: parsedStackInfo.parseError };
		} else if (ref && !parsedStackInfo.lines.find(line => !line.error)) {
			// if there was an error on all lines (for some reason)
			setWarning({
				message: Strings.interpolate(MISSING_REF_MESSAGE, { sha: ref }),
				helpUrl: MISSING_REF_HELP_URL,
			});
			resolvedRef = undefined;
		}
		if (parsedStackInfo.warning) {
			// if there was a warning parsing, use that first
			firstWarning = parsedStackInfo.warning;
		}
		parsedStackInfo.repoId = repoId;
		parsedStackInfo.sha = resolvedRef;
		parsedStackInfo.occurrenceId = occurrenceId;

		const stackTraceText = stackTrace ? stackTrace.join("\n") : "";
		parsedStackInfo.text = stackTraceText;

		const resolvedStackInfo: CSStackTraceInfo = {
			...parsedStackInfo,
			text: stackTraceText,
			lines: [],
		};

		if (parsedStackInfo.lines) {
			if (stackSourceMap?.stackTrace?.length > 0) {
				parsedStackInfo.lines.forEach(entry => {
					const matchingEntry = stackSourceMap.stackTrace.find((sourceMapEntry: SourceMapEntry) => {
						return sourceMapEntry.original.fileName === entry.fileFullPath;
					});

					if (matchingEntry && matchingEntry.mapped) {
						entry.fileFullPath = matchingEntry.mapped.fileName;
						entry.column = matchingEntry.mapped.columnNumber;
						entry.line = matchingEntry.mapped.lineNumber;
					}
				});
			}

			void this.resolveStackTraceLines(
				parsedStackInfo,
				resolvedStackInfo,
				matchingRepoPath,
				ref,
				occurrenceId,
				codeErrorId,
				parsedStackInfo.language
			);
		}

		return {
			warning: firstWarning,
			notification: firstNotification,
			resolvedStackInfo,
			parsedStackInfo,
		};
	}

	// Pre-filter out libraries so that IDE file looks can skip cruft
	private getFilteredStackTraceLines(
		parsedStackInfo: ParseStackTraceResponse,
		language?: string
	): (string | undefined)[] {
		const libraryMatcher = language ? libraryMatchers[language] : undefined;
		if (!libraryMatcher) {
			return parsedStackInfo.lines.map(_ => _.fileFullPath);
		}
		return parsedStackInfo.lines.map(_ => {
			if (_.fileFullPath && libraryMatcher(_.fileFullPath)) {
				return undefined;
			}
			return _.fileFullPath;
		});
	}

	private async resolveStackTraceLines(
		parsedStackInfo: ParseStackTraceResponse,
		resolvedStackInfo: CSStackTraceInfo,
		matchingRepoPath: string | undefined,
		ref: string,
		occurrenceId: string,
		codeErrorId: string,
		language?: string
	) {
		const { session, git } = SessionContainer.instance();

		const paths = this.getFilteredStackTraceLines(parsedStackInfo, language);
		const commitSha = matchingRepoPath && (await git.getCommit(matchingRepoPath, ref));
		const resolveStackTracePathsResponse = await session.agent.sendRequest(
			ResolveStackTracePathsRequestType,
			{ paths, language }
		);

		Logger.debug(
			`resolveStackTracePathsResponse" ${JSON.stringify(resolveStackTracePathsResponse)}`
		);

		for (let i = 0; i < parsedStackInfo.lines.length; i++) {
			try {
				const line = parsedStackInfo.lines[i];
				const resolvedLine = { ...line };
				resolvedStackInfo.lines.push(resolvedLine);
				line.fileRelativePath = resolvedLine.fileRelativePath;

				if (!line.error && matchingRepoPath && parsedStackInfo.language) {
					let resolvedLine: CSStackTraceLine;
					const resolvedPath = resolveStackTracePathsResponse.resolvedPaths[i];
					if (resolvedPath) {
						const pathExists = await this.resolvePathAtRef(resolvedPath, ref);
						if (pathExists) {
							resolvedLine = {
								fileFullPath: resolvedPath,
								fileRelativePath: path.relative(matchingRepoPath, resolvedPath),
								line: line.line,
								column: line.column,
								resolved: true,
								warning: commitSha ? undefined : "Missing sha",
							};
						} else {
							resolvedLine = {
								error: `Unable to find matching file in revision ${ref} for path ${line.fileFullPath}`,
								resolved: false,
							};
						}
					} else {
						resolvedLine = {
							error: `Unable to find matching file for path ${line.fileFullPath}`,
							resolved: false,
						};
					}

					if (resolvedLine.error) {
						Logger.log(`Stack trace line failed to resolve: ${resolvedLine.error}`);
					} else {
						const loggableLine = `${resolvedLine.fileRelativePath}:${resolvedLine.line}:${resolvedLine.column}`;
						Logger.log(`Stack trace line resolved: ${loggableLine}`);
					}

					session.agent.sendNotification(DidResolveStackTraceLineNotificationType, {
						occurrenceId,
						resolvedLine,
						index: i,
						codeErrorId,
					});
				}
			} catch (e) {
				Logger.warn("Error resolving stack trace line", { error: e });
			}
		}
	}

	@lspHandler(ResolveStackTracePositionRequestType)
	@log()
	async resolveStackTracePosition({
		ref,
		repoId,
		fileRelativePath,
		line,
		column,
	}: ResolveStackTracePositionRequest): Promise<ResolveStackTracePositionResponse> {
		const { git } = SessionContainer.instance();

		const matchingRepo = await git.getRepositoryById(repoId);
		const repoPath = matchingRepo?.path;
		if (!repoPath) {
			return { error: "Unable to find repo " + repoId };
		}

		const fullPath = path.join(repoPath, fileRelativePath);
		let normalizedPath = Strings.normalizePath(fullPath, isWindows, {
			addLeadingSlash: isWindows && !fullPath.startsWith("\\\\"),
		});
		if (isWindows) {
			normalizedPath = normalizedPath.replace(":", "%3A");
		}
		const uri = "file://" + normalizedPath;

		if (!ref) {
			return {
				path: uri,
				line: line,
				column: column,
			};
		}
		return {
			line,
			column,
			path: uri,
		};
	}

	@lspHandler(FindCandidateMainFilesRequestType)
	@log()
	async findCandidateMainFiles({
		type,
		path,
	}: FindCandidateMainFilesRequest): Promise<FindCandidateMainFilesResponse> {
		switch (type) {
			case RepoProjectType.NodeJS:
				return this._nodeJS.findCandidateMainFiles(path);
			default:
				return { error: "unknown type: " + type, files: [] };
		}
	}

	@lspHandler(InstallNewRelicRequestType)
	@log()
	async installNewRelic({ type, cwd }: InstallNewRelicRequest): Promise<InstallNewRelicResponse> {
		let response;
		switch (type) {
			case RepoProjectType.NodeJS:
				response = await this._nodeJS.installNewRelic(cwd);
				break;
			case RepoProjectType.Java:
				response = await this._java.installNewRelic(cwd);
				break;
			case RepoProjectType.DotNetCore:
				response = await this._dotNetCore.installNewRelic(cwd);
				break;
			case RepoProjectType.DotNetFramework:
				return { error: "not implemented. type: " + type };

			default:
				return { error: "unknown type: " + type };
		}
		if (response.error) {
			Logger.warn(response.error);
		}
		return response;
	}

	@lspHandler(CreateNewRelicConfigFileRequestType)
	@log()
	async createNewRelicConfigFile({
		type,
		filePath,
		repoPath,
		licenseKey,
		appName,
	}: CreateNewRelicConfigFileRequest): Promise<CreateNewRelicConfigFileResponse> {
		let response;
		switch (type) {
			case RepoProjectType.NodeJS:
				response = await this._nodeJS.createNewRelicConfigFile(filePath, licenseKey, appName);
				break;
			case RepoProjectType.Java:
				response = await this._java.createNewRelicConfigFile(filePath, licenseKey, appName);
				break;
			case RepoProjectType.DotNetCore:
				response = await this._dotNetCore.createNewRelicConfigFile(
					repoPath!,
					filePath,
					licenseKey,
					appName
				);
				break;
			case RepoProjectType.DotNetFramework:
				return { error: "not implemented. type: " + type };

			default:
				return { error: "unknown type: " + type };
		}
		if (response.error) {
			Logger.warn(response.error);
		}
		return response;
	}

	@lspHandler(AddNewRelicIncludeRequestType)
	@log()
	async addNewRelicInclude({
		type,
		file,
		dir,
	}: AddNewRelicIncludeRequest): Promise<AddNewRelicIncludeResponse> {
		let response;
		switch (type) {
			case RepoProjectType.NodeJS:
				response = await this._nodeJS.addNewRelicInclude(file, dir);
				break;
			default:
				return { error: "unknown type: " + type };
		}
		if (response.error) {
			Logger.warn(response.error);
		}
		return response;
	}

	@lspHandler(GetRepoFileFromAbsolutePathRequestType)
	@log()
	async getRepoFileFromAbsolutePath(
		request: GetRepoFileFromAbsolutePathRequest
	): Promise<GetRepoFileFromAbsolutePathResponse> {
		const { git } = SessionContainer.instance();

		const matchingRepo = await git.getRepositoryById(request.repo.id);
		const matchingRepoPath = matchingRepo?.path;
		const fileSearchResponse =
			matchingRepoPath &&
			(await SessionContainer.instance().session.onFileSearch(
				matchingRepoPath,
				request.absoluteFilePath
			));
		const bestPath =
			fileSearchResponse &&
			NRManager.getBestMatchingPath(request.absoluteFilePath, fileSearchResponse.files);
		if (!bestPath) {
			return { error: `Unable to find matching file for path ${request.absoluteFilePath}` };
		}

		return {
			uri: bestPath,
		};
	}

	static getBestMatchingPath(pathSuffix: string, allFilePaths: string[]) {
		if (!pathSuffix) return undefined;

		// normalize the file paths
		const pathSuffixParts = pathSuffix.replace(/\\/g, "/").split("/").slice().reverse();
		let bestMatchingFilePath = undefined;
		let bestMatchingScore = -1;
		let bestMatchingDepth = 0;

		for (const filePath of allFilePaths) {
			// normalize the file paths
			const filePathParts = filePath.replace(/\\/g, "/").split("/").slice().reverse();

			let partialMatch = false;
			for (let i = 0; i < pathSuffixParts.length; i++) {
				if (pathSuffixParts[i] === filePathParts[i]) {
					partialMatch = true;
				}
				if (pathSuffixParts[i] !== filePathParts[i] || i === pathSuffixParts.length - 1) {
					if (
						partialMatch &&
						(i > bestMatchingScore ||
							(i === bestMatchingDepth && filePathParts.length < bestMatchingDepth))
					) {
						bestMatchingScore = i;
						bestMatchingFilePath = filePath;
						bestMatchingDepth = filePathParts.length;
					}
					break;
				}
			}
		}
		return bestMatchingFilePath;
	}

	private async resolveStackTraceLine(
		line: CSStackTraceLine,
		ref: string,
		matchingRepoPath: string,
		language: string
	): Promise<CSStackTraceLine> {
		const fileFullPath = line.fileFullPath;
		if (!fileFullPath) {
			return { error: `Unable to find file path for line` };
		}
		const isLibrary = libraryMatchers[language]?.(fileFullPath);
		if (isLibrary) {
			return { warning: `Line is a library path ${fileFullPath}` };
		}
		const fileSearchResponse = await SessionContainer.instance().session.onFileSearch(
			matchingRepoPath,
			fileFullPath
		);
		const bestMatchingFilePath = NRManager.getBestMatchingPath(
			fileFullPath,
			fileSearchResponse.files
		);
		if (!bestMatchingFilePath) {
			return { error: `Unable to find matching file for path ${fileFullPath}` };
		}

		if (!ref) {
			return {
				warning: "Missing sha",
				fileFullPath: bestMatchingFilePath,
				fileRelativePath: path.relative(matchingRepoPath, bestMatchingFilePath),
				line: line.line || 0,
				column: line.column || 0,
				resolved: true,
			};
		}

		return {
			fileFullPath: bestMatchingFilePath,
			fileRelativePath: path.relative(matchingRepoPath, bestMatchingFilePath),
			line: line.line,
			column: line.column,
			resolved: true,
		};
	}

	private guessStackTraceLanguage(stackTrace: string[]) {
		const langsRepresented: { [key: string]: number } = {};
		let mostRepresented = "";
		stackTrace.forEach(line => {
			const extRe = new RegExp(
				`[\\/\\\\|\\t].+\.(${Object.keys(ExtensionToLanguageMap).join("|")})[^a-zA-Z0-9]`
			);
			const match = line.match(extRe);
			if (match && match[1]) {
				const lang = match[1];
				langsRepresented[lang] = langsRepresented[lang] || 0;
				langsRepresented[lang]++;
				if (langsRepresented[lang] > (langsRepresented[mostRepresented] || 0)) {
					mostRepresented = lang;
				}
			}
		});
		return mostRepresented ? ExtensionToLanguageMap[mostRepresented] : null;
	}

	private async getCurrentStackTracePosition(
		ref: string,
		filePath: string,
		line: number,
		column: number
	) {
		const { git } = SessionContainer.instance();
		const { documents } = Container.instance();

		const diffToHead = await git.getDiffBetweenCommits(ref, "HEAD", filePath, true);

		if (!diffToHead) return { error: `Unable to calculate diff from ${ref} to HEAD` };

		const currentCommitLocation = await calculateLocation(
			{
				id: "nrError",
				lineStart: line,
				colStart: column,
				lineEnd: line,
				colEnd: MAX_RANGE_VALUE,
			},
			diffToHead
		);

		const currentCommitText = await git.getFileContentForRevision(filePath, "HEAD");
		if (!currentCommitText) return { error: `Unable to read current HEAD contents of ${filePath}` };

		const doc = documents.get("file://" + filePath);
		let currentBufferText = doc && doc.getText();
		if (currentBufferText == null) {
			currentBufferText = await xfs.readText(filePath);
		}
		if (!currentBufferText) {
			return { error: `Unable to read current buffer contents of ${filePath}` };
		}

		const diffToCurrentContents = structuredPatch(
			filePath,
			filePath,
			Strings.normalizeFileContents(currentCommitText),
			Strings.normalizeFileContents(currentBufferText),
			"",
			""
		);

		const currentBufferLocation = await calculateLocation(
			currentCommitLocation,
			diffToCurrentContents
		);

		return {
			line: currentBufferLocation.lineStart,
			column: currentBufferLocation.colStart,
		};
	}
}
