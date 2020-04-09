import React from "react";
import styled from "styled-components";
import Icon from "./Icon";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { CodeStreamState } from "../store";
import { Dispatch } from "../store/common";
import { setUserPreference } from "./actions";
import Tooltip from "./Tooltip";
import { ComposeArea } from "./ReviewNav";
import { CSMe } from "@codestream/protocols/api";
import { openPanel } from "../store/context/actions";
import { WebviewPanels } from "@codestream/protocols/webview";
import { isConnected } from "../store/providers/reducer";

const Step = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	cursor: pointer;
	margin: 0 -10px;
	padding: 10px 15px 10px 10px;
	border-radius: 30px;
	padding: 10px;
	border-radius: 0;
	border: 1px solid transparent;
	&:hover {
		// background: var(--app-background-color-hover);
		border: 1px solid var(--base-border-color);
		.icon {
			top: -5px;
			right: 0px;
			position: absolute;
			display: block !important;
			transform: scale(0.7);
		}
	}
	.icon {
		display: none !important;
	}
	a {
		display: block;
		flex-shrink: 0;
		margin-left: auto;
	}
`;

const StepNumber = styled.div`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	border-radius: 5px;
	margin: 0 10px 0 0;
	font-weight: bold;

	background: var(--button-background-color);
	color: var(--button-foreground-color);
`;

const StepNumberDone = styled(StepNumber)`
	.vscode-dark& {
		background: rgba(127, 127, 127, 0.4);
	}
	background: rgba(127, 127, 127, 0.2);
`;
const StepText = styled.div`
	margin-right: 10px;
`;

const StepTitle = styled.span`
	font-weight: bold;
	color: var(--text-color-highlight);
`;

const YouTubeImg = styled.img`
	height: 22px;
	cursor: pointer;
	opacity: 0.8;
	vertical-align: -2px;
	&:hover {
		opacity: 1;
		text-shadow: 0 5px 10px rgba(0, 0, 0, 0.8);
	}
`;

const StepSubtext = styled.span``;

const Status = styled.div`
	margin: 20px 0;
`;

const StatusCount = styled.span`
	font-size: larger;
	color: var(--text-color-highlight);
`;

const Root = styled.div`
	position: fixed;
	width: 100%;
	max-height: 100%;
	overflow: auto;
	padding: 30px 20px;
	padding: 40px;
	z-index: 0;
	color: var(--text-color-subtle);
	font-size: var(--font-size);
	b,
	h2 {
		color: var(--text-color-highlight);
	}

	@media only screen and (max-width: 350px) {
		padding: 20px;
	}
`;

const HR = styled.div`
	width: 100%;
	height: 1px;
	border-bottom: 1px solid var(--base-border-color);
	margin: 10px 0;
`;

const STEPS = [
	{
		id: "createCodemark",
		title: "Comment on code",
		subtext: "in the left margin, or select code in your editor and hit the plus button.",
		done: "Commented on code",
		pulse: "compose-gutter",
		video: "",
		panel: WebviewPanels.NewComment,
		isComplete: user => user.totalPosts > 0
	},
	{
		id: "addPhoto",
		title: "Add a profile photo",
		subtext: "so your teammates know who’s who.",
		done: "Added profile photo",
		pulse: "global-nav-more-label",
		video: "",
		panel: WebviewPanels.ChangeAvatar,
		isComplete: user => user.avatar && user.avatar.image
	},
	{
		id: "viewPRs",
		title: "View comments from PRs,",
		subtext: "including merged PRs and your current branch.",
		done: "Connected to PR provider",
		pulse: "pr-toggle",
		video: "https://youtu.be/sM607iVWM3w",
		panel: WebviewPanels.PRInfo,
		isComplete: (_, state) =>
			["github", "bitbucket", "gitlab"].some(name => isConnected(state, { name }))
	},
	{
		id: "createCodeReview",
		// title: "Ask for feedback",
		// subtext: "on your work-in-progress, or request a formal code review.",
		title: "Request a Code Review",
		subtext: "to get feedback on your work-in-progress, or final code review.",
		done: "Requested a Code Review",
		pulse: "global-nav-plus-label",
		video: "https://www.youtube.com/watch?v=2AyqT4z5Omc",
		panel: WebviewPanels.NewReview,
		isComplete: user => user.numCodeReviews > 0
	},
	{
		id: "invite",
		title: "Invite your teammates",
		subtext: "and see what they are working on in real-time.",
		done: "Invited teammates",
		pulse: "global-nav-team-label",
		video: "https://www.youtube.com/watch?v=h5KI3svlq-0",
		panel: WebviewPanels.People,
		isComplete: user => user.numInvites > 0
	},
	{
		id: "setUpIntegrations",
		title: "Add integrations",
		subtext: "with your code host, issue tracker, and messaging service.",
		done: "Added integrations",
		pulse: "global-nav-more-label",
		video: "",
		panel: WebviewPanels.Integrations,
		isComplete: user => {
			const { providerInfo = {} } = user;
			return Object.keys(providerInfo).length > 0;
		}
	}
];

interface GettingStartedProps {}

export function GettingStarted(props: GettingStartedProps) {
	const dispatch = useDispatch<Dispatch>();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const preferences = state.preferences || {};
		const gettingStartedPreferences = preferences.gettingStarted || {};
		const todo = [] as any;
		const completed = [] as any;
		STEPS.forEach(step => {
			if (gettingStartedPreferences[step.id] || step.isComplete(currentUser, state)) {
				completed.push(step);
			} else {
				todo.push(step);
			}
		});
		return {
			todo,
			completed,
			gettingStartedPreferences
		};
	}, shallowEqual);

	const skipStep = step => {
		const id = step.id;
		const value = !derivedState.gettingStartedPreferences[id];
		dispatch(setUserPreference(["gettingStarted", id], value));
		unPulse(step.pulse);
	};

	const pulse = id => {
		const element = document.getElementById(id);
		if (element) element.classList.add("pulse");
	};

	const unPulse = id => {
		const element = document.getElementById(id);
		if (element) element.classList.remove("pulse");
	};

	const handleClick = (e, step) => {
		// if they clicked on the youtube video link, don't open the panel
		if (e && e.target && e.target.closest("a")) return;
		// if they clicked
		if (e && e.target && e.target.closest(".icon")) return;
		if (step.panel) dispatch(openPanel(step.panel));
	};

	return (
		<Root>
			<ComposeArea id="compose-gutter" />
			<h2>Welcome to CodeStream</h2>
			<b>Let’s get you set up.</b> Follow the steps below to start coding more efficiently with your
			team.
			<Status>
				<StatusCount>
					{derivedState.completed.length} of {STEPS.length}
				</StatusCount>{" "}
				complete
			</Status>
			{derivedState.todo.map((step, index) => {
				return (
					<Step
						key={step.id}
						onMouseEnter={() => pulse(step.pulse)}
						onMouseLeave={() => unPulse(step.pulse)}
						onClick={e => handleClick(e, step)}
					>
						<StepNumber>{index + 1}</StepNumber>
						<StepText>
							<StepTitle>{step.title}</StepTitle>&nbsp;<StepSubtext>{step.subtext}</StepSubtext>
						</StepText>
						<Tooltip title="Watch the how-to video" placement="bottomRight" delay={1}>
							<a href={step.video}>
								<YouTubeImg src="https://i.imgur.com/9IKqpzf.png" />
							</a>
						</Tooltip>
						<Icon name="x" className="clickable" onClick={e => skipStep(step)} />
					</Step>
				);
			})}
			{derivedState.completed.length > 0 && <HR />}
			{derivedState.completed.map(step => {
				return (
					<Step
						key={step.id}
						onMouseEnter={() => pulse(step.pulse)}
						onMouseLeave={() => unPulse(step.pulse)}
						onClick={e => handleClick(e, step)}
					>
						<StepNumberDone>
							<b>{"\u2714"}</b>
						</StepNumberDone>
						<StepText>
							<StepTitle>{step.done}</StepTitle>
						</StepText>
						<Tooltip title="Watch the how-to video" placement="bottomRight" delay={1}>
							<a href={step.video}>
								<YouTubeImg src="https://i.imgur.com/9IKqpzf.png" />
							</a>
						</Tooltip>
						<Icon name="plus" className="clickable" onClick={e => skipStep(step)} />
					</Step>
				);
			})}
		</Root>
	);
}
