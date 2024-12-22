//@ts-ignore
import { syntax as wikiLinkMicromarkExtension } from "micromark-extension-wiki-link"
import { fromMarkdown, toMarkdown } from "mdast-util-wiki-link"
import { Extension, MarkExtension } from "prosemirror-unified"
import { Node as uNode } from "unist"
import { Schema, Node, DOMOutputSpec, Mark, MarkSpec } from "prosemirror-model"
import { Processor } from "unified"
import { buildUnifiedExtension } from "../BuildExtension"
import { EditorView, NodeView } from "prosemirror-view"
import { TextExtension } from "prosemirror-remark"
import { InputRule, wrappingInputRule } from "prosemirror-inputrules"
import { Text } from "mdast"
import { Command, EditorState, Transaction } from "prosemirror-state"

export interface WikiLink extends uNode {
    type: "wikiLink",
    data: {
        alias: string,
        permalink: string,
    }
}

export function resolve(arg: string) {
    return `/pages/${arg}`;
}

export class WikiLinkItemExtension extends MarkExtension<WikiLink> {
    public override proseMirrorInputRules(proseMirrorSchema: Schema<string, string>): Array<InputRule> {
        return [
            new InputRule(
                /\[\[[^\[\]]*\]\]$/,
                (state, match, start, end): Transaction => {
                    let alias = '';
                    let url = '';
                    if(match[0].indexOf('|') !== -1) {
                        match[0].split('|')
                    }
                    return state.tr.replaceWith(start, end, 
                        state.schema.text(
                            match[0].slice(2, -2),
                            [
                                state.schema.marks[this.proseMirrorMarkName()].create({
                                    href: resolve(match[0].slice(2, -2)),
                                })
                            ]
                        )
                    )
                }
            )
        ]
    }

    public proseMirrorKeymap(proseMirrorSchema: Schema<string, string>): Record<string, Command> {
        return {
            'Backspace': (state, dispatch) => {
                const mark = state.doc.resolve(state.selection.head - 1)
                    .marks()
                    .filter((mark) => mark.type.name === this.proseMirrorMarkName())[0]
                
                if(!mark)
                    return false;

                const type = mark.type.name;

                if(type !== this.proseMirrorMarkName())
                    return false;

                let $start = state.doc.resolve(state.selection.head - 1);
                let endIdx = $start.indexAfter();
                let startIdx = $start.index();


                while(
                       startIdx > 0 && 
                       mark.isInSet($start.parent.child(startIdx - 1).marks)
                ) startIdx--;
                while (
                    endIdx < $start.parent.childCount &&
                    mark.isInSet($start.parent.child(endIdx).marks)
                ) endIdx++;

                let startPos = $start.start(), endPos = startPos;
                for (let i = 0; i < endIdx; i++) {
                    let size = $start.parent.child(i).nodeSize
                    if(i < startIdx) startPos += size
                        endPos += size
                }

                // We have start and endpos now lets do the thang
                const text = state.doc.textBetween(startPos, endPos);
                if(dispatch){
                    let url = mark.attrs.href;
                    let alias = text;
                    if(alias == url)
                        dispatch(state.tr.replaceWith(startPos, endPos, state.schema.text(`[[${url}]`)));
                    else
                    dispatch(state.tr.replaceWith(startPos, endPos, state.schema.text(`[[${url} : alias]`)));
                    return true;
                }

                return false;
            }
        }
    }

    public override dependencies(): Array<Extension> {
        return [
            new TextExtension()
        ]
    }

    processConvertedUnistNode(convertedNode: Text, originalMark: Mark): WikiLink {
        return {
            type: "wikiLink",
            data: {
                alias: convertedNode.value,
                permalink: originalMark.attrs.href,
            }
        }
    }

    proseMirrorMarkName(): 'wikilink' {
        return 'wikilink'
    }

    proseMirrorMarkSpec(): MarkSpec {
        return {
            attrs: { 
                href: {default: null}, 
                class: { default: 'inline-link' }
            },
            parseDOM: [
                {
                    tag: 'a[href]',
                    getAttrs(dom: HTMLElement): {
                        href: string | null,
                    } {
                        return {
                            href: (dom as HTMLElement).getAttribute("href"),
                        }
                    },
                },
            ],
            toDOM(mark: Mark): DOMOutputSpec {
                return ["a", mark.attrs, 0];
            },
        }
    }

    unistNodeName(): 'wikiLink' {
        return 'wikiLink'
    }

    public override unistNodeToProseMirrorNodes(
        node: WikiLink,
        schema: Schema<string, string>,
    ): Array<Node> {  
        return [
            schema.text(
                node.data.alias,
                [
                    schema.marks[this.proseMirrorMarkName()].create({
                        href: node.data.permalink,
                    })
                ]
            )
        ]
    }

    unifiedInitializationHook(processor: Processor<uNode, uNode, uNode, uNode, string>): Processor<uNode, uNode, uNode, uNode, string> {
        return processor.use(
            buildUnifiedExtension(
                [wikiLinkMicromarkExtension()],
                [fromMarkdown()],
                //@ts-ignore
                [toMarkdown()],
            )
        )
    }
}