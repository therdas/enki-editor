'use client';

import { Node as PMNode, Schema } from "prosemirror-model";
import { type CompletionValues } from "./reducer";

/*
    We could have relied on the default create behaviour of node by passing the names, but some nodes need special
    care. For example, take tables. In this case, we define custom behaviour by defining custom names.
*/


export const NodeTypes: CompletionValues = {
    keys: [
        ['Paragraph', 'paragraph'],
        ['Blockquote', 'blockquote'],
        ['>', 'blockquote'],
        ['Code', 'code_block'],
        ['`', 'code_block'],
        ['``', 'code_block'],
        ['```', 'code_block'],
        ['Heading 1', 'heading1'],
        ['Heading 2', 'heading2'],
        ['Heading 3', 'heading3'],
        ['Heading 4', 'heading4'],
        ['#', 'heading1'],
        ['##', 'heading2'],
        ['###', 'heading3'],
        ['####', 'heading4'],
        ['#####', 'heading5'],
        ['######', 'heading6'],
        ['Table', 'table'],
        ['To Do', 'task_list_item'],
        ['Bulleted List', 'bullet_list'],
        ['Ordered List', 'ordered_list'],
        ['HTML', 'html'],
    ],
    values: 'key',
}

export const canonicals: [string, string][] = [
    ['Paragraph', 'paragraph'],
    ['Blockquote', 'blockquote'],
    ['Code', 'code_block'],
    ['Heading 1', 'heading1'],
    ['Heading 2', 'heading2'],
    ['Heading 3', 'heading3'],
    ['Heading 4', 'heading4'],
    ['Table', 'table'],
    ['To Do', 'task_list_item'],
    ['Bulleted List', 'bullet_list'],
    ['Numbered List', 'ordered_list'],
    ['Raw HTML', 'html'],
]

export const descriptions: [string, string][] = [
    ['paragraph', '↵↵'],
    ['blockquote', '>'],
    ['code', '```'],
    ['heading1', '#'],
    ['heading2', '##'],
    ['heading3', '###'],
    ['heading4', '####'],
    ['task_list_item', '- []'],
    ['bullet_list', '-'],
    ['numbered list', '1.']
]

export function makeNode(type: string, schema: Schema): [PMNode, number, number] | undefined {
    if (type.slice(0, -1) === 'heading') {
        const heading_level = Number.parseInt(type.slice(-1));
        const node_type = schema.nodes[type.slice(0, -1)];
        return [
            node_type.create(
                { level: heading_level },
                schema.text(' ')
            ),
            0, 0
        ]
    } else if (type === 'table') {
        const node_type = schema.nodes['table'];
        let ret = [
            node_type.create(
                {},
                [
                    schema.nodes['table_row'].create(
                        {},
                        [
                            schema.nodes['table_cell'].create({}, schema.nodes['paragraph'].create({}, schema.text(' '))),
                            schema.nodes['table_cell'].create({}, schema.nodes['paragraph'].create({}, schema.text(' ')))
                        ]
                    ),
                    schema.nodes['table_row'].create(
                        {},
                        [
                            schema.nodes['table_cell'].create({}, schema.nodes['paragraph'].create({}, schema.text(' '))),
                            schema.nodes['table_cell'].create({}, schema.nodes['paragraph'].create({}, schema.text(' ')))
                        ]
                    )
                ]
            ),
            0, 0
        ] as [PMNode, number, number]
        return ret;
    } else if (type === 'blockquote') {
        const node_type = schema.nodes['blockquote'];
        return [
            node_type.create(
                {},
                [
                    schema.nodes['paragraph'].create({}, schema.text(' ')),
                ]
            ),
            2, 0
        ]
    } else if (type === 'paragraph') {
        return [
            schema.nodes['paragraph'].create({}, schema.text(' ')),
            0, 0
        ]
    } else if (type === 'code_block') {
        return [
            schema.nodes['code_block'].create({}, schema.text(' ')),
            0, 0
        ]
    } else if (type === 'task_list_item') {
        return [
            schema.nodes['bullet_list'].create({},
                [
                    schema.nodes['task_list_item'].create({},
                        [
                            schema.nodes['paragraph'].create({}, schema.text(' '))
                        ]
                    )
                ]
            ),
            1, 0
        ]
    } else if (type === 'bullet_list') {
        return [
            schema.nodes['bullet_list'].create({},
                [
                    schema.nodes['regular_list_item'].create({},
                        [
                            schema.nodes['paragraph'].create({}, schema.text(' '))
                        ]
                    )
                ]
            ),
            3, 0
        ]
    } else if (type === 'ordered_list') {
        return [
            schema.nodes['ordered_list'].create({},
                [
                    schema.nodes['regular_list_item'].create({},
                        [
                            schema.nodes['paragraph'].create({}, schema.text(' '))
                        ]
                    )
                ]
            ),
            3, 0
        ]
    } else if (type === 'html') {
        return [
            schema.nodes['html'].create({},
                [
                    schema.nodes['paragraph'].create({}, schema.text('Enter HTML code here!'))
                ]
            ),
            0, 0
        ]
    }
}