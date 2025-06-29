import type { Node as UnistNode } from "unist";
import type { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import type { ContainerDirective } from "mdast-util-directive"
import type { Processor } from "unified";
import remarkDirective from "remark-directive";
import type { BlockContent } from "mdast";
import type { NodeViewConstructor } from "prosemirror-view";
import { DirectiveView } from "./view";

export class ContainerDirectiveExtension extends NodeExtension
    <ContainerDirective> {
    proseMirrorNodeName(): 'markdown-block-directive' {
        return 'markdown-block-directive';
    }
    unistNodeName(): "containerDirective" {
        return "containerDirective";
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            attrs: {
                name: { default: null },
                type: { default: null },
                attrs: { default: null },
                value: { default: null }
            },
            content: "block block*",
            group: "block",
            inline: false,
            marks: "",
            toDOM: (node: PMNode) => ["fragment", {
                "data-name": node.attrs.name,
                "data-type": node.attrs.type,
                "data-attrs": node.attrs.attrs,
                "data-value": node.attrs.value,
            }, 0],
            parseDOM: [
                {
                    getAttrs(dom) {
                        return {
                            "data-name": dom.getAttribute("data-name"),
                            "data-type": dom.getAttribute("data-type"),
                            "data-attrs": dom.getAttribute("data-attrs"),
                            "data-value": dom.getAttribute("data-value"),
                        }
                    },
                    tag: "fragment"
                },
            ]
        }
    }
    proseMirrorNodeToUnistNodes(node: PMNode, convertedChildren: Array<UnistNode>): ContainerDirective[] {
        return [
            {
                type: node.attrs.type,
                name: node.attrs.name,
                attributes: node.attrs.attrs,
                children: convertedChildren as BlockContent[],
            }
        ]
    }

    unistNodeToProseMirrorNodes(node: ContainerDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>): Array<PMNode> {
        let res = schema.nodes[this.proseMirrorNodeName()].createAndFill(
            {
                name: node.name,
                type: node.type,
                attrs: node.attributes,
            },
            convertedChildren,
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