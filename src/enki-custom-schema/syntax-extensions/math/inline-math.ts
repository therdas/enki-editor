import { Text } from "mdast";
import { NodeExtension } from "prosemirror-unified";
import { InlineMath } from "mdast-util-math"
import { Mark, Schema, Node as PMNode, DOMOutputSpec, NodeSpec } from "prosemirror-model";
import { Node } from "unist";
import { Processor } from "unified";
import remarkMath from "remark-math";
import { NodeViewConstructor } from "prosemirror-view";
import { InputRule } from "prosemirror-inputrules";
import { Transaction } from "prosemirror-state";
import { MathViewExtension } from "./view";

export class InlineMathExtension extends NodeExtension<InlineMath> {
    proseMirrorInputRules(proseMirrorSchema: Schema<string, string>): Array<InputRule> {
        return [
            new InputRule(
                /\$\$[^\$]*\$\$/,
                (state, match, start, end): Transaction => {
                    return state.tr.replaceRangeWith(
                        start, 
                        end,
                        state.schema.nodes['inline-math'].createAndFill(null, state.schema.text(match[0].slice(2, -2))) 
                            ?? state.schema.text(match[0].slice(2, -2))
                    ) 
                }
            )
        ]
    }

    unistNodeToProseMirrorNodes(node: InlineMath, schema: Schema<string, string>, convertedChildren: Array<PMNode>, context: Partial<Record<string, never>>): Array<PMNode> {
        let retnode = schema.nodes[this.proseMirrorNodeName()].createAndFill(null, schema.text(node.value));
        console.log(retnode)
        return retnode == null ? [] : [retnode];
    }

    proseMirrorNodeToUnistNodes(node: PMNode, convertedChildren: Array<Node>): InlineMath[] {
        return [
            {
                type: 'inlineMath',
                value: node.textContent,
            }
        ]
    }
    processConvertedUnistNode(convertedNode: Text, originalMark: Mark): InlineMath {
        return {
            type: 'inlineMath',
            value: convertedNode.value
        }
    }

    proseMirrorNodeName(): 'inline-math' {
        return 'inline-math'
    }

    proseMirrorNodeSpec(): NodeSpec {
        return {
            content: "text*",
            group: "inline",
            inline: true,
            code: true,
            atom: true,
            marks: '',
            toDOM(node: PMNode): DOMOutputSpec {
                return ["pre", 0]
            },
            parseDOM: [
                {
                    tag: 'pre',
                    getAttrs(dom: HTMLElement): {
                        class: string | null
                    } {
                        return {
                            class: (dom as HTMLElement).getAttribute('class'),
                        }
                    }
                }
            ]
        }
    }
    unistNodeName(): "inlineMath" {
        return "inlineMath"
    }
    
    
    unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkMath);
    }

    proseMirrorNodeView(): NodeViewConstructor | null {
        return (node, view, getPos) => new MathViewExtension(node, view, getPos);
    }
}