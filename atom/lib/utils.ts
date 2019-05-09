import { TraceLevel } from "@codestream/protocols/agent";
import { EditorSelection } from "@codestream/protocols/webview";
import { Disposable, Point, Range, TextEditor } from "atom";
import { Convert } from "atom-languageclient";
import * as fs from "fs-plus";
import * as path from "path";
import { Range as LSRange } from "vscode-languageserver-types";
import { Container } from "workspace/container";

export function doTimes(count: number, fn: (i: number) => void) {
	for (let i = 0; i < count; i++) {
		fn(i + 1);
	}
}

export const accessSafely = <T>(f: () => T): T | void => {
	try {
		return f();
	} catch (e) {
		return undefined;
	}
};

function getPackage() {
	return atom.packages.getLoadedPackage("codestream")!;
}

export const asAbsolutePath = (relativePath: string) => {
	const packagePath = atom.packages.resolvePackagePath("codestream");
	if (!packagePath) throw new Error("Atom could not find path for CodeStream package");

	return path.join(packagePath, relativePath);
};

export const getPluginVersion = () => {
	return (getPackage() as any).metadata.version;
};

export const getDevPath = () => {
	const distPath = path.dirname((getPackage() as any).mainModulePath);
	return path.resolve(distPath, "..");
};

export const getAgentSource = () => {
	return path.resolve(getDevPath(), "../codestream-lsp-agent/dist/agent.js");
};

export namespace Debug {
	export function isDebugging() {
		return atom.inDevMode() && Container.configs.get("traceLevel") === TraceLevel.Debug;
	}

	export function isSilent() {
		return Container.configs.get("traceLevel") === TraceLevel.Silent;
	}
}

export namespace Editor {
	export async function open(filePath: string, force = false) {
		return new Promise<TextEditor | undefined>(resolve => {
			fs.exists(filePath, async exists => {
				if (exists || force) {
					resolve(atom.workspace.open(filePath) as Promise<TextEditor | undefined>);
				} else resolve();
			});
		});
	}

	export interface ScrollOptions {
		center?: boolean;
	}

	export function scrollTo(editor: TextEditor, bufferRow: number, options: ScrollOptions = {}) {
		editor.scrollToBufferPosition(new Point(bufferRow, 0), options);

		const lastVisibleRow = editor.getLastVisibleScreenRow();
		const firstVisibleRow = editor.getFirstVisibleScreenRow();
		const middleRow = (lastVisibleRow - firstVisibleRow) / 2;
		const rangeRow = editor.screenRowForBufferRow(bufferRow);

		// if desired row is below center
		if (rangeRow > middleRow) {
			// if there are more enough rows below to make the desired row the middle
			if (rangeRow - middleRow + lastVisibleRow < editor.getLastScreenRow()) {
				editor.setFirstVisibleScreenRow(middleRow);
			}
		}
	}

	export async function selectRange(editor: TextEditor, range: Range) {
		editor.setSelectedBufferRange(range);
	}

	export function getRelativePath(editor: TextEditor) {
		const filePath = editor.getPath();
		if (filePath === undefined) return "";
		return atom.project.relativize(filePath);
	}

	export function getUri(editor: TextEditor) {
		const path = editor.getPath();
		if (path) {
			return Convert.pathToUri(path);
		}
		return "";
	}

	export function getCurrentSelectionRange(editor: TextEditor) {
		const selection = editor.getSelectedBufferRange();
		const range = Convert.atomRangeToLSRange(selection);
		if (selection.isEmpty()) {
			return LSRange.create(
				range.start.line,
				0,
				range.start.line,
				editor.lineTextForBufferRow(selection.end.row).length
			);
		}
		return range;
	}

	export function getCSSelections(editor: TextEditor): EditorSelection[] {
		return editor.getSelections().map(s => {
			const cursor = editor.getCursorBufferPosition();
			const { start, end } = Convert.atomRangeToLSRange(s.getBufferRange());
			return {
				cursor: { line: cursor.row, character: cursor.column },
				start,
				end,
			};
		});
	}

	export function getVisibleRanges(editor: TextEditor): LSRange[] {
		const visibleRanges: LSRange[] = [];
		const lastVisibleRow = editor.getLastVisibleScreenRow();
		let currentRangeStart = editor.getFirstVisibleScreenRow();

		for (let line = currentRangeStart; line <= lastVisibleRow; line++) {
			if (line === lastVisibleRow) {
				visibleRanges.push(
					LSRange.create(
						editor.bufferRowForScreenRow(currentRangeStart),
						0,
						editor.bufferRowForScreenRow(line),
						editor.getApproximateLongestScreenRow()
					)
				);
				break;
			}

			if (editor.isFoldedAtScreenRow(line)) {
				visibleRanges.push(
					LSRange.create(
						editor.bufferRowForScreenRow(currentRangeStart),
						0,
						editor.bufferRowForScreenRow(line),
						editor.getApproximateLongestScreenRow()
					)
				);
				currentRangeStart = line + 1;
			}
		}
		return visibleRanges;
	}
}

interface CancelableFunction {
	(...args: any[]): any;
	cancel(): void;
}

export function throttle<F extends (...args: any[]) => any>(fn: F, time = 500): CancelableFunction {
	let requestId: any | undefined;
	let lastArgs: any[] = [];

	const throttledFn = function(...args: any[]) {
		lastArgs = args;
		if (requestId) {
			// console.warn(`throttling a call to ${fn}. new args are`, args);
			return;
		}
		requestId = setTimeout(() => {
			requestId = undefined;
			fn(...lastArgs);
		}, time);
	};

	throttledFn.cancel = () => {
		if (requestId) clearTimeout(requestId);
	};

	return throttledFn;
}

export interface Listener<T> {
	(value: T): void;
}

export class Echo<T> implements Disposable {
	private listeners = new Set<Listener<T>>();

	add(listener: (value: T) => void) {
		this.listeners.add(listener);
		return new Disposable(() => {
			this.listeners.delete(listener);
		});
	}

	push(value: T) {
		this.listeners.forEach(listener => listener(value));
	}

	dispose() {
		this.listeners.clear();
	}
}
