import PropTypes from "prop-types";
import React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import Button from "./onboarding/Button";
import { cancelSlackInfo as cancel } from "../actions/context";
import { getPath } from "../network-request";

const SlackSetup = (props, context) => (
	<div id="slack-info">
		<h2>
			<FormattedMessage id="slackInfo.header" defaultMessage="Slack Integration" />
		</h2>
		<p>
			<FormattedMessage id="slackInfo.p1" />
		</p>
		<p>
			<FormattedMessage id="slackInfo.p2" />
		</p>
		<Button
			onClick={e => {
				context.platform.openInBrowser(
					getPath(`/no-auth/slack/addtoslack?codestream_team=${props.teamId}`)
				);
				props.cancel();
			}}
		>
			Add to Slack
		</Button>
		<small className="centered">
			<a onClick={e => props.cancel()}>Cancel</a>
		</small>
	</div>
);

SlackSetup.contextTypes = {
	platform: PropTypes.object
};

const mapStateToProps = ({ context }) => ({ teamId: context.currentTeamId });
export default connect(mapStateToProps, { cancel })(SlackSetup);
