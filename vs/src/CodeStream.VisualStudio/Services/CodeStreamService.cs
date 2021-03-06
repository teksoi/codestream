﻿using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Managers;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Threading;
using CodeStream.VisualStudio.Core.UI.Extensions;
using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(ICodeStreamService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class CodeStreamService : ICodeStreamService {
		private static readonly ILogger Log = LogManager.ForContext<CodeStreamService>();

		[Import]
		public ISessionService SessionService { get; set; }

		public IBrowserService BrowserService { get; set; }

		[ImportingConstructor]
		public CodeStreamService(IBrowserServiceFactory browserServiceFactory) {
			try {
				BrowserService = browserServiceFactory.Create();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CodeStreamService));
			}
		}

		public bool IsReady => SessionService?.IsReady == true;

		public async Task ChangeActiveEditorAsync(Uri uri, ActiveTextEditor activeTextEditor) {
			if (IsReady) {
				try {
					var componentModel = Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);

					var editorService = componentModel.GetService<IEditorService>();
					var editorState = editorService.GetEditorState(activeTextEditor.WpfTextView);
					var fileName = uri.ToFileName() ?? uri.AbsolutePath;
					_ = BrowserService.NotifyAsync(new HostDidChangeActiveEditorNotificationType {
						Params = new HostDidChangeActiveEditorNotification {
							Editor = new HostDidChangeActiveEditorNotificationEditor(fileName,
							uri,
							editorState.ToEditorSelectionsSafe(),
							activeTextEditor?.WpfTextView.ToVisibleRangesSafe(),
							activeTextEditor?.TotalLines) {
								Metrics = ThemeManager.CreateEditorMetrics(activeTextEditor?.WpfTextView),
								LanguageId = null
							}
						}
					});
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(ChangeActiveEditorAsync)} Uri={uri}");
				}
			}

			await Task.CompletedTask;
		}

		public async Task ChangeActiveEditorAsync(Uri uri) {
			if (IsReady) {
				try {
					var componentModel = Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);

					var editorService = componentModel.GetService<IEditorService>();
					await ChangeActiveEditorAsync(uri, editorService.GetActiveTextEditor(uri));
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(ChangeActiveEditorAsync)} Uri={uri}");
				}
			}

			await Task.CompletedTask;
		}

		public async Task ChangeCaretAsync(Uri uri, List<Range> visibleRange, int cursorLine, int lineCount) {
			if (IsReady) {
				try {
					// changing the cursor in vscode creates an editorselection with a range that has a start/end line that are equal
					// to the position of the cursor -- emulate that here.
					var editorSelection = new List<EditorSelection>() {
						new EditorSelection(new Position(cursorLine, 0), new Range() {
							Start = new Position(cursorLine, 0), End = new Position(cursorLine, 0) })
					};
					_ = BrowserService.NotifyAsync(new HostDidChangeEditorSelectionNotificationType {
						Params = new HostDidChangeEditorSelectionNotification(uri, editorSelection, visibleRange, lineCount)
					});
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(ChangeActiveEditorAsync)} Uri={uri}");
				}
			}

			await Task.CompletedTask;
		}

		public Task ResetActiveEditorAsync() {
			if (!IsReady) return Task.CompletedTask;

			try {
				_ = BrowserService.NotifyAsync(new HostDidChangeActiveEditorNotificationType {
					Params = new HostDidChangeActiveEditorNotificationBase()
				});
			}
			catch (Exception ex) {
				Log.Error(ex, $"{nameof(ChangeActiveEditorAsync)}");
			}
			return Task.CompletedTask;
		}

		public Task OpenCommentByThreadAsync(string streamId, string threadId, string codemarkId = null) {
			if (!IsReady) return Task.CompletedTask;

			try {
				_ = BrowserService.NotifyAsync(new ShowStreamNotificationType {
					Params = new ShowStreamNotification {
						StreamId = streamId,
						ThreadId = threadId,
						CodemarkId = codemarkId
					}
				});
			}
			catch (Exception ex) {
				Log.Error(ex, $"{nameof(OpenCommentByThreadAsync)} StreamId={streamId} ThreadId={threadId}");
			}

			return Task.CompletedTask;
		}

		public async Task ShowCodemarkAsync(string codemarkId, string filePath, CancellationToken? cancellationToken = null) {
			if (IsReady && !codemarkId.IsNullOrWhiteSpace()) {
				_ = BrowserService.NotifyAsync(new ShowCodemarkNotificationType {
					Params = new ShowCodemarkNotification {
						CodemarkId = codemarkId,						
						SourceUri = filePath != null ? Core.LanguageServer.Extensions.ToLspUriString(filePath) : null,
					}
				});
			}
			await Task.CompletedTask;
		}

		public Task EditorSelectionChangedNotificationAsync(Uri uri, EditorState editorState,
			List<Range> visibleRanges, int? totalLines, CodemarkType codemarkType, CancellationToken? cancellationToken = null) {
			if (!IsReady) return Task.CompletedTask;

			try {
				_ = BrowserService.NotifyAsync(new HostDidChangeEditorSelectionNotificationType {
					Params = new HostDidChangeEditorSelectionNotification(uri, editorState.ToEditorSelectionsSafe(), visibleRanges, totalLines)
				});
			}
			catch (Exception ex) {
				Log.Error(ex, $"{nameof(EditorSelectionChangedNotificationAsync)} Uri={uri}");
			}

			return Task.CompletedTask;
		}

		public async Task NewCodemarkAsync(Uri uri, Range range, CodemarkType codemarkType, string source, CancellationToken? cancellationToken = null) {
			if (IsReady) {
				try {
					_ = BrowserService.NotifyAsync(new NewCodemarkNotificationType {
						Params = new NewCodemarkNotification(uri, range, codemarkType, source)
					});
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(NewCodemarkAsync)} Uri={uri}");
				}
			}

			await Task.CompletedTask;
		}
	}
}
