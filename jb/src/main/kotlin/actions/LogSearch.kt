package com.codestream.actions

import com.codestream.editorService
import com.codestream.protocols.webview.LogsNotifications
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class LogSearch: DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val query = e.project?.editorService?.activeEditor?.selectionModel?.selectedText
        e.project?.webViewService?.postNotification(LogsNotifications.Search(query))
    }
}
