﻿using System;
using System.Linq;
using System.Threading;
using System.Windows.Threading;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Controllers;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.LanguageServer;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.WindowsAPICodePack.Dialogs;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio {
	public class WebViewRouter {
		private static readonly ILogger Log = LogManager.ForContext<WebViewRouter>();

		private readonly IComponentModel _componentModel;
		private readonly IWebviewUserSettingsService _webviewUserSettingsService;
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamAgentService _codeStreamAgent;
		private readonly ISettingsManager _settingsManager;
		private readonly IEventAggregator _eventAggregator;
		private readonly IBrowserService _browserService;
		private readonly IIdeService _ideService;
		private readonly IEditorService _editorService;
		private readonly IAuthenticationServiceFactory _authenticationServiceFactory;

		public WebViewRouter(
			IComponentModel componentModel,
			IWebviewUserSettingsService webviewUserSettingsService,
			ISessionService sessionService,
			ICodeStreamAgentService codeStreamAgent,
			ISettingsServiceFactory settingsServiceFactory,
			IEventAggregator eventAggregator,
			IBrowserService browserService,
			IIdeService ideService,
			IEditorService editorService,
			IAuthenticationServiceFactory authenticationServiceFactory) {
			_componentModel = componentModel;
			_webviewUserSettingsService = webviewUserSettingsService;
			_sessionService = sessionService;
			_codeStreamAgent = codeStreamAgent;
			_settingsManager = settingsServiceFactory.Create();
			_eventAggregator = eventAggregator;
			_browserService = browserService;
			_ideService = ideService;
			_editorService = editorService;
			_authenticationServiceFactory = authenticationServiceFactory;
		}

		//
		//
		//TODO use DI in the ctor rather than inline Package/ServiceLocator pattern?
		//
		//

		public async System.Threading.Tasks.Task HandleAsync(WindowEventArgs e) {
			try {
				//guard against possibly non JSON-like data
				if (e?.Message == null || !e.Message.StartsWith("{")) {
					Log.Debug($"{nameof(HandleAsync)} not found => {e?.Message}");
					await System.Threading.Tasks.Task.CompletedTask;
					return;
				}

				var message = WebviewIpcMessage.Parse(e.Message);

				using (IpcLogger.CriticalOperation(Log, "REC", message)) {
					var target = message.Target();
					switch (target) {
						case IpcRoutes.Agent: {
								using (var scope = _browserService.CreateScope(message)) {
									JToken @params = null;
									string error = null;
									try {
										@params = await _codeStreamAgent.SendAsync<JToken>(message.Method, message.Params);
									}
									catch (Exception ex) {
										Log.Warning(ex, $"Method={message.Method}");
										error = ex.Message;
									}
									finally {
										scope.FulfillRequest(@params, error);
									}
								}
								break;
							}
						case IpcRoutes.Host: {
								switch (message.Method) {
									case ShellPromptFolderRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												ShellPromptFolderResponse response = null;
												string error = null;
												try {
													await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
													var request = message.Params.ToObject<ShellPromptFolderRequest>();
													var dialog = _ideService.FolderPrompt(request?.Message);

													if (dialog.ShowDialog() == CommonFileDialogResult.Ok) {
														if (!dialog.FileName.IsNullOrWhiteSpace()) {
															response = new ShellPromptFolderResponse {
																Path = dialog.FileName
															};
														}
													}
												}
												catch (Exception ex) {
													Log.Warning(ex, $"Method={message.Method}");
													error = ex.Message;
												}
												finally {
													scope.FulfillRequest((response ?? new ShellPromptFolderResponse()).ToJToken(), error);
												}
											}

											break;
										}
									case WebviewDidInitializeNotificationType.MethodName: {
											// webview is ready!
											_sessionService.WebViewDidInitialize = true;
											_eventAggregator.Publish(new WebviewDidInitializeEvent());

											Log.Debug(nameof(_sessionService.WebViewDidInitialize));
											break;
										}
									case WebviewDidChangeContextNotificationType.MethodName: {
											var @params = message.Params.ToObject<WebviewDidChangeContextNotification>();
											if (@params != null) {
												var panelStack = @params.Context?.PanelStack;
												_sessionService.PanelStack = panelStack;
												if (panelStack != null) {
													var visible = panelStack.FirstOrDefault() == WebviewPanels.CodemarksForFile;
													_sessionService.IsCodemarksForFileVisible = visible;
													_sessionService.AreMarkerGlyphsVisible = !visible;

													_eventAggregator.Publish(new MarkerGlyphVisibilityEvent { IsVisible = !visible });
												}
												_webviewUserSettingsService.SaveContext(_sessionService.SolutionName, @params.Context);
											}
											break;
										}
									case CompareMarkerRequestType.MethodName: {
											using (_browserService.CreateScope(message)) {
												try {
													var marker = message.Params["marker"].ToObject<CsMarker>();
													var documentFromMarker = await _codeStreamAgent.GetDocumentFromMarkerAsync(
															new DocumentFromMarkerRequest(marker));

													var fileUri = documentFromMarker.TextDocument.Uri.ToUri();
													var filePath = fileUri.ToLocalPath();

													await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
													var wpfTextView = await _ideService.OpenEditorAtLineAsync(fileUri, documentFromMarker.Range, true);
													if (wpfTextView != null) {
														var document = wpfTextView.GetDocument();
														if (document != null) {
															var text = wpfTextView.TextBuffer.CurrentSnapshot.GetText();
															var span = wpfTextView.ToSpan(documentFromMarker.Range);
															if (span.HasValue) {
																if (document?.IsDirty == true) {
																	var tempFile1 = _ideService.CreateTempFile(filePath, text);
																	var tempFile2 = _ideService.CreateTempFile(filePath, text);
																	_ideService.CompareFiles(tempFile1, tempFile2, wpfTextView.TextBuffer, span.Value,
																		documentFromMarker.Marker.Code, isFile1Temp: true, isFile2Temp: true);
																}
																else {
																	var tempFile2 = _ideService.CreateTempFile(filePath, text);
																	_ideService.CompareFiles(filePath, tempFile2, wpfTextView.TextBuffer, span.Value,
																		documentFromMarker.Marker.Code, isFile1Temp: false, isFile2Temp: true);
																}
															}
														}
													}
												}
												catch (Exception ex) {
													Log.Error(ex, nameof(CompareMarkerRequestType.MethodName));
												}
											}
											break;
										}
									case ApplyMarkerRequestType.MethodName: {
											using (_browserService.CreateScope(message)) {
												try {
													var marker = message.Params["marker"].ToObject<CsMarker>();
													var documentFromMarker = await _codeStreamAgent.GetDocumentFromMarkerAsync(new DocumentFromMarkerRequest(marker));
													var filePath = documentFromMarker.TextDocument.Uri;
													var fileUri = filePath.ToUri();

													await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
													var wpfTextView = await _ideService.OpenEditorAtLineAsync(fileUri, documentFromMarker.Range, true);

													if (wpfTextView != null) {
														var span = wpfTextView.ToSpan(documentFromMarker.Range);
														if (span.HasValue) {
															wpfTextView.TextBuffer.Replace(span.Value, documentFromMarker.Marker.Code);
														}
													}
												}
												catch (Exception ex) {
													Log.Error(ex, nameof(ApplyMarkerRequestType.MethodName));
												}
											}
											break;
										}
									case BootstrapInHostRequestType.MethodName: {
											try {
												string errorResponse = null;
												JToken @params = null;

												using (var scope = _browserService.CreateScope(message)) {
													try {
														@params = await _codeStreamAgent.GetBootstrapAsync(_settingsManager.GetSettings(), _sessionService.State, _sessionService.IsReady);
													}
													catch (Exception ex) {
														Log.Debug(ex, nameof(BootstrapInHostRequestType));
														errorResponse = ex.Message;
													}
													finally {
														scope.FulfillRequest(@params, errorResponse);
													}
												}
											}
											catch (Exception ex) {
												Log.Error(ex, nameof(BootstrapInHostRequestType));
											}
											break;
										}
									case LogoutRequestType.MethodName: {
											await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
											using (_browserService.CreateScope(message)) {
												if (_authenticationServiceFactory != null) {
													var authenticationService = _authenticationServiceFactory.Create();
													if (authenticationService != null) {
														var logoutRequest = message.Params.ToObject<LogoutRequest>();
														var reason = logoutRequest != null && logoutRequest.Reason == LogoutReason1.Reauthenticating ?
															SessionSignedOutReason.ReAuthenticating
															: SessionSignedOutReason.UserSignedOutFromWebview;

														await authenticationService.LogoutAsync(reason);
													}
												}
											}
											break;
										}
									case GetActiveEditorContextRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												scope.FulfillRequest(new GetActiveEditorContextResponse(_editorService.GetEditorContext()).ToJToken());
											}
											break;
										}
									case EditorSelectRangeRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												bool result = false;
												try {
													var @params = message.Params.ToObject<EditorSelectRangeRequest>();
													if (@params != null) {
														var uri = @params.Uri.ToUri();
														await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
														var editorResponse = await _ideService.OpenEditorAtLineAsync(uri, @params.Selection.ToRange(), true);
														if (editorResponse != null) {
															result = new ActiveTextEditor(editorResponse, uri.ToLocalPath(), uri, editorResponse.TextSnapshot?.LineCount)
															  .SelectRange(@params.Selection, @params.PreserveFocus == false);
															if (!result) {
																Log.Warning($"SelectRange result is false");
															}
														}
													}
												}
												catch (Exception ex) {
													Log.Warning(ex, nameof(EditorSelectRangeRequestType.MethodName));
												}
												scope.FulfillRequest(new EditorSelectRangeResponse { Success = result }.ToJToken());
												break;
											}
										}
									case EditorHighlightRangeRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												bool result = false;
												var @params = message.Params.ToObject<EditorHighlightRangeRequest>();
												if (@params != null) {
													var activeTextView = _editorService.GetActiveTextEditor(@params.Uri.ToUri());
													if (activeTextView != null) {
														await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
														//don't reveal on highlight -- for big ranges it will cause bad behavior with the scrolling
														result = activeTextView.Highlight(@params.Range, @params.Highlight);
														if (!result) {
															Log.Verbose($"{nameof(EditorHighlightRangeRequestType)} result is false");
														}
													}
												}
												scope.FulfillRequest(new EditorHighlightRangeResponse { Success = result }.ToJToken());
												break;
											}
										}
									case EditorRevealRangeRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												OpenEditorResult openEditorResult = null;
												await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
												var @params = message.Params.ToObject<EditorRevealRangeRequest>();
												if (@params != null) {
													openEditorResult = await _ideService.OpenEditorAndRevealAsync(@params.Uri.ToUri(), @params.Range?.Start?.Line, atTop: @params.AtTop, focus: @params.PreserveFocus == false);
													if (openEditorResult?.Success != true) {
														Log.Verbose($"{nameof(EditorRevealRangeRequestType)} result is false");
													}
												}
												scope.FulfillRequest(new EditorRevealRangeResponse { Success = openEditorResult?.Success == true }.ToJToken());
											}
											break;
										}
									case EditorScrollToNotificationType.MethodName: {
											var @params = message.Params.ToObject<EditorScrollToNotification>();
#pragma warning disable VSTHRD001
											System.Windows.Application.Current.Dispatcher.Invoke(() => {
												try {
													_ideService.ScrollEditor(@params.Uri.ToUri(), @params.Position.Line, @params.DeltaPixels, @params.AtTop);
												}
												catch (Exception ex) {
													Log.Warning(ex, nameof(EditorRevealRangeRequestType));
												}
											}, DispatcherPriority.Input);
#pragma warning restore VSTHRD001
											break;
										}
									case InsertTextRequestType.MethodName: {
											using (var scope = _browserService.CreateScope(message)) {
												IWpfTextView openEditorResult = null;
												await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
												try {
													var @params = message.Params.ToObject<InsertTextRequest>();
													if (@params != null) {
														var documentFromMarker = await _codeStreamAgent.GetDocumentFromMarkerAsync(new DocumentFromMarkerRequest(@params.Marker));
														if (documentFromMarker != null) {
															openEditorResult = await _ideService.OpenEditorAtLineAsync(documentFromMarker.TextDocument.Uri.ToUri(), documentFromMarker.Range, true);
															if (openEditorResult == null) {
																Log.Debug($"{nameof(InsertTextRequestType)} could not open editor");
															}
															else {
																var span = openEditorResult.ToStartLineSpan(documentFromMarker.Range.Start.Line);
																if (span != null) {
																	using (var edit = openEditorResult.TextBuffer.CreateEdit()) {
																		edit.Insert(span.Value.Start, @params.Text);
																		edit.Apply();
																	}
																}
																else {
																	Log.Debug($"Could not locate Span. Range={documentFromMarker.Range}");
																}
															}
														}
													}
												}
												catch (Exception ex) {
													Log.Warning(ex, nameof(InsertTextRequestType));
												}
												finally {
													scope.FulfillRequest(new { }.ToJToken());
												}
											}
											break;
										}
									case ReloadRequestType.MethodName: {
											var languageServerClientManager = _componentModel.GetService<ILanguageServerClientManager>();
											if (languageServerClientManager != null) {
												_browserService.SetIsReloading();
												await languageServerClientManager.RestartAsync();
											}
											break;
										}
									case ReloadWebviewRequestType.MethodName: {
											using (_browserService.CreateScope(message)) {
												_webviewUserSettingsService.TryClearContext(_sessionService.SolutionName, _sessionService.TeamId);
												_browserService.ReloadWebView();
											}
											break;
										}
									case UpdateConfigurationRequestType.MethodName: {
											await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

											using (_browserService.CreateScope(message)) {
												// NOTE: we're not using the controller here. changing these properties
												// triggers the OnPropertyChanged, which then uses the ConfigurationController
												// for added handling

												// Webview no longer sends these updates -- keeping for reference
#if DEBUG
												Log.LocalWarning(message.ToJson());
#endif
												//using (var scope = SettingsScope.Create(_settingsManager))
												//{
												//    var @params = message.Params.ToObject<UpdateConfigurationRequest>();
												//    if (@params.Name == "showMarkerGlyphs")
												//    {
												//        scope.SettingsService.ShowMarkerGlyphs = @params.Value.AsBool();
												//    }
												//}
											}
											break;
										}
									case UpdateServerUrlRequestType.MethodName: {
											await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
											using (var scope = _browserService.CreateScope(message)) {
												try {
													var @params = message.Params.ToObject<UpdateServerUrlRequest>();
													using (var settingsScope = SettingsScope.Create(_settingsManager, true)) {
														settingsScope.SettingsManager.ServerUrl = @params.ServerUrl;
														settingsScope.SettingsManager.DisableStrictSSL = @params.DisableStrictSSL ?? false;
													}

													await _codeStreamAgent.SetServerUrlAsync(@params.ServerUrl, @params.DisableStrictSSL);
												}
												catch (Exception ex) {
													Log.Error(ex, nameof(UpdateServerUrlRequestType));
												}
												scope.FulfillRequest(new UpdateServerUrlResponse().ToJToken());
											}
											break;
										}
									case LiveShareStartSessionRequestType.MethodName:
									case LiveShareInviteToSessionRequestType.MethodName:
									case LiveShareJoinSessionRequestType.MethodName: {
											var liveShareController = new LiveShareController(
												_sessionService,
												_codeStreamAgent,
												_eventAggregator,
												_browserService,
												_ideService);

											using (_browserService.CreateScope(message)) {
												switch (message.Method) {
													case LiveShareStartSessionRequestType.MethodName: {
															var @params = message.Params.ToObject<LiveShareStartSessionRequest>();
															await liveShareController.StartAsync(@params.StreamId, @params.ThreadId);
															break;
														}
													case LiveShareInviteToSessionRequestType.MethodName: {
															await liveShareController.InviteAsync(message.Params.ToObject<LiveShareInviteToSessionRequest>()?.UserId);
															break;
														}
													case LiveShareJoinSessionRequestType.MethodName: {
															await liveShareController.JoinAsync(message.Params.ToObject<LiveShareJoinSessionRequest>()?.Url);
															break;
														}
													default: {
															Log.Warning($"Unknown LiveShare method {message.Method}");
															break;
														}
												}
											}
											break;
										}
									case OpenUrlRequestType.MethodName: {
											var @params = message.Params.ToObject<OpenUrlRequest>();
											using (var scope = _browserService.CreateScope(message)) {
												if (@params != null) {
													_ideService.Navigate(@params.Url);
												}
												scope.FulfillRequest();
											}
											break;
										}
									default: {
											Log.Warning($"Unhandled Target={target} Method={message.Method}");
											break;
										}
								}
								break;
							}
						default: {
								Log.Warning($"Unknown Target={target}");
								break;
							}
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, "Message={Message}", e?.Message);
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}
	}
}
