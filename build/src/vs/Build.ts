import { execFileSync, execSync } from "child_process";
import fs from "fs";
import { archiveFolder } from "../lib/Archive";
import * as consoul from "../lib/Consoul";
import * as teamCity from "../lib/TeamCity";

export default function (vsRootPath: string) {
	const msbuild =
		"C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe";
	const xunit = "C:\\.nuget\\xunit.runner.console\\2.7.0\\tools\\net472\\xunit.console.exe";
	const artifactsPath = `${vsRootPath}\\artifacts\\`;

	if (teamCity.isCI()) {
		try {
			execSync("npm run build:ci", { stdio: "inherit", cwd: `${vsRootPath}` });

			execFileSync(
				msbuild,
				[
					`CodeStream.VisualStudio.sln`,
					"/t:restore,rebuild",
					"/p:Configuration=Debug",
					"/verbosity:quiet",
					"/p:Platform=x64",
					"/p:DeployExtension=False"
				],
				{ stdio: "inherit", cwd: `${vsRootPath}\\src\\` }
			);

			execSync(`dotnet tool restore --ignore-failed-sources`, {
				cwd: `${vsRootPath}\\src`,
				stdio: "inherit"
			});

			execSync(
				`dotnet coverlet "CodeStream.VisualStudio.UnitTests.dll" --target "${xunit}" --targetargs "CodeStream.VisualStudio.UnitTests.dll" --exclude-by-file "**/Annotations/Annotations.cs" --format cobertura`,
				{
					cwd: `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x64\\Debug`,
					stdio: "inherit"
				}
			);

			execSync(
				`dotnet reportgenerator "-reports:coverage.cobertura.xml" "-targetdir:coveragereport" "-reporttypes:Html;TeamCitySummary"`,
				{
					cwd: `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x64\\Debug`,
					stdio: "inherit"
				}
			);

			if (!fs.existsSync(artifactsPath)) {
				fs.mkdirSync(artifactsPath, { recursive: true });
			}

			try {
				archiveFolder(
					`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x64\\Debug\\coveragereport`,
					`${artifactsPath}\\coveragereport.zip`
				);
			} catch (err) {
				consoul.warn("Unable to archive CoverageReport data -- allowing process to continue");
				consoul.warn(`${err}`);
			}

			fs.copyFileSync(
				`${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x64\\bin\\x64\\Debug\\codestream-vs-22.vsix`,
				`${artifactsPath}\\codestream-vs-22.vsix`
			);
		} catch (error) {
			console.error("Error executing command:", error);
			process.exit(1);
		}
	}

	if (teamCity.isPI()) {
		try {
			execSync("npm run bundle", { stdio: "inherit", cwd: `${vsRootPath}` });

			execFileSync(
				msbuild,
				[
					`CodeStream.VisualStudio.sln`,
					"/t:restore,rebuild",
					"/p:Configuration=Release",
					"/verbosity:quiet",
					"/p:Platform=x64",
					"/p:DeployExtension=False"
				],
				{ stdio: "inherit", cwd: `${vsRootPath}\\src\\` }
			);

			execSync(`${xunit} CodeStream.VisualStudio.UnitTests.dll`, {
				stdio: "inherit",
				cwd: `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x64\\Release`
			});

			if (!fs.existsSync(artifactsPath)) {
				fs.mkdirSync(artifactsPath, { recursive: true });
			}

			fs.copyFileSync(
				`${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x64\\bin\\x64\\Release\\codestream-vs-22.vsix`,
				`${artifactsPath}\\codestream-vs-22.vsix`
			);
		} catch (error) {
			console.error("Error executing command:", error);
			process.exit(1);
		}
	}
}
