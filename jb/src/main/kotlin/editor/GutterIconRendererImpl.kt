package com.codestream.editor

import com.codestream.codeStream
import com.codestream.extensions.ifNullOrBlank
import com.codestream.extensions.uri
import com.codestream.protocols.agent.DocumentMarker
import com.codestream.protocols.webview.CodemarkNotifications
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

class GutterIconRendererImpl(val editor: Editor, val marker: DocumentMarker) : GutterIconRenderer() {
    val id: String
        get() = marker.id

    override fun isNavigateAction(): Boolean {
        return true
    }

    override fun getClickAction(): AnAction? = object : AnAction() {
        override fun actionPerformed(e: AnActionEvent) {
            val project = editor.project ?: return
            val codemark = marker.codemark ?: return
            project.codeStream?.show {
                project.webViewService?.postNotification(
                    CodemarkNotifications.Show(
                        codemark.id,
                        editor.document.uri
                    )
                )
            }
        }
    }

    override fun getTooltipText(): String? {
        return marker.summary
    }

    override fun getIcon(): Icon {
        val type = marker.type.ifNullOrBlank { "comment" }
        val color = marker.codemark?.color.ifNullOrBlank { "blue" }
        return IconLoader.getIcon("/images/marker-$type-$color.svg")
    }

    override fun equals(other: Any?): Boolean {
        val otherRenderer = other as? GutterIconRendererImpl ?: return false
        return id == otherRenderer.id
    }

    override fun hashCode(): Int {
        return id.hashCode()
    }
}
