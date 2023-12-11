package com.codestream.extensions

import com.intellij.openapi.editor.Document
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.vcs.vfs.ContentRevisionVirtualFile
import com.intellij.openapi.vcs.vfs.VcsVirtualFile
import com.intellij.openapi.vfs.VirtualFile
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.TextDocumentIdentifier

fun Document.lspPosition(offset: Int): Position {
    val line = getLineNumber(offset)
    val lineStart = getLineStartOffset(line)
    val lineTextBeforeOffset = getText(TextRange.create(lineStart, offset))
    val column = lineTextBeforeOffset.length
    return Position(line, column)
}

val Document.uri: String?
    get() {
        val contentRevisionFile = this.file as? ContentRevisionVirtualFile
        return if (contentRevisionFile != null) {
            contentRevisionFile.uri
        } else {
            val file = FileDocumentManager.getInstance().getFile(this)
            file?.uri
        }
    }

val Document.gitSha : String?
    get() = when (val file = this.file) {
        is VcsVirtualFile -> file.fileRevision?.revisionNumber?.toString()
        is ContentRevisionVirtualFile -> file.contentRevision.revisionNumber.toString()
        else -> null
    }

val Document.textDocumentIdentifier: TextDocumentIdentifier?
    get() = uri?.let { TextDocumentIdentifier(uri) }

val Document.file: VirtualFile?
    get() = FileDocumentManager.getInstance().getFile(this)
