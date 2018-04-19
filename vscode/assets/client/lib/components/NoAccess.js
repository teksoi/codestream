import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

const NoAccess = ({ reason }, context) => {
	const moreInfo = (
		<a
			onClick={e =>
				context.platform.openInBrowser("https://help.codestream.com/hc/en-us/articles/360001530571")
			}
		>
			More info.
		</a>
	);
	return (
		<div id="no-access">
			<h2>
				<FormattedMessage id="noGit.header" defaultMessage="Git Issue" />
			</h2>
			{reason.noUrl && (
				<h5>
					<FormattedMessage
						id="noAccess.noUrl"
						defaultMessage="Make sure that you have a remote URL configured for this repository."
					/>{" "}
					{moreInfo}
				</h5>
			)}
			{reason.noAccess && (
				<h5>
					<FormattedMessage
						id="noAccess.access"
						defaultMessage="To access the chat history for this repo on CodeStream, the first commit hash must match that of the remote that is connected to CodeStream."
					/>{" "}
					{moreInfo}
				</h5>
			)}
			{reason.noGit && (
				<h5>
					<FormattedMessage
						id="noAccess.git"
						defaultMessage="CodeStream is unable to locate the git command. Please ensure git is in your PATH."
					/>{" "}
					{moreInfo}
				</h5>
			)}
		</div>
	);
};

NoAccess.contextTypes = {
	platform: PropTypes.object
};

export default NoAccess;
