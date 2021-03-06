# CodeStream

CodeStream is a developer collaboration platform that makes it incredibly easy for development teams, especially remote teams, to discuss and review code in a more natural and contextual way. CodeStream not only makes discussions easier, by allowing them to happen in your IDE, in context, but also preserves the institutional knowledge that is currently being lost in Slack channels and emails. 

![CodeStream](https://raw.githubusercontent.com/TeamCodeStream/CodeStream/master/images/CSforAtom.png)

### Requirements

- CodeStream requires version 1.34 or later of [Atom](https://atom.io/).
- Your repository must be managed by Git, or a Git hosting service like GitHub.

### Installation

You have two options for installing CodeStream.

- Search for "CodeStream" in Atom's built-in package manager and install from there.
- Or, run the command `apm install codestream` in your terminal.

## Discuss Code Just Like Commenting on a Google Doc

Simply select a block of code and type your question or comment. Teammates can participate in the discussion right from their IDE. 

![CodeStream](https://raw.githubusercontent.com/TeamCodeStream/CodeStream/master/images/animated/DiscussCode-Atom.gif)

You can optionally share the discussion on Slack or Microsoft Teams so teammates can participate from their chat clients as well.

![Share on Slack](https://raw.githubusercontent.com/TeamCodeStream/CodeStream/master/images/ShareOnSlack1.png)

## Build the Knowledge Base Behind Your Codebase

CodeStream turns conversation into documentation by capturing all of the discussion about your code, and saving it with your code. Comment and code review threads are automatically repositioned as your code changes, even across branches. All with zero effort on your part.

![Knowledge Base](https://raw.githubusercontent.com/TeamCodeStream/CodeStream/master/images/animated/KnowledgeBase-Atom.gif)

Previously discussed questions and issues that explain important decisions are now accessible right where you need them, when you need them. Just click on the codemark to expand it and see how something works or why something was done a certain way.

## Team Transparency through Live View

Development is a collaborative activity, yet much of it happens in isolation, with work only shared with the team at the end of a cycle, or sprint. CodeStream’s “LiveView” increases transparency by making the local edits of individual developers visible to team members, so that everyone knows what everyone else is working on, in real-time.

As developers write code, whether editing existing files or creating new files, a summary of their changes, including the repo(s), files, and lines changed is exposed to their teammates through CodeStream. The information is displayed contextually, in the IDE, and even warns teammates of potential merge conflicts… before they happen!

![Live View](https://raw.githubusercontent.com/TeamCodeStream/CodeStream/master/images/TeamTab.png)

## Frequently Asked Questions

#### Where are messages stored?

Your team’s codemarks, which include the message text and the code snippet, are stored in the cloud on CodeStream’s servers. CodeStream uses best practices when it comes to [security](https://www.codestream.com/security), but if your team has stringent infosec requirements we also offer an [on-prem solution](https://github.com/TeamCodeStream/onprem-install/wiki).

#### What access to Git does CodeStream require?

You won’t need to provide CodeStream with any Git (or GitHub, Bitbucket, etc.) credentials, as the extension simply leverages your IDE’s access to Git. CodeStream uses Git to do things like automatically mention the most recent author when you share a block of code in a post, and to maintain the connection between that block of code and where it’s located in the source file as the file evolves over time (and commits).

#### What is CodeStream's pricing model?

Codestream is free to try for 30 days for teams of all sizes. CodeStream is free to use for small teams with 5 or fewer developers, educational organizations, and for open source projects. For all other teams, pricing starts at \$10/user/month. To learn more, visit https://www.codestream.com/pricing or contact sales@codestream.com.

# Help & Feedback

Check out our [wiki](https://github.com/TeamCodeStream/CodeStream/wiki) for more information on getting started with CodeStream. Please follow [@teamcodestream](http://twitter.com/teamcodestream) for product updates and to share feedback and questions. You can also email us at support@codestream.com.

[![CodeStream Logo](https://alt-images.codestream.com/codestream_logo_atommarketplace.png)](https://codestream.com?utm_source=atommarket&utm_medium=banner&utm_campaign=codestream)