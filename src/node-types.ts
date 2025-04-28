import { isTypedArray } from "lodash";
import { Node as PMNode, Schema } from "prosemirror-model";

/*
    We could have relied on the default create behaviour of node by passing the names, but some nodes need special
    care. For example, take tables. In this case, we define custom behaviour by defining custom names.
*/

export function nodeTypes(): [string, string, string][] {
    return [
        // Format:
        // Display Name, type, markdown shorthand
        ['Paragraph', '↵↵', 'paragraph'],
        ['Blockquote', '>', 'blockquote'],
        ['Code', '```', 'code_block'],
        ['Heading 1', '#', 'heading1'],
        ['Heading 2', '##', 'heading2'],
        ['Heading 3', '###', 'heading3'],
        ['Heading 4', '####', 'heading4'],
        ['Heading 5', '#####', 'heading5'],
        ['Heading 6', '######', 'heading6'],
        ['Table', '|---|', 'table'],
        ['To Do', '- []', 'task_list_item'],
        ['Bulleted List', '- ', 'ulist'],
        ['Numbered List', '1. ', 'olist'],
        ['Raw HTML', '', 'html'],
    ]
}

function rationalizeName(name: string): string {
    return ["", ...name.split('_').flatMap(val => val.split('-'))].reduce((prev, cur) =>  prev + " " + cur.slice(0,1).toUpperCase() + cur.slice(1) );
}



export function makeNode(type: string, schema: Schema): [PMNode, number, number] | undefined {

    const node_type = schema.nodes[type];
    if(!node_type) {
        if (type.slice(0, -1) === 'heading') {
            const heading_level = Number.parseInt(type.slice(-1));
            const node_type = schema.nodes[type.slice(0, -1)];
            return [
                node_type.create(
                    { level: heading_level },
                    schema.text(' ')
                ),
                0,0
            ]
        } else {
            console.log("Undefined node ?", type)
        }
    } else {
        return [
            node_type.create(
                null,
                schema.text(' ')
            ),
            0, 0
        ]
    }
}