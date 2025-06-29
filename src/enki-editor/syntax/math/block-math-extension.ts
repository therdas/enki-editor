import type { Text } from "mdast";
import { NodeExtension } from "prosemirror-unified";
import type  { Math } from "mdast-util-math"
import { Mark, Schema, Node as PMNode, type  DOMOutputSpec, type  NodeSpec } from "prosemirror-model";
import type {  Node } from "unist";
import type {  Processor } from "unified";
import remarkMath from "remark-math";
import type { NodeViewConstructor } from "prosemirror-view";
import { InputRule } from "prosemirror-inputrules";
import { Transaction } from "prosemirror-state";
import { MathViewExtension } from "./view";

export class BlockMathExtension extends NodeExtension<Math> {
    proseMirrorInputRules(_: Schema<string, string>): Array<InputRule> {
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

    unistNodeToProseMirrorNodes(node: Math, schema: Schema<string, string>, _: Array<PMNode>, __: Partial<Record<string, never>>): Array<PMNode> {
        let retnode = schema.nodes[this.proseMirrorNodeName()].createAndFill(null, schema.text(node.value));
        return retnode == null ? [] : [retnode];
    }

    proseMirrorNodeToUnistNodes(node: PMNode, _: Array<Node>): Math[] {
        return [
            {
                type: 'math',
                value: node.textContent,
            }
        ]
    }
    processConvertedUnistNode(convertedNode: Text, _: Mark): Math {
        return {
            type: 'math',
            value: convertedNode.value
        }
    }

    proseMirrorNodeName(): 'math' {
        return 'math'
    }

    proseMirrorNodeSpec(): NodeSpec {
        return {
            content: "text*",
            group: "block",
            inline: false,
            code: true,
            atom: true,
            marks: '',
            toDOM(_: PMNode): DOMOutputSpec {
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
    unistNodeName(): "math" {
        return "math"
    }
    
    
    unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkMath);
    }

    proseMirrorNodeView(): NodeViewConstructor | null {
        return (node, view, getPos) => new MathViewExtension(node, view, getPos);
    }
}