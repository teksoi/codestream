param([string] $checkoutDir = $pwd, [string] $assetEnv = "", [string] $buildNumber = $env:build_number)

Write-Host '**** The script is running in directory' (Get-Location)

$codestreamVsDir = $checkoutDir + '\vs-codestream'
$codestreamComponentsDir = $checkoutDir + '\codestream-components'
$codestreamLspAgentDir = $checkoutDir + '\codestream-lsp-agent'
$buildDir = $checkoutDir + '\vs-codestream\build'
$assetDir = $buildDir + '\artifacts\x86\Release'

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
cd $codestreamComponentsDir
$commitIds.codestream_components = git rev-parse HEAD
cd $codestreamLspAgentDir
$commitIds.codestream_lsp_agent = git rev-parse HEAD

$assetInfo = @{}
$assetInfo.assetEnvironment = $assetEnv
$assetInfo.name = "codestream-vs"
$assetInfo.version = $codeVer.ToString()
$assetInfo.buildNumber = $buildNumber
$assetInfo.repoCommitId = $commitIds
$infoFileName = $assetDir + '\' + $assetsBaseName + '.info'
Write-Host '********** Creating ' $infoFileName
$assetInfo | ConvertTo-Json | Out-File $infoFileName

$newAssetName = $assetsBaseName + '.vsix'
Write-Host '********** Renaming vsix to ' $newAssetName
cd $assetDir
mv codestream-vs.vsix $newAssetName
