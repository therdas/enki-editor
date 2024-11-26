//@ts-ignore
import { syntax as wikiLinkMicromarkExtension } from "micromark-extension-wiki-link"
import { fromMarkdown, toMarkdown } from "mdast-util-wiki-link"
import { wikiLinkPlugin } from "remark-wiki-link"
import { createProseMirrorNode, Extension, MarkExtension, NodeExtension } from "prosemirror-unified"
import { Data, Node as uNode, Position } from "unist"
import { Parent, PhrasingContent, Resource, TableCell, Text } from "mdast"
import { NodeSpec, Schema, Mark, Node, DOMOutputSpec, Attrs, ContentMatch, Fragment, MarkType, NodeType, ResolvedPos, Slice, MarkSpec } from "prosemirror-model"
import { Processor } from "unified"
import { buildUnifiedExtension } from "../BuildExtension"
import { Decoration, DecorationSource, EditorView, NodeView } from "prosemirror-view"
import { TextExtension } from "prosemirror-remark"

export class LinkView implements NodeView {
    dom: HTMLAnchorElement

    constructor(public node: Node, outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('a');
        this.dom.classList.add('inner-link')
        this.dom.href = node.attrs['href']
        this.dom.textContent = node.attrs['title']
    }
}

export interface WikiLink extends Parent, Resource {
    type: "wikiLink",
    data: {
        alias: string,
        permalink: string,
        exists: boolean,
        hName: 'a',
        hProperties: {
            className: string,
            href: string
        },
        hchildren: Text[],
    }
}

export class WikiLinkItemExtension extends NodeExtension<
WikiLink,
Record<"wiki_link", unknown>
> {

    public override dependencies(): Array<Extension> {
        return [
            new TextExtension()
        ]
    }

    proseMirrorNodeToUnistNodes(node: Node, convertedChildren: Array<uNode>): WikiLink[] {
        throw new Error("Method not implemented.")
    }

    proseMirrorNodeName(): 'wikilink' {
        return 'wikilink'
    }

    proseMirrorNodeSpec(): NodeSpec {
        return {
            group: 'inline',
            content: 'text*',
            inline: true,
            atom: true,
            marks: '',
            code: true,
            defining: true,
            attrs: { href: {default: null}, title: { default: null }},
            parseDOM: [
                {
                    tag: 'a[href]',
                    getAttrs(dom: HTMLElement): {
                        href: string | null,
                        title: string | null
                    } {
                        return {
                            href: (dom as HTMLElement).getAttribute("href"),
                            title: (dom as HTMLElement).getAttribute("title")
                        }
                    },
                },
            ],
            toDOM(node: Node): DOMOutputSpec {
                return ["a", node.attrs, 0];
            },
        }
    }

    unistNodeName(): 'wikiLink' {
        return 'wikiLink'
    }

    public override unistNodeToProseMirrorNodes(
        node: WikiLink,
        proseMirrorSchema: Schema<string, string>,
        convertedChildren: Array<Node>,
    ): Array<Node> {  
        console.log("NODE: ", node, convertedChildren);  
        const ret = createProseMirrorNode(this.proseMirrorNodeName(), proseMirrorSchema, [], {
            href: node.data.permalink,
            title: node.data.alias
        })
        console.log("RET: ", ret);
        return ret;
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