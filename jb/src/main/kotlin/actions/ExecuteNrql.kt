package com.codestream.actions

import com.codestream.editorService
import com.codestream.extensions.file
import com.codestream.protocols.webview.NrqlNotifications
import com.codestream.webViewService
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class ExecuteNrql : DumbAwareAction() {
    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = (e.project?.editorService?.activeEditor?.document?.file?.extension?.equals("nrql", true) == true)
    }

    override fun actionPerformed(e: AnActionEvent) {
        val nrql = e.project?.editorService?.activeEditor?.selectionModel?.selectedText
        e.project?.webViewService?.postNotification(NrqlNotifications.Execute(nrql))
    }
}
