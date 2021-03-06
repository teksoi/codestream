﻿using System;
using System.Collections.Generic;
using System.Linq;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI;
using CodeStream.VisualStudio.Core.UI.Extensions;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;

namespace CodeStream.VisualStudio.UI {
	public class DocumentMarkerManager : IDisposable {
		private readonly ICodeStreamAgentService _agentService;
		private readonly IWpfTextView _wpfTextView;
		private readonly ITextDocument _textDocument;
		bool _disposed = false;
		private DocumentMarkersResponse _markers;

		private static readonly ILogger Log = LogManager.ForContext<DocumentMarkerManager>();

		public DocumentMarkerManager(ICodeStreamAgentService agentService, IWpfTextView wpfTextView, ITextDocument textDocument) {
			_agentService = agentService;
			_wpfTextView = wpfTextView;
			_textDocument = textDocument;
		}

		/// <summary>
		/// Synchronously tries to populate the marker collection, returns true if there was a change in marker count and the callee should update
		/// </summary>
		/// <param name="forceUpdate">When set to true, ignores if the collection is empty</param>
		/// <returns></returns>
		public bool TrySetMarkers(bool forceUpdate = false) {
			bool result = false;
			ThreadHelper.JoinableTaskFactory.Run(async delegate {
				result = await TrySetMarkersAsync(forceUpdate);
			});
			return result;
		}

		/// <summary>
		/// Asynchronously tries to populate the marker collection, returns true if there was a change in marker count and the callee should update
		/// </summary>
		/// <param name="forceUpdate">When set to true, ignores if the collection is empty</param>
		/// <returns></returns>
		public async System.Threading.Tasks.Task<bool> TrySetMarkersAsync(bool forceUpdate = false) {
			Uri fileUri = null;
			bool result = false;
			try {
				if (_markers != null && _markers.Markers.AnySafe() == false && !forceUpdate) {
					Log.Verbose($"Codemarks are empty and forceUpdate={forceUpdate}", forceUpdate);
					return false;
				}

				fileUri = _textDocument.FilePath.ToUri();
				if (fileUri == null) {
					Log.Verbose($"Could not parse file path as uri={_textDocument.FilePath}");
					return false;
				}

				_markers = await _agentService.GetMarkersForDocumentAsync(fileUri, true);
				bool? previousResult = null;
				if (_markers?.Markers.AnySafe() == true || forceUpdate) {
					if (_wpfTextView.Properties.TryGetProperty(PropertyNames
						.DocumentMarkers, out List<DocumentMarker> previousMarkersResponse)) {
						previousResult = previousMarkersResponse.AnySafe();
					}
					_wpfTextView.Properties.RemovePropertySafe(PropertyNames.DocumentMarkers);
					_wpfTextView.Properties.AddProperty(PropertyNames.DocumentMarkers, _markers?.Markers);
					Log.Verbose($"Setting Markers({_markers?.Markers.Count}) for {fileUri}");

					var current = _markers?.Markers.Any() == true;
					if (previousResult == true && current == false) {
						result = true;
					}
					else if (current) {
						result = true;
					}
				}
				else {
					Log.Verbose("No Codemarks from agent");
				}
				if (_markers?.MarkersNotLocated?.AnySafe() == true) {
					Log.Verbose($"There are {_markers?.MarkersNotLocated.Count()} markers not located");
				}
			}
			catch (OverflowException ex) {
				Log.Error(ex, fileUri?.ToString());
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(TrySetMarkersAsync));
			}

			return result;
		}

		public void Reset() {
			_markers = null;
		}

		public bool HasMarkers() => _markers?.Markers.AnySafe() == true;

		public bool IsInitialized() => _markers != null;

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed)
				return;

			if (disposing) {
				if (_wpfTextView?.Properties.ContainsProperty(PropertyNames.DocumentMarkers) == true) {
					_wpfTextView.Properties.RemoveProperty(PropertyNames.DocumentMarkers);
				}

				_markers = null;
			}

			_disposed = true;
		}
	}
}
