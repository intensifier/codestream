"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/parsers/remoteParser.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
import * as childProcess from "child_process";

import { Logger } from "../../logger";
import { GitRemote, GitRemoteType } from "../models/remote";

const emptyStr = "";

const remoteRegex = /^(\S+)\s+(\S+)\s+\((\w+)\)$/;

const urlRegex =
	/^(?:(git:\/\/)(.*?)(?::.*?)?\/|(https?:\/\/)(?:.*?@)?(.*?)(?::.*?)?\/|git@(.*):|(ssh:\/\/)(?:.*@)?(.*?)(?::.*?)?(?:\/|(?=~))|(?:.*?@)(.*?):)(.*)$/;
const hostnameRegex = new RegExp("hostname (.*)");

export type GitRemotes = {
	type: "ssh" | "https" | "git";
	value: string;
};

export class GitRemoteParser {
	static async parse(data: string, repoPath: string): Promise<GitRemote[]> {
		if (!data) return [];

		const remotes: GitRemote[] = [];
		const groups = Object.create(null);

		const lines = data.trim().split("\n");

		for (const line of lines) {
			const match = line.match(remoteRegex);
			if (match) {
				// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
				const url = ` ${match[2]}`.substr(1);

				const [scheme, domain, path] = await this.parseGitUrl(url);

				const uniqueness = `${domain}/${path}`;
				let remote = groups[uniqueness];
				if (remote === undefined) {
					remote = new GitRemote(
						repoPath,
						// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
						` ${match[1]}`.substr(1),
						url,
						scheme,
						domain,
						path,
						// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
						[{ url: url, type: ` ${match[3]}`.substr(1) as GitRemoteType }]
					);
					remotes.push(remote);
					groups[uniqueness] = remote;
				} else {
					// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
					remote.types.push({ url: url, type: ` ${match[3]}`.substr(1) as GitRemoteType });
				}
			} else {
				Logger.warn("No match found for:", line);
			}
		}

		if (!remotes.length) {
			return [];
		}

		return remotes;
	}

	private static getHostFromMatch(match: RegExpExecArray) {
		return match[2] || match[4] || match[5] || match[7] || match[8];
	}

	private static matchToTuple(
		match: RegExpExecArray,
		host?: string | undefined
	): [string, string, string] {
		return [
			match[1] || match[3] || match[6],
			host || GitRemoteParser.getHostFromMatch(match),
			// remove any starting slashes for odd remotes that look like
			// git@github.com:/TeamCodeStream/codestream.git
			match[9].replace(/^\/+/g, emptyStr).replace(/\.git\/?$/, emptyStr),
		];
	}

	/**
	 *  Returns the https and ssh variants for a git remote
	 *
	 * @static
	 * @param {string} httpOrSshEndpoint
	 * @return {*}  {(Promise<GitRemotes[]>)}
	 * @memberof GitRemoteParser
	 */
	static async getRepoRemoteVariants(httpOrSshEndpoint: string): Promise<GitRemotes[]> {
		const results: GitRemotes[] = [];
		if (!httpOrSshEndpoint) return results;

		httpOrSshEndpoint = httpOrSshEndpoint.replace("ssh://", "");

		let parsed;
		try {
			parsed = await GitRemoteParser.parseGitUrl(httpOrSshEndpoint);
		} catch (ex) {}
		if (parsed) {
			if (httpOrSshEndpoint.indexOf("git") === 0) {
				results.push({ type: "ssh", value: httpOrSshEndpoint });
				results.push({ type: "ssh", value: `ssh://${httpOrSshEndpoint}` });
				results.push({ type: "https", value: `https://${parsed[1]}/${parsed[2]}.git` });
				results.push({ type: "https", value: `https://${parsed[1]}/${parsed[2]}` });
				// support for github.repositoryUrl context https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
				results.push({ type: "git", value: `git://${parsed[1]}/${parsed[2]}.git` });
				results.push({ type: "git", value: `git@${parsed[1]}:${parsed[2]}.git` });
				results.push({ type: "git", value: `git@${parsed[1]}:${parsed[2]}` });
			} else if (httpOrSshEndpoint.indexOf("http") === 0) {
				results.push({ type: "https", value: httpOrSshEndpoint });
				if (httpOrSshEndpoint.indexOf(".git") > -1) {
					results.push({ type: "https", value: httpOrSshEndpoint.replace(".git", "") });
				}
				// Account for .git-less http remotes, as remotes that come from NR can sometimes not have .git
				// https://github.com/TeamCodeStream/telco-microservices -> https://github.com/TeamCodeStream/telco-microservices.git
				if (httpOrSshEndpoint.indexOf(".git") === -1) {
					results.push({ type: "https", value: httpOrSshEndpoint + ".git" });
				}
				// support for github.repositoryUrl context https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
				results.push({ type: "git", value: `git://${parsed[1]}/${parsed[2]}.git` });
				results.push({ type: "ssh", value: `git@${parsed[1]}:${parsed[2]}.git` });
				results.push({ type: "ssh", value: `ssh://git@${parsed[1]}/${parsed[2]}.git` });
			}
		} else {
			results.push({
				type: httpOrSshEndpoint.indexOf("http") === 0 ? "https" : "ssh",
				value: httpOrSshEndpoint,
			});
		}

		return results;
	}

	static async parseGitUrl(url: string): Promise<[string, string, string]> {
		let match = urlRegex.exec(url);
		if (match == null && url && url.indexOf(":") > -1 && url.indexOf("@") === -1) {
			// couldn't find a match so this could be a completely aliased remote like
			// `foo:TeamCodeStream/codestream.git` (without a scheme/prefix)
			url = `git@${url}`;
			match = urlRegex.exec(url);
		}
		if (match == null) return [emptyStr, emptyStr, emptyStr];

		// if this isn't ssh, just return normal, if it is, use the ssh alias finder below
		if (url.indexOf("git@") === -1) return GitRemoteParser.matchToTuple(match);

		const host = GitRemoteParser.getHostFromMatch(match);
		return new Promise(resolve => {
			try {
				// if this is an ssh setup, it's possible that a user has an alias setup.
				// we can get the alias for this by running the `ssh -G <remoteAlias>`` command
				// and parsing to get the `hostname` value
				// if, for some reason this fails, fall back to doing the old (current) logic

				// use -T to prevent `Pseudo-terminal will not be allocated because stdin is not a terminal`
				childProcess.execFile(
					"ssh",
					["-T", "-G", host],
					function (err: any, stdout: any, stderr: any) {
						try {
							if (!stdout) {
								Logger.warn(`remoteParser: parseGitUrl err=${err} stderr=${stderr}`);
								resolve(GitRemoteParser.matchToTuple(match!));
							} else {
								const hostnameMatch = hostnameRegex.exec(stdout);
								// passing undefined into the child process will result in "undefined" as a string for the hostname
								if (hostnameMatch && hostnameMatch[1] && hostnameMatch[1] !== "undefined") {
									resolve(GitRemoteParser.matchToTuple(match!, hostnameMatch[1]));
								} else {
									resolve(GitRemoteParser.matchToTuple(match!));
								}
							}
						} catch (ex) {
							Logger.warn(`remoteParser: parseGitUrl ex=${ex}`);
							resolve(GitRemoteParser.matchToTuple(match!));
						}
					}
				);
			} catch (ex) {
				Logger.warn(`remoteParser: parseGitUrl execFile ex=${ex}`);
				resolve(GitRemoteParser.matchToTuple(match!));
			}
		});
	}
}
