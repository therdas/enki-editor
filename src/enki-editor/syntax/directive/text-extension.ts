import type { Node as UnistNode } from "unist";
import type { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import type { TextDirective } from "mdast-util-directive"
import type { Processor } from "unified";
import remarkDirective from "remark-directive";
import type { PhrasingContent } from "mdast";
import type { NodeViewConstructor } from "prosemirror-view";
import { DirectiveView } from "./view";

export class TextDirectiveExtension extends NodeExtension 
<TextDirective> {
    proseMirrorNodeName(): 'markdown-text-directive' {
        return 'markdown-text-directive';
    }
    unistNodeName(): "textDirective" {
        return "textDirective";
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            attrs: {
                name: { default: null },
                type: { default: null },
                attrs: { default: null }
            },
            content: "inline*",
            group: "inline",
            inline: true,
            toDOM: (node: PMNode) => [ "fragment", { 
                "data-name": node.attrs.name,
                "data-type": node.attrs.type,
                "data-attrs": node.attrs.attrs,
            }, 0],
            parseDOM: [
                {
                    getAttrs(dom) {
                        return {
                            "data-name": dom.getAttribute("data-name"),
                            "data-type": dom.getAttribute("data-type"),
                            "data-attrs": dom.getAttribute("data-attrs"),
                        }
                    },
                    tag: "fragment"
                }, 
            ]
        }
    }
    proseMirrorNodeToUnistNodes(node: PMNode, convertedChildren: Array<UnistNode>): TextDirective[] {
        return [
            {
                type: node.attrs.type,
                name: node.attrs.name,
                attributes: node.attrs.attrs,
                children: convertedChildren as PhrasingContent[],
            }
        ]
    }
    
    unistNodeToProseMirrorNodes(node: TextDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>, _: Partial<Record<string, never>>): Array<PMNode> {
        let res = schema.nodes[this.proseMirrorNodeName()].createAndFill(
            {
                name: node.name,
                type: node.type,
                attrs: node.attributes, 
            }, 
            convertedChildren
        )
        return res ? [res] : [];
    }

    unifiedInitializationHook(processor: Processor<UnistNode, UnistNode, UnistNode, UnistNode, string>): Processor<UnistNode, UnistNode, UnistNode, UnistNode, string> {
        return processor.use(remarkDirective);
    }

    proseMirrorNodeView(): NodeViewConstructor  {
            return (node, view, getPos) => new DirectiveView(node, view, getPos); 
        }
}