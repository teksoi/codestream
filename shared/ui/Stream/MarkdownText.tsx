import styled from "styled-components";
import { useMarkdownifyToHtml } from "./Markdowner";
import React from "react";

export const MarkdownText = styled(
	(props: {
		text: string;
		as?: "string" | React.ElementType | React.Component;
		className?: string;
		excludeParagraphWrap?: boolean;
	}) => {
		const markdownifyToHtml = useMarkdownifyToHtml();

		return React.createElement(
			// casting to `any` on the next line because of a terrible type declaration for React.createElement that hardcodes the string 'input' as the first argument
			props.as || ("span" as any),
			{
				className: props.className,
				dangerouslySetInnerHTML: {
					__html: markdownifyToHtml(props.text, {
						excludeParagraphWrap: !!props.excludeParagraphWrap
					})
				}
			},
			null
		);
	}
)`
	white-space: normal;
	text-overflow: initial;
	p {
		margin: 0;
	}
	.code,
	code {
		max-width: 100%;
		overflow-x: auto; // A long code snippet can extend past the container and look weird
	}
	white-space: pre-wrap;
	word-wrap: break-word;
`;
