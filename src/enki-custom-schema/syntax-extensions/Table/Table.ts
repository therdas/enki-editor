import type { Table, TableContent } from "mdast";
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";

import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";
import { gfmTableFromMarkdown, gfmTableToMarkdown } from "mdast-util-gfm-table";
import { gfmTable } from "micromark-extension-gfm-table";

import { Processor } from "unified";
import { Node } from "unist";
import { buildUnifiedExtension } from "../BuildExtension";

export class TableExtension extends NodeExtension<Table> {
    public override proseMirrorNodeName(): string {
        return "table";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {

        //TODO This is not the best way to do this. See if there's a better way.
        return  {
            content: "table_row+",
            tableRole: "table",
            isolating: true,
            group: "block",
            parseDOM: [{tag: 'table'}],
            toDOM() {
                return ['table', ['tbody', 0]]
            },
            attrs: {align: { default: 'left' } }, 
            // Alignment is set in the following manner -> |align|[align|]*| where align is one of (left|right|center)
            // or of the type align where that is set up as the alignment of all of the columns.
            // When setColumnAlignments is called, an array of aligns -> [align,...] is expected.
        }

    }

    public override proseMirrorNodeToUnistNodes(
        _: ProseMirrorNode, 
        convertedChildren: Array<TableContent>
    ): Array<Table> {
        return [{
            type: "table",
            children: convertedChildren,
        }]
    }

    public override unistNodeName(): "table" {
        return "table"
    }

    public override unistNodeToProseMirrorNodes(
        node: Table, 
        schema: Schema<string, string>, 
        convertedChildren: Array<ProseMirrorNode>, 
        _: Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        return createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren,
            {
                align: `|${node.align?.join('|')}|`
            }
        )
    }

    public override unifiedInitializationHook(
        processor: Processor<Node, Node, Node, Node, string>
    ): Processor<Node, Node, Node, Node, string> {
        return processor.use(
            buildUnifiedExtension(
                [gfmTable()],
                [gfmTableFromMarkdown()],
                [gfmTableToMarkdown()]
            )
        )
    }
}

