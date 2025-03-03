import { Node as PMNode, Schema } from "prosemirror-model";
import { EditorView } from "prosemirror-view";

export function nodeTypes(): [string, string, string][] {
    return [
        // Format:
        // Display Name, type, markdown shorthand
        ['paragraph', 'paragraph', '↵↵'],
        ['blockquote', 'blockquote', '>'],
        ['code block', 'code_block', '```'],
        ['heading 1', 'heading_1', '#'],
        ['heading 2', 'heading_2', '##'],
        ['heading 3', 'heading_3', '###'],
        ['table', 'table', '|---|'],
        ['to-do', 'task_list_item', '- []'],
    ]
}

export function makeNode(type: string, schema: Schema): [PMNode, number, number] | undefined {
    try {
        if (type == 'task_list_item') {
            const node_type = schema.nodes[type];
            return [
                node_type.create(
                    { checked: false },
                    schema.nodes['paragraph'].create(
                        null,
                        schema.text("To-do")
                    )
                ),
                1, 5
            ]
        } else if (type.slice(0, -2) === 'heading') {
            console.log("Got heading?")
            const heading_level = Number.parseInt(type.slice(-1));
            const node_type = schema.nodes[type.slice(0, -2)];
            return [
                node_type.create(
                    { level: heading_level },
                    schema.text('Heading')
                ),
                0,0
            ]
        }
    } catch (err) {
        console.error("Caught error", err, "while trying to create element from dropdown")
        return;
    }
}