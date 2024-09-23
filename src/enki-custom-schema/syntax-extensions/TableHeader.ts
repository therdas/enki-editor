import type { PhrasingContent, TableCell } from "mdast";
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import type { Command } from "prosemirror-state";

import { addColumnAfter, goToNextCell, tableNodes} from "prosemirror-tables";

import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";

import { chainCommands } from "prosemirror-commands";

export class TableHeaderExtension extends NodeExtension<TableCell> {
    public override proseMirrorKeymap (
        proseMirrorSchema: Schema<string, string>,
    ): Record<string, Command> {
        return {
            Tab: goToNextCell(1),
            "Shift-Tab": goToNextCell(-1),
            Enter: chainCommands(goToNextCell(1), addColumnAfter)
        }
    }

    public override proseMirrorNodeName(): string {
        return "table_header";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {

        //TODO This is not the best way to do this. See if there's a better way.
        return tableNodes({
            tableGroup: "block",
            cellContent: "block+",
            cellAttributes: {
                background: {
                    default: null,
                    getFromDOM(dom) {
                        return dom.style.backgroundColor || null;
                    },
                    setDOMAttr(value, attrs) {
                        if(value)
                            attrs.style = (attrs.style || '') + `background-color: ${value}`;
                    },
                },
            },
        }).table_header;
    }

    public override proseMirrorNodeToUnistNodes(_node: ProseMirrorNode, 
        convertedChildren: Array<PhrasingContent>
    ): Array<TableCell> {
        return [{
            type: "tableCell",
            children: convertedChildren
        }]
    }

    public override unistNodeName(): "tableCell" {
        return "tableCell"
    }

    public override unistNodeToProseMirrorNodes(
        node: TableCell, 
        schema: Schema<string, string>, 
        convertedChildren: Array<ProseMirrorNode>, 
        context: Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        return createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren,
        )
    }
}

