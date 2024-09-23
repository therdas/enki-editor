// Adapted/Copied from revin/markdown-it-task-lists and adapted for enki
// https://github.com/revin/markdown-it-task-lists/blob/master/index.js

import MarkdownIt from "markdown-it/index.js";
import Token from "markdown-it/lib/token.mjs";

export function todoItemList(md: MarkdownIt, options: any) {
    if(options) {

    }

    md.core.ruler.after('inline', 'gfm-enm-task-lists', function(state) {
        let tokens = state.tokens;
        for(let i = 2; i < tokens.length; ++i) {
            if(isTLItem(tokens, i)) {
                convertToTLItem(tokens[i], state.Token);
                attrSet
            }
        }
    })
}

function convertToTLItem(token: Token, Constructor: typeof Token) {
    
}

function isInline(token: Token)    { return token.type === 'inline'; }
function isParagraph(token: Token) { return token.type === 'paragraph_open'; }
function isListItem(token: Token)  { return token.type === 'list_item_open'; }

function isTLItem(tokens: Token[], index: number): boolean {
    return isInline(tokens[index]) &&
           isParagraph(tokens[index]) &&
           isListItem(tokens[index - 2]) &&
	       startsWithTodoMarkdown(tokens[index]);
}

function startsWithTodoMarkdown(token: Token) {
    // leading whitespace in a list item is already trimmed off by markdown-it
    return token.content.indexOf('[ ] ') === 0 || token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0;
}

function attrSet(token: Token, name: string, value: string) {
	var index = token.attrIndex(name);
	var attr: [string, string] = [name, value];

	if (index < 0) {
		token.attrPush(attr);
	} else if(token.attrs) {
        //Fail if token.attrs is null.
		token.attrs[index] = attr;
	}
}