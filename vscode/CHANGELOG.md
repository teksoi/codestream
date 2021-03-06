# Change Log

## [7.4.1] - 2020-6-9

### Fixed

- Fixes an issue where the current user would be added as a suggested reviewer in a code review

## [7.4.0] - 2020-6-8

### Added

- Adds the ability to notify people via email about codemarks or code review assignments, even if they aren't yet on your CodeStream team
- Adds a CodeStream entry to the VS Code Source Control view to see your open code reviews and review assigned to you

### Changed

- Icons for creating codemarks now appear when you hover in the gutter, or select code in your editor, on most top-level pages and not just on the Current File tab
- Change request titles at the top of a code review now link to the referenced codemark isntead of marking the request complete
- Entry of invite codes is now on the initial page in the extension to make it easier for teammates to join

### Fixed

- Fixes an issue where opening a code review via permalink or from Slack would result in an error in the IDE

## [7.3.0] - 2020-5-29

### Added

- Adds the ability to ammend a code review with new code changes

### Fixed

- Addresses [#195](https://github.com/TeamCodeStream/CodeStream/issues/195) &mdash; .codestreamignore should accept directory/wildcard/regex exclusions

## [7.2.6] - 2020-5-22

### Fixed

- Fixes an issue that prevented signup via GitHub

## [7.2.5] - 2020-5-21

### Added

- Adds support for authentication with Okta for CodeStream On-Prem installations

## [7.2.4] - 2020-5-19

### Changed

- Expose strictSSL requirement setting for Cloud installations

### Fixed

- Fixes an issue where reviews of uncommitted changes in branches containing unpushed commits include the changes from those commits
- Fixes an issue with flashing headshots on the Search tab when the editor is scrolled

## [7.2.3] - 2020-5-18

### Added

- Adds the ability to react to posts with emoji
- Adds the display of the server URL to the bottom of the initial page in the extension, for the benefit of on-prem installations

### Changed

- Improved display of nested replies in a code review's thread

### Fixed

- Addresses [#192](https://github.com/TeamCodeStream/CodeStream/issues/192) &mdash; Adopt VS Code's 'asWebviewUri' API
- Fixes several performance issues associated with the git watcher

## [7.2.2] - 2020-5-15

### Added

- Command palette, editor context menu, and codelens action menu all now include a Create Review option

### Changed

- Requesting a code code review now shows earlier commits if no unique commits can be found on the branch
- Team tab now provides invite codes for on-prem installations running without outbound email
- PR toggle on the Current File tab is suppressed for on-prem installations not using https

### Fixed

- Addresses [#187](https://github.com/TeamCodeStream/CodeStream/issues/187) &mdash; Git error with empty file
- Addresses [#158](https://github.com/TeamCodeStream/CodeStream/issues/187) &mdash; Can't paste HTML tags
- Fixes an issue where editing a reply removed any formatting
- Fixes an issue where pasted HTML would get rendered in a reply

## [7.2.1] - 2020-5-6

### Added

- Addresses [#88](https://github.com/TeamCodeStream/CodeStream/issues/88) &mdash; Support VS Code remote development
- Adds new profile pages, accessible by clicking on headshots throughout CodeStream

### Changed

- If you don't have a given repo open when performing a code review you are now able to locate it on disk
- Warning about not having a commit when performing a code review now automatically goes away once you get the commit
- Code review form now automatically recognizes when files are stages or commits are pushed

### Fixed

- Addresses [#181](https://github.com/TeamCodeStream/CodeStream/issues/181) &mdash; Prevent spawning of external git diff tools
- Fixes an issue with repo selection not always being correct the very first time you request a code review
- Fixes an issue where warning about unsaved changes when requesting a code review only display on Windows
- Fixes issues with Esc not always closing various modals and panels
- Fixes an issue with the default code review title not updating when you switched repos
- Fixes an issue where a code review would incorrectly indicate that it included uncommitted local changes

## [7.2.0] - 2020-4-28

### Added

- Adds the ability to require all reviewers assigned to a code review to approve it individually
- Adds the ability for admins to control code review approval requirements
- Adds the ability for adds to control if/how reviewers are suggested for code reviews

### Changed

- The status dropdown and ellipses menu for a code review or issue codemark in the activity feed have been consolidated
- Headshots for issue and code review assignees are now displayed at the right side of activity feed entries
- Truncates the display of the review title when viewing a code review diff
- Updated copy on first extension page to clarify the Create vs Join team choice
- Increased the contrast of menu backgrounds for easier visibility

### Fixed

- Addresses [#178](https://github.com/TeamCodeStream/CodeStream/issues/178) &mdash; Incorrect Jira URL
- Fixes an issue with permanently excluded files appearing in a code review
- Fixes an issue with new or deleted files not being identified as such in code reviews
- Fixes an issue with the ellipses menu missing for closed code reviews
- Fixes an issue where long code review names would render poorly
- Fixes an issue where live-view hovers on the Team tab wouldn't handle large amounts of content

## [7.1.1] - 2020-4-20

### Fixed

- Fixes an issue that omitted the number of changes for modified files in certain code reviews

## [7.1.0] - 2020-4-20

### Added

- Adds new integrations with GitHub Enterprise and GitLab Self-Managed that leverage personal access tokens and no longer require your instance to be publicly accessible
- Adds the ability to send invitation codes on your own in case CodeStream invitation emails are being blocked by your organization
- Adds a way to clear the search box on the Filter & Search tab
- Adds the ability to remove a previously connected Jira Server host

### Changed

- General UI improvements to code reviews, including a warning about open change requests, clearer button copy, etc.

### Fixed

- Fixes an issue where the Submit button on the codemark form was not responsive
- Fixes an issue where new files are still listed in "modified files" even if saved and staged changes are not selected
- Fixes an issue where canceling a review results in the re-rendering of the review form

## [7.0.2] - 2020-4-14

### Fixed

- Fixes an issue with codemarks not appearing in the Current File view for uncommitted files
- Fixes an issue with the CodeStream pane not opening by default after initial installation
- Fixes an issue with the CodeStream pane opening when it had previously been closed when opening VSC from the command line
- Fixes an issue with the "What's New" popup appearing for new CodeStream installations

## [7.0.1] - 2020-4-10

### Added

- Adds the ability to change your email address
- Adds a new guided tour for new users
- Adds a new consolidated Integrations page, simplifying the ellipses menu
- Adds the ability to add a profile photo by specifying a URL
- Adds the ability to remove an invited user from the team
- Adds a list of suggested invitees based on git commit history (for team admins only)

### Changed

- Creating a codemark via the plus menu will now recognize if you have a block of code selected in the editor

### Fixed

- Fixes an issue with assignees not being added to tickets created on Jira
- Fixes an issue with sharing very large posts to Slack

## [7.0.0] - 2020-4-3

### Added

- Code review functionality is no longer in private beta and is now available for all teams
- Adds new "Live View" of what your teammates are working, including warnings about potential merge conflicts
- Adds warnings to the top of the Current File view when a teammate is editing the same file or if there's a potential merge conflict
- Addresses [#162](https://github.com/TeamCodeStream/CodeStream/issues/162) &mdash; Adds admin capabilities and team settings
- Adds the ability for an admin to rename the team
- Adds the ability for an admin to assign/remove admin privileges
- Adds the ability for an admin to remove people from the team
- Adds the ability for an admin to control Live View usage for the team
- Adds the ability for users to change their username
- Adds the ability for users to change their full name
- Adds the ability for users to cancel their accounts

### Changed

- Changes status bar entry from "Sign in..." to "CodeStream" when user is signed out
- Prevents the creation of codemarks when viewing a non-code review diff

### Fixed

- Fixes [#160](https://github.com/TeamCodeStream/CodeStream/issues/160) &mdash; Blank CodeStream pane after starting up VSC
- Fixes [#166](https://github.com/TeamCodeStream/CodeStream/issues/166) &mdash; Error creating codemarks
- Fixes [#168](https://github.com/TeamCodeStream/CodeStream/issues/168) &mdash; Can't post issues to GitHub
- Fixes an issue with the diff for a new file added to a code review being blank

## [6.5.1] - 2020-4-1

### Fixed

- Fixes an issue receiving real-time events for on-prem customers

## [6.5.0] - 2020-3-31

### Added

- Adds the ability to sign into CodeStream with GitHub
- Adds the ability to navigate through files in a code review with either the mouse or a keyboard shortcut

## [6.4.0] - 2020-3-27

### Added

- Adds the ability to email and desktop notifications on/off separately
- Adds confirmation message after submitting a code review, or a codemark with no associated code block

### Changed

- When viewing a codemark the entire code block is now clickable and will open the given file

## [6.3.3] - 2020-3-24

### Added

- Mentions on CodeStream now flow through to Slack if there's a match on email address or username
- Adds the ability to view diffs for changed files while requesting a code review
- Adds the ability to share an existing code review to Slack or MS Teams
- When editing a code review and adding new reviewers, they are now notified via a mention
- Esc key now exits you from the code review request form, and from an in-progress code review

### Fixed

- Fixes an issue with the Compare and Apply buttons not appearing right away when there's a diff
- Fixes an issue with html being added to a code review description after editing it
- Fixes an issue with a user submitting a code review with no repos open in the IDE

## [6.3.2] - 2020-3-19

### Fixed

- Fixes an issue with codemarks getting created without a code block when the file path included Cyrillic characters
- Fixes an issue with codemarks getting created without a code block when the team contained replies from Slack users that weren't a member of the team

## [6.3.1] - 2020-3-17

### Added

- Added "Copy link" option to code review ellipses menu
- Added a reply icon on hover over any reply in a code review's thread

### Changed

- Change requests in a code review's thread are now identified with a new activity line (e.g., Dave requested a change)
- When opening a code review, there are now spinners to the left of the files until we are sure you can click on those files

### Fixed

- Fixes an issue with the "Open & Assigned to Me" filter not including issue codemarks
- Fixes an issue where the option to edit a reply to a code review was missing
- Fixes an error when creating a codemark in code review for a file that had permalinks
- Fixes an issue with diffs on new/added files in a code review
- Fixes an issue where diff was not displayed for files in directories that do not exist in current working tree
- Fixes an issue where code review creation fails silently if diffs are too large
- Fixes UI issues on the form to request a code review
- Fixes an issue with incorrect commits being included in a review after switching repos
- Fixes an issue where you'd get roadblocked when using "Open in IDE" with a review not associated with your active IDE window

## [6.3.0] - 2020-3-10

### Added

- Adds the ability to do [shift-left code reviews](https://github.com/TeamCodeStream/CodeStream/wiki/Code-Review-(BETA)). Currently in beta for VS Code. Contact us at support@codestream.com to participate.
- Adds the ability to create an issue not connected to a block of code via the + menu in the global nav

### Changed

- More robust Filter & Search tab with an improved UI, [advanced search syntax](https://github.com/TeamCodeStream/CodeStream/wiki/Filter-and-Search), and the ability to save custom filters
- More readable activity feed UI, with author/action separated out from each card

### Fixed

- Fixes an issue sharing to Slack when there are spaces in the remote URL

## [6.2.0] - 2020-2-19

### Added

- Adds the ability to share codemarks to Microsoft Teams

### Fixed

- Fixes an issue with access tokens expiring for the Jira integration

## [6.1.0] - 2020-2-3

### Added

- Adds the ability to create additional CodeStream teams from the ellipses menu in the top nav

### Changed

- The pull-request integrations will now display comments from open PRs if you are on either the source or destination branches

## [6.0.1] - 2020-1-27

### Fixed

- Fixes [#146](https://github.com/TeamCodeStream/CodeStream/issues/146) &mdash; Unclear that duplicated shortcut label means keychord
- Fixes an issue that could lead to degraded IDE performance when CodeStream is opened with very large source files
- Fixes an issue where the compose menu in the CodeStream pane would not persist if you switched files while code was selected

## [6.0.0] - 2020-1-14

### Added

- Adds a new Activity Feed to notify you about new codemarks and new replies to codemarks
- Adds the ability for CodeStream teams to optionally share codemarks to Slack, without requiring broad access to your workspace
- Adds the ability to share any existing codemark, including those created by teammates, to Slack
- Adds the ability to reply to codemarks from Slack via a "View Discussion & Reply" button
- Adds the ability to specify a default sharing destination on Slack per repo (look for gear menu at top of the channel-selection dropdown)
- Adds new codemark-centric email notifications, which allow you to post replies by simply replying to the email
- Adds new notification settings under the ellipses menu in the top nav
- Adds the ability to manually follow/unfollow individual codemarks to control notifications
- Adds the ability to create a codemark via the "+" button in the top nav, where the code block is optional
- Adds a new Team tab to the top nav where you can invite teammates and see those already on the team
- Adds repo name to the display of codemarks

### Changed

- Assignment of an issue (excluding those shared externally) is now treated like a mention so that the assignee is notified

### Fixed

- Fixes [#139](]https://github.com/TeamCodeStream/CodeStream/issues/139) &mdash; GitHub PR comments not showing up

## [5.2.5] - 2019-12-20

### Fixed

- Fixes an issue with repo matching on startup

## [5.2.4] - 2019-12-19

### Added

- Adds a roadblock to let people know when CodeStream can't connect due to possible proxy issues

### Changed

- The form to create a codemark is now keyboard navigable

### Fixed

- Fixes an issue with creating codemarks that include blank line at the end of a file
- Fixes a broken link on the form to configure the GitLab Self-Managed integration

## [5.2.3] - 2019-11-27

### Added

- Adds support for self-signed SSL certificates for CodeStream On-Prem
- Adds display of CodeStream version number at the bottom of the ellipses menu

### Fixed

- Fixes an issue with very large codemarks not being displayed on Slack
- Fixes an issue with "Open on GitHub" buttons not accounting for .com-githubHandle remote syntax

## [5.2.2] - 2019-11-19

### Added

- Adds support for merge request comments from GitLab via the "PR" toggle on the Current File tab

### Changed

- When you cancel the creation of a codemark you are now prompted to confirm the action<
- By default, codemarks are now displayed as glyphs in the editor even when the Current File tab is selected

### Fixed

- Fixes an issue with the display of codemarks, as well as the codemark creation form, near the bottom of a file
- Fixes an issue where Slack DMs sometimes weren't available for sharing a codemark

## [5.2.0] - 2019-11-6

### Changed

- Repo matching logic now also includes commit hashes to better handle scenarios where teammates don't have a common remote URL for the same repo

### Fixed

- Fixes an issue where the codemark compose form and the newly-created codemark would briefly appear at the same time
- Fixes an issue where the current codemark was available for selection as a related codemark

## [5.1.0] - 2019-10-30

### Added

- Adds "Open in IDE", "Open on Web" and "Open on GitHub" (or Bitbucket/GitLab) links to issues created in external issue-tracking services (Jira, Trello, etc.)
- Adds the ability to manually reposition a codemark in cases where its location isn't automatically updated based on changes to the code

### Changed

- Changed the "Open on CodeStream" button in posts to Slack / MS Teams to "Open on Web"
- Improvements on codemark location calulation

### Fixed

- Fixes an issue with editing replies
- Fixes an issue with the dropdowns for Author and Branch on the Search tab not working
- Fixes an issue with the formatting of code blocks in issues created on YouTrack
- Fixes an issue where the "Open in IDE" button, for codemarks with multiple locations, would always open to the first location
- Fixes issues with "Open in IDE" from codemark pages in Firefox

## [5.0.1] - 2019-10-18

### Fixed

- Fixes an issue with codemarks disappearing after a commit

## [5.0.0] - 2019-10-16

### Added

- Add the ability to have multiple blocks of code, even across files/repos, associated with a single codemark
- Adds the ability to create issues on GitLab Enterprise

### Changed

- Codemarks can now be created and shared with your teammates even if you have unpushed commits
- Archived codemarks and resolved issues are now both controlled by the Archived filter on the Current File tab

### Fixed

- Fixes an issue where assignee wasn't being set correctly for issues created on GitLab
- Fixes an issue with the Asana integration where tasks weren't getting created

## [4.0.1] - 2019-10-2

### Added

- Adds the ability to filter codemarks on the Search tab by author, branch or commit

### Fixed

- Fixes an issue with changing issue-tracking services via the dropdown on the codemark form

## [4.0.0] - 2019-10-1

### Added

- Comments on merged-in pull requests from either GitHub or Bitbucket are now displayed right alongside the code blocks they refer to
- The ability to inject a codemark as an inline comment now has an option to include replies

### Fixed

- Fixes an issue where an issue codemark with a blank description would not get posted to Slack
- Fixes an issue where automated closed/opened messages for issue codemarks were not getting posted to Slack
- Fixes the sort order of Jira projects so that they are in alphabetical order
- Fixes an issue where the ability to star a reply was missing for Slack-connected teams
- Fixes an issue where Slack desktop notifications for codemarks would not include any content

## [3.0.2] - 2019-9-23

### Fixed

- Fixes an issue with files being opened in the CodeStream pane instead the last active editor group

## [3.0.1] - 2019-9-20

### Added

- Adds options to codemarks shared on Microsoft Teams to open a codemark on the web, in your IDE or, in the case of issues, on the issue-tracking service
- Adds new tophat to display of codemarks when the referenced code has been deleted

### Changed

- The bookmark codemark type has been removed, to be brought back at a future date

### Fixed

- Fixes [#120](]https://github.com/TeamCodeStream/CodeStream/issues/120) &mdash; CodeStream view continues to open up (required the removal of the CodeStream entry in the VS Code activity bar)
- Fixes [#117](]https://github.com/TeamCodeStream/CodeStream/issues/117) &mdash; Deleting codemark from Search tab causes unexpected error
- Fixes [#116](]https://github.com/TeamCodeStream/CodeStream/issues/116) &mdash; Creating codemark takes you out of List view
- Fixes [#115](]https://github.com/TeamCodeStream/CodeStream/issues/115) &mdash; Tab then enter discards codemark
- Fixes an issue with incorrect range being selected when code highlighted from the bottom up, and context menu used to create codemark
- Fixes an issue with permalinks being displayed on the Search tab

## [3.0.0] - 2019-9-17

### Added

- Adds a "Copy link" menu option for all codemarks so that they can be shared anywhere at any time
- Adds new web-based codemark pages to display codemarks shared via link
- Adds options to codemarks shared on Slack to open a codemark on the web, in your IDE or, in the case of issues, on the issue-tracking service
- When opening a codemark in your IDE from Slack or the web, if you don't happen to have the given repo open, CodeStream will still open the file for you automatically if you've ever opened that repo while signed into CodeStream. If not, we'll prompt you to open the repo, and we'll remember the location so you don't have to do that again.
- Adds a team switcher under the ellipses menu to switch between all of your CodeStream teams
- For on-prem installations, adds a check to make sure that the version of the API server running is compatible with the extension

### Fixed

- Fixes a rate limiting issue experienced by certain teams authenticating with Microsoft Teams
- Fixes an issue with deleting replies to a codemark
- Fixes an issue with syncing with YouTrack after authenticating
- Fixes an issue where a codemark created against unsaved code would not appear immediately
- Fixes [#110](]https://github.com/TeamCodeStream/CodeStream/issues/110) &mdash; When CodeStream is open in a split focusing on CodeStream can sometimes lose the last editor context
- Fixes [#109](]https://github.com/TeamCodeStream/CodeStream/issues/109) &mdash; When the same file is open in multiple editors clicking a comment navigates in wrong editor

## [2.1.3] - 2019-9-10

### Fixed

- Fixes [#102](]https://github.com/TeamCodeStream/CodeStream/issues/102) &mdash; Unable to prevent auto-opening of the CodeStream pane

## [2.1.2] - 2019-9-9

### Added

- Addresses [#79](]https://github.com/TeamCodeStream/CodeStream/issues/79) &mdash; Adds branch info to codemark display when there's a diff
- Adds the ability to inject a codemark as an inline comment

### Fixed

- Fixes a rate limiting issue experienced by certain teams authenticating with Microsoft Teams
- Fixes an issue where replies to a codemark in a Slack-connected team would briefly appear twice
- Fixes an issue where there was no confirmation message when adding a user to a channel via slash command
- Fixes an issue where signing out of a Slack-connected team wouldn't persist after a reload of the IDE
- Fixes an issue where deleting the last codemark in a file would not remove its marker decorator

## [2.1.0] - 2019-8-20

### Added

- Adds more robust tagging functionality, allowing you to create tags with any color / text label combination
- Adds the ability to link parts of your codebase by adding "related" codemarks to a parent codemark, and then using the links to jump around the codebases

### Changed

- Improved display of collapsed codemarks to make it easy to see tags, assignees, linked issues (i.e., on an external service like Jira), and the presence of replies or related codemarks
- All new cleaner display of expanded codemarks, with replies now displayed in descending order (i.e., most recent first)
- Consistent display of codemarks across all areas of CodeStream
- Smoother scrolling of codemarks in the CodeStream pane

### Fixed

- Fixes an issue with the positioning of the codemark form when creating a codemark at the bottom of the viewport
- Fixes an issue with not being able to change issue-tracking selection once Azure DevOps has been selected
- Fixes an issue with password reset in CodeStream on-prem

## [2.0.0] - 2019-8-1

### Added

- Adds issue-tracking integrations with Jira Server and GitHub Enterprise

### Changed

- Updates the UI for creating issues on external issue tracking services to allow you to be connected to multiple services at once and change the selection on an issue by issue basis
- Codemarks now appear immediately upon submission
- Trailing slashes are stripped off of the Server URL setting for on-prem installations

### Fixed

- Fixes an issue with not all DMs from Slack appearing in the conversation selector when creating a codemark
- Fixes an issue with a lack of notification when viewing a codemark in a file you don't have

## [1.3.4] - 2019-7-26

### Added

- Adds roadblocks when your extension is behind either a required or suggested version of CodeStream

### Fixed

- Fixes [#71](]https://github.com/TeamCodeStream/CodeStream/issues/71) &mdash; You can edit channel selection when editing via thread view
- Fixes an issue where you weren't being completely truly signed in, as evidenced by the VS Code status bar

## [1.3.2] - 2019-7-16

### Changed

- Added a "Back" link below the password-reset form in case you change your mind

### Fixed

- Fixes [#70](]https://github.com/TeamCodeStream/CodeStream/issues/70) &mdash; Once joined more than one channel, I can't choose into which channel a comment should go to anymore
- Fixes an issue with repos managed by Bitbucket Server incorrectly being identified as being managed by Bitbucket cloud
- Fixes scrolling issues when creating and viewing longer codemarks
- Fixes an issue where a reload/restart of VS Code would result in multiple CodeStream panes
- Fixes an issue with the legibility of button text in light themes

## [1.3.1] - 2019-7-10

### Added

- Password reset. Sorry it took so long!
- Enforcement of CodeStream's 30-day free trial, and 5-member limit for teams on the free plan

### Changed

- Optimizations to ipc between our processes and plugin startup

### Fixed

- Fixes an issue where scrolling in the CodeStream pane with the compose modal open would lose any information already entered
- Fixes an issue where a codemark could get posted as a reply to another codemark if you had thread view open
- Fixes a spacing issue on the Sign In page
- Fixes an issue with new UI not being applied to email confirmation and Team Name pages
- Fixes rendering issues with certain Slack bots when using Slack real-time channels

## [1.3.0] - 2019-6-26

### Added

- New Microsoft Teams integration allows you to share codemarks in your organization's existing channels. [Learn more.](https://www.codestream.com/blog/codestream-1-3)
- New Slack integration that reduces the amount of Slack that appears in CodeStream, with the full Channels tab now being optional

### Changed

- Updated the UI of CodeStream's signup flow
- Asana projects are now listed in alphabetical order for selection

### Fixed

- Fixed an issue that would create more than one "CodeStream (Agent)" output channel
- Fixes an issue with code blocks in Trello cards not rendering properly, and not including the line numbers

## [1.2.1] - 2019-6-17

### Fixed

- Fixes an issue where the activity bar icon is sized incorrectly

## [1.2.0] - 2019-6-14

### Changed

- The Invite People page now only shows teammates from your Slack workspace that have signed up for CodeStream

### Fixed

- Fixes an issue that would cause an error when opening a Slack channel with Japanese characters in the name
- Fixes an issue where hovering over an expanded codemark wouldn't highlight the corresponding code block in the editor
- Fixes an issue with text in backticks not rendering properly
- Fixes an issue with new lines being displayed as html in posts on Slack
- Fixes an issue with new lines in codemark text causing display issues on the Search tab
- Fixes an issue with the Asana integration that was preventing projects from being listed
- Fixes an issue with invitation codes incorrectly expiring after 10 minutes
- Fixes an issue with editing a reply from a codemark's thread view

## [1.1.0] - 2019-6-4

### Changed

- Signup flow is now based in the IDE instead of on the web
- For CodeStream teams, invitations are now code-based allowing for quicker signup
- For Slack teams, invitation URLs have been simplified

### Fixed

- Fixes [#60](]https://github.com/TeamCodeStream/CodeStream/issues/60) &mdash; can't delete codemark in vscode
- Fixes [#57](https://github.com/TeamCodeStream/CodeStream/issues/57) &mdash; Cygwin git support
- Fixes an issue with bookmark titles not being displayed on Slack
- Fixes an issue with code snippets added to a codemark via markdown not rendering

## [1.0.2] - 2019-5-22

### Changed

- Desktop notifications now default to off for users on Slack teams

### Fixed

- Fixes an issue where a new codemark sometimes wouldn't appear right away
- Fixes an issue where git repos with remote URLs containing port numbers would prevent codemarks from being displayed properly
- Fixes [#61](https://github.com/TeamCodeStream/CodeStream/issues/61) &mdash; Formatting issues with codemarks

## [1.0.1] - 2019-5-15

### Added

- Adds an integration with YouTrack issue tracking

## [1.0.0] - 2019-5-13

### Added

- Adds preemptive warnings about creating codemarks in files that aren't managed by Git, don't have remote URLs, or haven't been saved

### Fixed

- Fixes an issue with the wrapping of filename and line number information in the codemark form

## [0.53.0] - 2019-5-3

### Added

- CodeStream now integrates with Azure DevOps issue tracking

### Changed

- When editing an issue codemark linked to an external service, assignees are read-only since they can't be edited from CodeStream

### Fixed

- Fixes an issue with mentions posted in a reply not being treated as a mention in terms of badges and notifications
- Fixes an issue with notifications on Slack teams not working
- Fixes an issue where CodeStream would not recognize when a source file wasn't selected or open
- Fixes an issue when changing the code selection with the codemark form already open
- Fixes an issue with editing posts from the conversation stream

## [0.52.1] - 2019-4-19

### Added

- Adds a guide to keyboard shortcuts in the default view of the Current File tab when there are no codemarks

### Changed

- Updated the Jira integration to accommodate the GDPR-related changes to the Jira Cloud REST APIs, which means that Jira assignees can no longer be mapped to a CodeStream user

### Fixed

- Fixes an issue that prevented desktop notifications from being displayed
- Fixes an issue that prevented users with proxies from being able to sign in
- Fixes an issue that prevented users without Git installed from being able to sign in
- Fixes an issue that prevented the editing of replies

## [0.52.0] - 2019-4-10

### Added

- Adds a completely new view of codemarks that makes information much more accessible, with the ability to view and edit in-place. [Read more on our blog.](https://blog.codestream.com/index.php/2019/04/10/codestream-v0-52-new-codemarks-view/)
- Adds the ability to "star" a reply so that it's surfaced in the codemarks view
- Adds the ability to assign shortcuts to individual codemarks, allowing you to quickly jump around the codebase
- Adds a toolbar to the bottom of the Current File tab with filters to control whether or not you see completed issues or archived codemarks
- Adds clickable indicators to the toolbar to let you know when there are codemarks above/below your current view
- Archived codemarks and resolved issues are now displayed in a collapsed format in a new gutter at the right side of the CodeStream pane, with the ability to click to expand the display
- Adds a new header treatment for archived codemarks
- Scrolling the view of codemarks in the CodeStream pane will now scroll the source file as well
- Adds a quick overview of codemarks accessible via an info icon at the bottom-right of each codemark

### Changed

- The display of an expanded codemark only includes the code block, as well as the Compare and Apply links, if there’s a diff from what you have locally

### Fixed

- Fixes an issue where using the “selected conversations” filter on the Channels tab, with only a single channel selected, would cause codemarks to get shared to the wrong conversation
- Fixes an issue where a codemark would no longer render on CodeStream if the post was deleted via the Slack client
- Fixes an issue where archived and closed Slack conversations were appearing in the conversation selector when creating a codemark
- Fixes an issue that prevented an edited bookmark from being saved

## [0.51.0] - 2019-4-2

### Changed

- Changes the `Ctrl+/` `Ctrl+/` shortcut to toggle the CodeStream pane
- Improves the Jira project search to ensure all projects are available for selection

## [0.50.0] - 2019-3-21

### Added

- Adds a Google Docs-like display of codemarks in the current file, where codemarks are displayed to the right of the source code and scroll up/down along with the source
- Adds a permalink codemark type for sharing a link to a specific block of code
- Adds the ability to close or re-open an issue from the codemark's thread view
- Adds an Archive option to a codemark’s gear menu to hide it when the Current File tab is selected (but it will still be shown on the Search tab)
- Adds new [keyboard shortcuts](https://github.com/TeamCodeStream/CodeStream/wiki/Keyboard-Shortcuts) for creating a codemark after selecting code
- Adds a `codestream.autoHideMarkers` setting (on by default) to specify whether to automatically hide editor marker glyphs when the CodeStream panel is showing codemarks in the current file
- Adds a `codestream.showMarkerCodeLens` setting (off by default) to specify whether to show code lens above lines with associated codemarks in the editor
- Adds a `codestream.showFeedbackSmiley` setting (on by default) to specify whether to show a feedback button in the CodeStream panel
- Adds an experimental `codestream.showShortcutTipOnSelection` setting (off by default) to specify whether to show a shortcut key tip attached to the selection when you select code (still a work in progress)

### Changed

- Opening the CodeStream pane is now much faster
- New icon-based global navigation
- When selecting a channel/DM to share a codemark, the list now honors the “selected conversations” filter from the Channels tab
- Context/lightbulb menus in the editor now have separate entries for creating a comment, issue, bookmark or permalink
- Renames `codestream.showMarkers` setting to `codestream.showMarkerGlyphs` as it is now specifically about glyph indicators
- Renames `codestream.avatars` setting to `codestream.showAvatars` for consistency with other settings

### Fixed

- Fixes an issue with the wrong channel name being displayed at the top of the page when viewing a codemark
- Fixes an issue with links to join a Live Share session not being clickable
- Fixes an issue with “/cc” being include in codemarks shared on Slack when no one was mentioned

## [0.35.0] - 2019-2-15

### Fixed

- Fixes an issue where the Submit/Cancel buttons would not render correctly when creating a codemark

## [0.34.0] - 2019-2-8

### Changed

- Mentions in a codemark posted to Slack are now replicated outside of the attachment so that they render as actual mentions on Slack

### Fixed

- Fixes an issue where messages weren't being rendered in realtime
- Fixes [#34](https://github.com/TeamCodeStream/CodeStream/issues/34) &mdash; Slack channel list not fully visible when creating CodeMark
- Fixes an issue with the mentions popup not being fully scrollable
- Fixes an issue with mentions not being case insensitive

## [0.33.1] - 2019-2-5

### Fixed

- Fixes an issue that required a second auth with Slack after signing up with Slack

## [0.33.0] - 2019-2-4

### Added

- Adds issue integrations with Jira, Trello, GitHub, Asana, Bitbucket, and GitLab
- Adds the ability to compare the code associated with a codemark to your local version of the file, or to apply the change
- Adds a More Options/ellipses menu to the global nav for access to inviting people, help, sign out, and the ability to connect/disconnect from external services
- Adds an entry into the VS Code activity bar that toggles the CodeStream pane

### Changed

- New, simplified form for creating a codemark
- Hovering over a codemark in a source file now automatically displays the codemark in the CodeStream pane

### Fixed

- Fixes an issue with emoji not rendering in a codemark's hover
- Fixes an issue with Selected Conversations filter selections not persisting

## [0.32.0] - 2019-1-7

### Fixed

- Fixes an issue with unread message indicators not clearing for CodeStream teams when there were unreads in multiple channels

## [0.31.0] - 2018-12-20

### Changed

- Replies posted to a thread are no longer broadcast to the channel on Slack to temporarily work around a Slack bug
- Link text when hovering over a codemark in a source file is now based on the type of codemark

### Fixed

- Fixes an issue where very long strings would expand the New Codemark modal off the page
- Fixes an issue with the help text in the chat box when viewing a thread
- Fixes an issue with line breaks not being preserved in codemark descriptions
- Fixes an issue with the Codemarks tab not taking repo into account when associating codemarks with the current file
- Fixes an issue with the webview not always restoring the previously selected channel

## [0.30.3] - 2018-12-12

### Fixed

- Fixes [#28](https://github.com/TeamCodeStream/CodeStream/issues/28) &mdash; Certain markdown snippets cause markdown parsing library to throw an error

## [0.30.2] - 2018-12-10

### Fixed

- Fixes [#20](https://github.com/TeamCodeStream/CodeStream/issues/20) &mdash; Add CodeStream comment doesn't work for Slack
- Fixes an issue with automated messages for the closing of an issue codemark not being displayed as part of the issue's thread.

## [0.30.1] - 2018-12-6

### Fixed

- Fixes an issue where if another user created a codemark (without code), it would not immediately be displayed in the Codemarks view
- Fixes an issue where if another user created a codemark (with code), it would not be displayed in the editor until a reload

## [0.30] - 2018-12-6

### Added

- Adds different types of "codemarks", including comments, issues, code traps and bookmarks, for annotating your code base - [Learn more about codemarks](https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks)
- Adds a "Codemarks" page for exploring your knowledge base and looking at filtered views of your codemarks
- Adds a global navigation with tabs for jumping between codemarks, channels and your currently selected conversation
- Adds the ability to search for codemarks
- Adds a form for creating codemarks that automatically pops up when code is selected in your editor
- Adds a "Quote" option to the gear menu for posts in the stream to easily quote a post
- Adds the ability to start a Live Share session via an icon that appears on hover on the Channels tab

### Changed

- Continued (but significant) optimizations for handling large slack workspaces

### Fixed

- Fixes [#10](https://github.com/TeamCodeStream/CodeStream/issues/10) &mdash; Downloading Channel list takes a very long time, then fails
- Fixes [#15](https://github.com/TeamCodeStream/CodeStream/issues/15) &mdash; Unable to open channels with Japanese characters
- Fixes [#17](https://github.com/TeamCodeStream/CodeStream/issues/17) &mdash; Links to Github don't put hash in URL properly
- Fixes [#18](https://github.com/TeamCodeStream/CodeStream/issues/18) &mdash; Unread count in VS Code status bar not decrementing

## [0.24.2] - 2018-11-19

### Fixed

- Fixes issue with some slack teams missing real-time events -- affected teams will be signed out and will need to reauthenticate to resolve the issue

## [0.24.1] - 2018-11-16

### Fixed

- Fixes some performance issues with larger Slack teams (still a work-in-progress)

## [0.24.0] - 2018-11-12

### Added

- Adds an Open button to incoming message notifications to jump directly to the channel &mdash; closes [#8](https://github.com/TeamCodeStream/CodeStream/issues/8)

### Changed

- Improves reconnection status and behavior on network connection loss or sleep for Slack teams

### Fixed

- Fixes an issue where unread indicators were not showing up on channels after logging in with Slack teams
- Fixes an issue where unread indicators were sometimes showing up for archived channels with Slack teams
- Fixes an issue where in certain (rare) cases the agent process could get stuck in an infinite loop

## [0.23.0] - 2018-11-9

### Changed

- Improves performance of initial loading of channels/DMs for Slack teams

## [0.22.1] - 2018-11-7

### Fixed

- Fixes an undefined property error while calculating count of unread messages

## [0.22.0] - 2018-11-2

### Fixed

- Fixes an issue with logging into some Slack teams
- Fixes issues with reconnecting to Slack after a network connection loss
- Fixes an issue where channels deleted from Slack wouldn't get removed from CodeStream

## [0.21.0] - 2018-11-1

### Added

- Adds support for network connections via proxies
- Adds the ability to add people to or remove people from a Slack channel via CodeStream
- Adds the synchronization of a channel's muted status from Slack

### Changed

- Prioritize Slack DMs to reduce the number that need to be loaded

### Fixed

- Fixes an issue with leaving a Slack channel from within CodeStream
- Fixes an issue with adding people while creating a Slack channel from CodeStream
- Fixes an issue where creating a Slack DM could result in an unexpected error
- Fixes an issue with marking a stream as read
- Fixes [#12](https://github.com/TeamCodeStream/CodeStream/issues/12) &mdash; Webview: FAILED waiting for webview ready event
- Fixes an issue with CodeStream's ephemeral system posts sometimes causing errors

## [0.20.0] - 2018-10-29

### Added

- Adds the display of Slack-based presence next to DMs on the channel switcher
- Adds the synchronization of closed DMs between Slack and CodeStream

### Changed

- Optimizes startup performance to avoid rate-limiting and slow foreground requests due to background fetching when using Slack channels

## [0.19.0] - 2018-10-26

### Added

- Adds ability to archive a Slack channel via the /archive slash command
- Adds ability to rename a Slack channel via the /rename slash command
- Adds ability to set the purpose of a Slack channel via the /purpose slash command
- Adds /msg command for Slack channels

### Changed

- Reduced our default post fetch count to 50 for better performance

### Fixed

- Fixes an issue with the /msg slash command adding extra spaces in the message
- Fixes an issue with seeing replies in some case with CodeStream channels
- Fixes issues where in certain cases marker recalculation failed

## [0.18.0] - 2018-10-24

### Changed

- Decouple the loading of Slack channels from the loading of unread and latest-post information.

### Fixed

- Fixes an issue with new direct messages not appearing on the channel switcher without a reload.
- Fixes an issue with deactivated users appearing in list of DMs and in list of current team members.
- Fixes an issue where code block wasn't being highlighted in source file when entering thread view.
- Fixes an issue that prevented the deletion of multiple posts.
- Fixes an issue with adding and removing people from CodeStream channels.
- Fixes an issue with renaming or setting the purpose of a CodeStream channel.
- Fixes an issue with being able to react to a message multiple times with the same emoji.

## [0.17.1] - 2018-10-17

### Fixed

- Fixes an issue with markers not working

## [0.17.0] - 2018-10-17

### Fixed

- Fixes [#6](https://github.com/TeamCodeStream/CodeStream/issues/6) &mdash; Github Links in Slack messages are broken
- Fixes an unexpected error when creating a new direct messages
- Fixes an issue that would incorrectly redisplay the "unread messages above" banner
- Fixes an issue that prevented the display of the new-message separator in the stream

## [0.16.0] - 2018-10-15

### Fixed

- Fixes syncronization of unread message indicators between CodeStream and Slack.
- Fixes issues with certain message content that would trigger unexpected errors.

## [0.15.1] - 2018-10-11

### Fixed

- Fixes [#5](https://github.com/TeamCodeStream/CodeStream/issues/3) &mdash; Clicking Slack emoji icon produces an unexpected error

## [0.15.0] - 2018-10-10

### Added

- Adds the ability to access all of your Slack channels and DMs from within CodeStream. [Learn more.](https://blog.codestream.com/index.php/2018/10/10/codestream-brings-slack-into-vs-code/)

## Fixed

- Fixes possible incorrect team selection when signing into a Slack team
- Fixes missing Slack thread replies from showing up in the channel

## [0.13.0] - 2018-09-27

### Added

- Adds display of channel purpose in tooltip when you hover over channel name in stream header.
- Adds Back button to the header of the New Channel page.
- Adds emoji name to the tooltip when you hover over a reaction.

### Changed

- Changes UI of the channel switcher to more closely mirror the VS Code sidebar.
- Changes `codestream.showInStatusBar` setting to allow CodeStream to be shown at either the left or right side of the status bar.

## Fixed

- Fixes [#3](https://github.com/TeamCodeStream/CodeStream/issues/3) &mdash; Logging to debug console when debugging different extension

## [0.12.0] - 2018-09-19

### Added

- Adds a new `codestream.showInStatusBar` setting to specify whether to show CodeStream in the status bar &mdash; closes [#1](https://github.com/TeamCodeStream/CodeStream/issues/1)

## [0.11.0] - 2018-09-11

### Added

- Initial beta release for the VS Code Marketplace.
- Adds support for emoji selection and auto-completion.
- Adds ability to add reactions to messages.
- Adds support for the use of markdown in messages.
- Adds display of CodeStream version number to bottom of sign-in page.

### Changed

- Increases security by storing credentials in the native credential store if available.
- Reduces package size and improves loading performance.
- Notifies users of required extension updates, but otherwise now lets VS Code handle regular updates.

### Fixed

- Fixes issue with new channel members not always seeing complete message history without reload of webview.
