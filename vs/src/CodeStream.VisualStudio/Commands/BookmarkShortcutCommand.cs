﻿using System;
using System.ComponentModel.Design;
using System.Threading;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;

namespace CodeStream.VisualStudio.Commands {
	public class BookmarkShortcutCommand {
		private static readonly ILogger Log = LogManager.ForContext<BookmarkShortcutCommand>();

		/// <summary>
		/// The 1-9 digit
		/// </summary>
		public int Index { get; }

		/// <summary>
		/// the commandId from the VSCT file
		/// </summary>
		public int CommandId { get; set; }		 

		internal BookmarkShortcutCommand(OleMenuCommandService commandService, int index, int commandId) {
			commandService = commandService ?? throw new ArgumentNullException(nameof(commandService));
			
			Index = index;

			commandService.AddCommand(new OleMenuCommand((sender, args) => {
				InvokeHandler(sender, new BookmarkShortcutEventArgs(args, index));
			}, new CommandID(PackageGuids.guidWebViewPackageCmdSet, commandId)));
		}

		public void Invoke() {
			InvokeHandler(this, new BookmarkShortcutEventArgs(null, Index));
		}

		private void InvokeHandler(object sender, BookmarkShortcutEventArgs args) {
			if (args == null || args.Index < 1) return;

			try {
				var codeStreamAgentService = (Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel)?.GetService<ICodeStreamAgentService>();
				_ = codeStreamAgentService?.TrackAsync(TelemetryEventNames.CodemarkClicked, new TelemetryProperties { { "Codemark Location", "Shortcut" } });

				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					try {
						var response = await codeStreamAgentService.GetDocumentFromKeyBindingAsync(args.Index);
						if (response == null) {
							Log.Debug($"{nameof(BookmarkShortcutCommand)} No codemark for {args.Index}");
							return;
						}

						await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);

						var ideService = (Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel)?.GetService<IIdeService>();

						var editorResponse = await ideService.OpenEditorAtLineAsync(response.TextDocument.Uri.ToUri(), response.Range, forceOpen: true);
						if (editorResponse == null) {
							Log.Error($"failed to open editor {@response}");
						}
						Log.Debug($"Handled {nameof(BookmarkShortcutCommand)} for {args.Index}");
					}
					catch (Exception ex) {
						Log.Error(ex, nameof(InvokeHandler));
					}

				});
			}
			catch(Exception ex) {
				Log.Error(ex, nameof(InvokeHandler));
			}
		}

		class BookmarkShortcutEventArgs : EventArgs {
			public int Index { get; }
			public EventArgs OriginalEventArgs { get; }

			public BookmarkShortcutEventArgs(EventArgs ea, int i) {
				OriginalEventArgs = ea;
				Index = i;
			}
		}
	}
}
