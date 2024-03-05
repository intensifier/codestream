package com.codestream.language;

import com.intellij.psi.tree.IElementType;

public interface NrqlTypes {
    public IElementType OPERATOR = new NrqlTokenType("OPERATOR");
    public IElementType ATTRIBUTE_NAME = new NrqlTokenType("ATTRIBUTE_NAME");
    public IElementType NUMBER = new NrqlTokenType("NUMBER");
    public IElementType SINGLE_QUOTED_STRING = new NrqlTokenType("SINGLE_QUOTED_STRING");
    public IElementType COMMENT = new NrqlTokenType("COMMENT");
    public IElementType KEYWORD = new NrqlTokenType("KEYWORD");
    public IElementType PREPROCESSOR = new NrqlTokenType("PREPROCESSOR");
    public IElementType FUNCTION = new NrqlTokenType("FUNCTION");
    public IElementType DOUBLE_QUOTED_STRING = new NrqlTokenType("DOUBLE_QUOTED_STRING");
}
