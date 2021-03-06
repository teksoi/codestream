package com.codestream.notification

import com.codestream.CODESTREAM_TOOL_WINDOW_ID
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.protocols.agent.Codemark
import com.codestream.protocols.agent.Post
import com.codestream.protocols.agent.Review
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.protocols.webview.ReviewNotifications
import com.codestream.sessionService
import com.codestream.settingsService
import com.codestream.webViewService
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationDisplayType
import com.intellij.notification.NotificationGroup
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

const val CODESTREAM_NOTIFICATION_GROUP_ID = "CodeStream"
private val icon = IconLoader.getIcon("/images/codestream-unread.svg")
private val notificationGroup =
    NotificationGroup(
        CODESTREAM_NOTIFICATION_GROUP_ID,
        NotificationDisplayType.BALLOON,
        false,
        CODESTREAM_TOOL_WINDOW_ID,
        icon
    )

class NotificationComponent(val project: Project) {
    private val logger = Logger.getInstance(NotificationComponent::class.java)

    init {
        project.sessionService?.onPostsChanged(this::didChangePosts)
    }

    private fun didChangePosts(posts: List<Post>) {
        GlobalScope.launch {
            posts.forEach { didChangePost(it) }
        }
    }

    private suspend fun didChangePost(post: Post) {
        try {
            val codeStream = project.codeStream ?: return
            val session = project.sessionService ?: return
            val settings = project.settingsService ?: return
            val userLoggedIn = session.userLoggedIn ?: return

            if (!userLoggedIn.user.wantsToastNotifications()) {
                return
            }

            if (!post.isNew || post.creatorId == userLoggedIn.userId) {
                return
            }

            val parentPost = post.parentPostId?.let { project.agentService?.getPost(post.streamId, it) }
            val grandparentPost = parentPost?.parentPostId?.let { project.agentService?.getPost(post.streamId, it) }
            val codemark = post.codemark ?: parentPost?.codemark
            val review = post.review ?: parentPost?.review ?: grandparentPost?.review

            val isMentioned = post.mentionedUserIds?.contains(userLoggedIn.userId) ?: false
            val isMutedStream = userLoggedIn.user.preferences?.mutedStreams?.get(post.streamId) == true
            if (isMutedStream && !isMentioned) {
                return
            }

            val isCodemarkVisible = codeStream.isVisible && codemark != null && settings.currentCodemarkId == codemark.id
            val isUserFollowing = codemark?.followerIds.orEmpty().contains(userLoggedIn.userId)
                || review?.followerIds.orEmpty().contains(userLoggedIn.userId)

            if (isUserFollowing && (!isCodemarkVisible || isMentioned)) {
                showNotification(post, codemark, review)
            }
        } catch (err: Error) {
            logger.error(err)
        }
    }

    fun showError(title: String, content: String) {
        val notification = notificationGroup.createNotification(title, null, content, NotificationType.ERROR)
        notification.notify(project)
    }

    private suspend fun showNotification(post: Post, codemark: Codemark?, review: Review?) {
        val session = project.sessionService ?: return
        val sender =
            if (post.creatorId != null)
                session.getUser(post.creatorId)?.username ?: "Someone"
            else "Someone"

        val text = if (post.text.startsWith("/me ")) {
            post.text.replaceFirst("/me", sender)
        } else {
            post.text
        }

        val notification = notificationGroup.createNotification(
            null, sender, text, NotificationType.INFORMATION
        )
        notification.addAction(NotificationAction.createSimple("Open") {
            project.codeStream?.show {
                project.webViewService?.run {
                    if (codemark != null) {
                        postNotification(CodemarkNotifications.Show(codemark.id))
                    } else if (review != null) {
                        postNotification(ReviewNotifications.Show(review.id))
                    }
                    notification.expire()
                }
            }
        })
        notification.notify(project)
    }
}

