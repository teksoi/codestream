﻿using CodeStream.VisualStudio.Commands;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.Vssdk.Commands;
using CodeStream.VisualStudio.UI.Settings;
using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Serilog;
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using CodeStream.VisualStudio.UI;

namespace CodeStream.VisualStudio.Packages {


	/// <summary>
	/// Pseudo-package to allow for a custom service provider
	/// </summary>
	[ProvideService(typeof(SOptionsDialogPageAccessor))]
	[ProvideService(typeof(SToolWindowProvider))]
	[ProvideMenuResource("Menus.ctmenu", 1)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[Guid(PackageGuids.guidCodeStreamPackageString)]
	// ReSharper disable once RedundantExtendsListEntry
	public sealed class ServiceProviderPackage : AsyncPackage, IServiceContainer, IToolWindowProvider, SToolWindowProvider {
		private static readonly ILogger Log = LogManager.ForContext<ServiceProviderPackage>();

		private IOptionsDialogPage OptionsDialogPage;
		private IComponentModel _componentModel;
		private ISessionService _sessionService;
		private ISettingsManager _settingsManager;
		private List<IDisposable> _disposables;
		private List<VsCommandBase> _commands;

		protected override async System.Threading.Tasks.Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			try {
				await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

				AsyncPackageHelper.InitializePackage(GetType().Name);

				// can only get a dialog page from a package
				OptionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));

				((IServiceContainer)this).AddService(typeof(SOptionsDialogPageAccessor), CreateService, true);
				((IServiceContainer)this).AddService(typeof(SToolWindowProvider), CreateService, true);

				await base.InitializeAsync(cancellationToken, progress);

				_componentModel = GetGlobalService(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(_componentModel);
				_sessionService = _componentModel.GetService<ISessionService>();
				var settingsServiceFactory = _componentModel?.GetService<ISettingsServiceFactory>();
				_settingsManager = settingsServiceFactory.Create();
				Assumes.Present(_settingsManager);

				await JoinableTaskFactory.RunAsync(VsTaskRunContext.UIThreadNormalPriority, InitializeCommandsAsync);
				Log.Debug($"{nameof(InitializeAsync)} completed");
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(InitializeAsync));
			}
		}

		private async Task InitializeCommandsAsync() {
			try {
				var userCommand = new UserCommand(_sessionService, _settingsManager);

				_commands = new List<VsCommandBase> {
#if DEBUG
					new WebViewDevToolsCommand(),
#endif
					new AddCodemarkCommentCommand(PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet),
					new AddCodemarkIssueCommand(PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet),					
					new AddCodemarkPermalinkCommand(PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet),
					new AddCodemarkPermalinkInstantCommand(PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet),

					new AddCodemarkCommentCommand(PackageGuids.guidWebViewPackageShortcutCmdSet),
					new AddCodemarkIssueCommand(PackageGuids.guidWebViewPackageShortcutCmdSet),					
					new AddCodemarkPermalinkCommand(PackageGuids.guidWebViewPackageShortcutCmdSet),
					new AddCodemarkPermalinkInstantCommand(PackageGuids.guidWebViewPackageShortcutCmdSet),

					new WebViewReloadCommand(),
					new WebViewToggleCommand(),
					new AuthenticationCommand(_componentModel),
					userCommand
				};
				await JoinableTaskFactory.SwitchToMainThreadAsync();
				await InfoBarProvider.InitializeAsync(this);

				var menuCommandService = (IMenuCommandService)(await GetServiceAsync(typeof(IMenuCommandService)));
				foreach (var command in _commands) {
					menuCommandService.AddCommand(command);
				}
				await BookmarkShortcutRegistration.InitializeAllAsync(this);

				var eventAggregator = _componentModel.GetService<IEventAggregator>();
				_disposables = new List<IDisposable> {
					//when a user has logged in/out we alter the text of some of the commands
					eventAggregator?.GetEvent<SessionReadyEvent>()
					.ObserveOnApplicationDispatcher()
					.Subscribe(_ => {
							userCommand.Update();
					}),
					eventAggregator?.GetEvent<SessionLogoutEvent>()
					.ObserveOnApplicationDispatcher()
					.Subscribe(_ => {
							userCommand.Update();
					}),
					eventAggregator?.GetEvent<LanguageServerDisconnectedEvent>()
					.ObserveOnApplicationDispatcher()
					.Subscribe(_ => {
							userCommand.Update();
					}),

					//eventAggregator?.GetEvent<SessionDidStartSignInEvent>().Subscribe(_ => {
					//	ThreadHelper.JoinableTaskFactory.Run(async delegate {
					//		await JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					//	userCommand.Update();
					//	});
					//}),
					//eventAggregator?.GetEvent<SessionDidFailSignInEvent>().Subscribe(_ => {
					//	ThreadHelper.JoinableTaskFactory.Run(async delegate {
					//		await JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					//	userCommand.Update();
					//	});
					//}),
					//eventAggregator?.GetEvent<SessionDidStartSignOutEvent>().Subscribe(_ => {
					//	ThreadHelper.JoinableTaskFactory.Run(async delegate {
					//		await JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					//		userCommand.Update();
					//	});
					//})
				};
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(InitializeCommandsAsync));
			}
		}

		private object CreateService(IServiceContainer container, Type serviceType) {
			if (typeof(SOptionsDialogPageAccessor) == serviceType)
				return new OptionsDialogPageAccessor(OptionsDialogPage);
			if (typeof(SToolWindowProvider) == serviceType)
				return this;

			return null;
		}

		private static bool TryGetWindowFrame(Guid toolWindowId, out IVsWindowFrame frame) {
			ThreadHelper.ThrowIfNotOnUIThread();

			var shell = GetGlobalService(typeof(SVsUIShell)) as IVsUIShell;
			if (shell == null || ErrorHandler.Failed(shell.FindToolWindow((uint)__VSCREATETOOLWIN.CTW_fForceCreate, ref toolWindowId, out frame))) {
				frame = null;
				return false;
			}

			return true;
		}

		/// <summary>
		/// Returns true if the ToolWindow is visible
		/// </summary>
		/// <param name="toolWindowId"></param>
		/// <returns>true if visible</returns>
		/// <remarks>
		/// IVsWindowFrame.IsOnScreen checks to see if a window hosted by the Visual Studio IDE has 
		/// been autohidden, or if the window is part of a tabbed display and currently obscured by 
		/// another tab. IsOnScreen also checks to see whether the instance of the Visual Studio IDE 
		/// is minimized or obscured. IsOnScreen differs from the behavior of IsWindowVisible a 
		/// method that may return true even if the window is completely obscured or minimized. 
		/// IsOnScreen also differs from IsVisible which does not check to see if the Visual Studio 
		/// IDE has autohidden the window, or if the window is tabbed and currently obscured by 
		/// another window.
		/// </remarks>
		public bool IsVisible(Guid toolWindowId) {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (!TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame)) {
				return false;
			}

			if (frame.IsOnScreen(out int pfOnScreen) == VSConstants.S_OK) {
				return pfOnScreen == 1;
			}

			return false;
		}

		public bool ShowToolWindowSafe(Guid toolWindowId) {
			try {
				ThreadHelper.ThrowIfNotOnUIThread();

				if (!TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame)) return false;

				frame.Show();				
				return true;
			}
			catch (Exception) {
				//suffer
			}

			return false;
		}

		public bool? ToggleToolWindowVisibility(Guid toolWindowId) {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame)) {
				if (frame.IsVisible() == VSConstants.S_OK) {
					frame.Hide();
					return false;
				}
				else {
					frame.Show();
					return true;
				}
			}

			return null;
		}

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					_disposables.DisposeAll();
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(Dispose));
				}
			}

			base.Dispose(isDisposing);
		}
	}
}
