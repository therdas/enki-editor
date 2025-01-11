import { Node as UnistNode } from "unist";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { TextDirective } from "mdast-util-directive"
import { Processor } from "unified";
import remarkDirective from "remark-directive"; 
import { PhrasingContent } from "mdast";
import { EditorView, NodeView } from "prosemirror-view";

export const TextDirectiveMap = new Map<string, (arg: PMNode) => HTMLSpanElement>();

export class TextDirectiveView implements NodeView {
    dom: HTMLElement;
    contentDOM?: HTMLElement | null | undefined;
    pluginDOM?: HTMLElement | undefined;
    header?: HTMLElement;

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('span');
        this.dom.classList.add('md-text-directive', 'plugin');

        this.pluginDOM = TextDirectiveMap.get(node.attrs.name)?.call(null, node) ?? this.createFallback(node);
        this.dom.appendChild(this.pluginDOM);
        this.contentDOM = this.dom.appendChild(document.createElement("span"));
    }

    createFallback(node: PMNode) {
        let res = document.createElement('span');
        let mesg = res.appendChild(document.createElement('span'));
        mesg.textContent = `This view is not handled properly, maybe a plugin is missing?\nType: ${node.attrs.type}, \nValue: ${node.attrs.value}`;
        mesg.contentEditable = 'false'
        return res;
    }
}

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
            marks: "",
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
    
    unistNodeToProseMirrorNodes(node: TextDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>, context: Partial<Record<string, never>>): Array<PMNode> {
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
}