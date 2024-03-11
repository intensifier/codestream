param([string] $checkoutDir = $pwd, [string] $assetEnv = "", [string] $buildNumber = $env:build_number)

Write-Host '**** The script is running in directory' (Get-Location)

$codestreamVsDir = $checkoutDir + '\vs'
$buildDir = $checkoutDir + '\vs\build'
$x64AssetDir = $buildDir + '\artifacts\Release\x64'

Write-Host '**** changing to buildDir' $buildDir
cd $buildDir
Write-Host '**** Working directory is' (Get-Location)

Import-Module -Name $buildDir\modules.ps1
Import-Module -Name $buildDir\Modules\Vsix.ps1
Import-Module -Name $buildDir\Modules\Versioning.ps1

$codeVer = Read-Version
Write-Host '***** codeVer: ' $codeVer
#$assetVer = $codeVer.ToString() + '+' + $buildNumber
$assetVer = $codeVer.ToString()
Write-Host '***** asset version: ' $assetVer
$assetsBaseName = 'codestream-vs-' + $assetVer

$commitIds = @{}
cd $codestreamVsDir
$commitIds.codestream_vs = git rev-parse HEAD

$assetInfo = @{}
$assetInfo.assetEnvironment = $assetEnv
$assetInfo.version = $codeVer.ToString()
$assetInfo.buildNumber = $buildNumber
$assetInfo.repoCommitId = $commitIds

Write-Host '********** Creating x64 Info File'
$assetInfo.name = "codestream-vs-22"
$x64InfoFileName = $x64AssetDir + '\' + $assetsBaseName + '.info'
$assetInfo | ConvertTo-Json | Out-File $x64InfoFileName

$x64AssetName = $assetsBaseName + '-x64.vsix'

Write-Host '********** Renaming vsix to ' $x64AssetName
cd $x64AssetDir
mv codestream-vs-22.vsix $x64AssetName
