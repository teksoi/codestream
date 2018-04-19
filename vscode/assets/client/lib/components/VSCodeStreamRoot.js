import "@babel/polyfill";
import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Raven from "raven-js";
// import NoGit from "./NoGit";
// import TooMuchGit from "./TooMuchGit";
// import Onboarding from "./onboarding/Onboarding";
import Stream from "./Stream";
// import NoAccess from "./NoAccess";
import OfflineBanner from "./OfflineBanner";
// import SlackInfo from "./SlackInfo";

const Loading = props => (
	<div className="loading-page">
		<span className="loading loading-spinner-large inline-block" />
		<p>{props.message}</p>
	</div>
);

class CodeStreamRoot extends Component {
	static defaultProps = {
		repositories: []
	};

	static childContextTypes = {
		platform: PropTypes.object,
		repositories: PropTypes.array
	};

	constructor(props) {
		super(props);
		this.state = {};
	}

	getChildContext() {
		return {
			platform: this.props.platform,
			repositories: this.props.repositories
		};
	}

	componentDidCatch(error, info) {
		this.setState({ hasError: true });
		// Raven.captureException(error, { extra: info });
	}

	render() {
		const {
			catchingUp,
			accessToken,
			bootstrapped,
			repositories,
			onboarding,
			noAccess,
			showSlackInfo
		} = this.props;

		if (this.state.hasError)
			return (
				<div id="oops">
					<p>An unexpected error has occurred and we've been notified.</p>
					<p>
						Please run the `Codestream: Logout` command from the command palette and{" "}
						<a onClick={this.props.platform.reload}>reload</a> atom.
					</p>
					<p>
						Sorry for the inconvenience. If the problem persists, please{" "}
						<a onClick={() => this.props.platform.openInBrowser("https://help.codestream.com")}>
							contact support
						</a>.
					</p>
				</div>
			);
		if (!bootstrapped) return <Loading message="CodeStream engage..." />;
		else return <Stream />;
	}
}

const mapStateToProps = ({ bootstrapped, session, onboarding, context, messaging }) => ({
	accessToken: session.accessToken,
	noAccess: context.noAccess,
	catchingUp: messaging.catchingUp,
	showSlackInfo: context.showSlackInfo,
	bootstrapped,
	onboarding
});
export default connect(mapStateToProps)(CodeStreamRoot);
