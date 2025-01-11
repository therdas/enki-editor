import { Text } from "mdast";
import { taggablePlugin } from 'remark-taggable'
import { Processor } from "unified";
import { Node as unistNode } from "unist";
import { defaultOptions } from "mdast-util-taggable";
import { InlineTaggableNode } from "mdast-util-taggable";
import { MarkExtension } from "prosemirror-unified";
import { Mark, MarkSpec, Schema, Node, DOMOutputSpec } from "prosemirror-model";
import { InputRule } from "prosemirror-inputrules";
import { EditorState, Transaction } from "prosemirror-state";

enum Taggable{
    Tag = 'tag',
    Mention = 'mention',
    Invalid = '',
}

function resolver(str: 'tag' | 'mention' | string): string {
    if(str == 'tag' || str == 'mention')
        return str as Taggable;
    else
        return '' as Taggable;
}

function urlResolver(marker: string, val: string) {
    let type = resolver(typeResolver(marker));
    switch(type) {
        case Taggable.Tag: return `/tags/${val}`
        case Taggable.Mention: return `/user/${val}`
        case Taggable.Invalid: return `/invalid/${val}`;
    }
}

function typeResolver(str: '@' | '#' | string): string {
    if(str == '@') return Taggable.Tag as string
    if(str == '#') return Taggable.Mention as string
    return Taggable.Invalid as string;
}

const opts = defaultOptions

export class TaggableExtension extends MarkExtension<InlineTaggableNode> {
    proseMirrorMarkName(): 'taggable' { return 'taggable' }
    proseMirrorMarkSpec(): MarkSpec {
        return {
            inclusive: false,
            attrs: {
                href: { default: null },
                'efm-taggable-marker': { default: null },
                'efm-taggable-type': { default: null }
            },
            parseDOM: [
                {
                    getAttrs(node: HTMLElement): {
                        url: string | null,
                        marker: string | null,
                        type: string | null
                    } {
                        return {
                            url: node.getAttribute('href'),
                            marker: node.getAttribute('efm-taggable-marker'),
                            type: node.getAttribute('efm-taggable-type'),
                        }
                    },
                    tag: 'a[href]'
                }
            ],
            toDOM(node: Mark): DOMOutputSpec {
                return ['a', node.attrs]
            }
        }
    }
    
    processConvertedUnistNode(convertedNode: Text, originalMark: Mark): InlineTaggableNode {
        return {
            type: this.unistNodeName(),
            value: convertedNode.value.slice(1),
            data: {
                url: originalMark.attrs['href'],
                type: originalMark.attrs['efm-taggable-type'],
                marker: originalMark.attrs['efm-taggable-marker']
            }
        }
    }
    unistNodeName(): "taggable" {
        return 'taggable'
    }
    unistNodeToProseMirrorNodes(
        node: InlineTaggableNode, 
        schema: Schema<string, string>
    ): Array<Node> {
        return [schema.text(node.data.marker+node.value, [schema.marks[this.proseMirrorMarkName()].create({
            href: node.data.url,
            'efm-taggable-marker': node.data.marker,
            'efm-taggable-type': node.data.type,
        })])]
    }

    public override unifiedInitializationHook(processor: Processor<unistNode, unistNode, unistNode, unistNode, string>): 
    Processor<unistNode, unistNode, unistNode, unistNode, string> {
        console.log("what");
        return processor.use(taggablePlugin, opts)
    }
}

