﻿using System;

namespace CodeStream.VisualStudio.Core {
	public static class Guids {
		// Window Ids
		public static Guid WebViewToolWindowGuid = new Guid(WebViewToolWindowId);
		public const string WebViewToolWindowId = "882ebf5e-eccc-49c1-a303-b113742c8bf5";

		public static Guid LoggingOutputPaneGuid = new Guid("3B309838-5429-44DE-A4ED-51D2F88A3554");

		// Packages
		public const string CodeStreamSettingsPackageId = "dd6d0f58-10a8-4838-85b2-40b57f9cdf58";
		public const string CodeStreamWebViewPackageId = "2e5983fb-7dbc-458e-b8f1-8561684049d0";
		public const string ProtocolPackagePackageId = "70D71868-7765-468B-BC83-CB1E672E223C";

		// Others
		public const string LanguageClientId = "4d480d5e-ab28-4e9c-b0be-32cd08f3b8ea";
	}
}
