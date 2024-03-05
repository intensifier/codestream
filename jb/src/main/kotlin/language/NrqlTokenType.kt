package com.codestream.language

import com.intellij.psi.tree.IElementType

class NrqlTokenType(debugName: String) : IElementType(debugName, NrqlLanguage.INSTANCE) {
    override fun toString(): String = "NrqlTokenType." + super.toString()
}
