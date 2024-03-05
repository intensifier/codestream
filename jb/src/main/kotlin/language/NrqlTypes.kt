package com.codestream.language

public class NrqlTypesz {
    public companion object {
        public val OPERATOR = NrqlTokenType("OPERATOR")
        val ATTRIBUTE_NAME = NrqlTokenType("ATTRIBUTE_NAME")
        val SINGLE_QUOTED_STRING = NrqlTokenType("SINGLE_QUOTED_STRING")
        val COMMENT = NrqlTokenType("COMMENT")
        val KEYWORD = NrqlTokenType("KEYWORD")
        val PREPROCESSOR = NrqlTokenType("PREPROCESSOR")
        val FUNCTION = NrqlTokenType("FUNCTION")
        val DOUBLE_QUOTED_STRING = NrqlTokenType("DOUBLE_QUOTED_STRING")
    }
}
