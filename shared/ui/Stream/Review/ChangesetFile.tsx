import React from "react";
import { ReviewChangesetFileInfo, FileStatus } from "@codestream/protocols/api";
import styled from "styled-components";

interface Props {
	className?: string;
	onClick?: React.MouseEventHandler;
	selected?: boolean;
	noHover?: boolean;
	icon?: any;
}

export const ChangesetFile = styled((props: ReviewChangesetFileInfo & Props) => {
	const { status } = props;

	return (
		<div
			className={`${props.className} ${props.selected ? "selected" : ""} ${
				props.noHover ? "no-hover" : ""
			} ${
				props.icon ? "with-file-icon" : ""
			} row-with-icon-actions monospace ellipsis-left-container`}
			onClick={props.onClick}
		>
			{props.icon}
			<span className="file-info ellipsis-left">
				<bdi dir="ltr">{props.file}</bdi>
			</span>
			{props.linesAdded > 0 && <span className="added">+{props.linesAdded} </span>}
			{props.linesRemoved > 0 && <span className="deleted">-{props.linesRemoved}</span>}
			{props.status === FileStatus.untracked && <span className="added">new </span>}
			{props.status === FileStatus.added && <span className="added">added </span>}
			{props.status === FileStatus.copied && <span className="added">copied </span>}
			{props.status === FileStatus.unmerged && <span className="deleted">conflict </span>}
			{props.status === FileStatus.deleted && <span className="deleted">deleted </span>}
		</div>
	);
})`
	width: 100%;
`;
