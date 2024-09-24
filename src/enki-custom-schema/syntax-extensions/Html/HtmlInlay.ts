import type { Html, HtmlData, Text } from "mdast";
import { Decoration, DecorationSource, NodeView } from 'prosemirror-view';
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import { TextExtension } from "prosemirror-remark";
import { TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";


import { createProseMirrorNode, Extension, NodeExtension } from "prosemirror-unified";
import { Processor } from "unified";
import { Node } from "unist";

export class HtmlInlayNodeView implements NodeView {
    dom: HTMLSpanElement;
    contentDOM?: HTMLElement | null | undefined;
    update?: ((node: ProseMirrorNode, decorations: readonly Decoration[], innerDecorations: DecorationSource) => boolean) | undefined;
    selectNode?: (() => void) | undefined;
    deselectNode?: (() => void) | undefined;
    setSelection?: ((anchor: number, head: number, root: Document | ShadowRoot) => void) | undefined;
    stopEvent?: ((event: Event) => boolean) | undefined;
    ignoreMutation?: ((mutation: MutationRecord) => boolean) | undefined;
    destroy?: (() => void) | undefined;
    
}

export class HtmlInlayExtension extends NodeExtension<Html> {
    // public override proseMirrorKeymap (
    //     _: Schema<string, string>,
    // ): Record<string, Command> {
    //     return {

    //     }
    // }

    public override dependencies(): Array<Extension> {
        return [new TextExtension()];
    }

    public override proseMirrorNodeName(): string {
        return "html";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {
        return {
            inline: true,
            marks: '',
            code: true,
            defining: true,
            parseDOM: [{tag: 'abe', attrs: {class: 'prosemirror-html-inlay'} }],
            toDOM(node) {
              console.log("CREATING INLINEHTML ", node)
              return ['em', {class: 'prosemirror-html-inlay'}, 0];
            },

        }
    }

    public override proseMirrorNodeToUnistNodes(_node: ProseMirrorNode, 
        convertedChildren: Array<Text>
    ): Array<Html> {
        return [{
            type: 'html',
            value: convertedChildren.map((child) => child.value).join(''),
        }]
    }

    public override unistNodeName(): "html" {
        return "html"
    }

    public override unistNodeToProseMirrorNodes(
        node: Html, 
        schema: Schema<string, string>, 
        convertedChildren: Array<ProseMirrorNode>, 
        context : Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        console.log("InnerHTML", ":::", node, ":>::",convertedChildren, "CONTEXT",context);
        const res = createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            [schema.text(node.value)],
        )
        return res;
    }
}

