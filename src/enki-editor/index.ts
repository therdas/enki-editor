import { ProseMirrorUnified } from "prosemirror-unified";
import { EditorView } from "prosemirror-view";
import { EFMExtension } from "./syntax";
import { EditorState } from "prosemirror-state";
import autocomplete from "prosemirror-autocomplete";
import { DefaultOptions } from "./autocomplete-helpers/reducer"
import { gapCursor } from "prosemirror-gapcursor"
import { history, redo, undo } from "prosemirror-history";
import { dropCursor } from "prosemirror-dropcursor";
import { addColumnAfter, addRowAfter, columnResizing, tableEditing } from "prosemirror-tables";
import { keymap } from "prosemirror-keymap";
import { DragHandle } from "./plugins/drag-handle";
import { menuPlugin } from "./plugins/floater-menu/menu";
import { toggleMark } from "prosemirror-commands";
import { isNodeActive } from "./plugins/floater-menu/utils";
import { URLSelector } from "./plugins/floater-menu/urls";
import { TableView } from "./syntax/table/view";
import { prompterWidget } from "./plugins/prompter";

export class EnkiEditor {
    public view: EditorView
    private parser = new ProseMirrorUnified([new EFMExtension()])
    private autocompleteOptions = DefaultOptions

    destroy() {
        this.view.destroy();
    }

    serialize(): string {
        return this.parser.serialize(this.view.state.doc);
    }

    constructor(target: HTMLElement, document: string) {
        target.replaceChildren();
        this.view = new EditorView(target, {
            state: EditorState.create({
                doc: this.parser.parse(document),
                plugins: [
                    ...autocomplete(this.autocompleteOptions),
                    dropCursor(),
                    gapCursor(),
                    prompterWidget,
                    this.parser.inputRulesPlugin(),
                    this.parser.keymapPlugin(),

                    history(),

                    columnResizing({View: TableView}),
                    tableEditing(),

                    keymap({
                        "Mod-z": undo,
                        "Mod-y": redo,
                    }),

                    DragHandle,

                    menuPlugin([
                         {
                            command: toggleMark(this.parser.schema().marks['strong']),
                            textIcon: 'format_bold',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: toggleMark(this.parser.schema().marks['em']),
                            textIcon: 'format_italic',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: toggleMark(this.parser.schema().marks['strikethrough']),
                            textIcon: 'strikethrough_s',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: URLSelector.openConvertDialog,
                            textIcon: 'link',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: toggleMark(this.parser.schema().marks['code']),
                            textIcon: 'code',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: addRowAfter,
                            textIcon: 'add_row_below',
                            label: 'Add Row',
                            cls: ['material-icons'],
                            predicate: (view) => isNodeActive(view.state, 'table')
                        },
                        {
                            command: addColumnAfter,
                            textIcon: 'add_column_right',
                            label: 'Add Column',
                            cls: ['material-icons'],
                            predicate: (view) => isNodeActive(view.state, 'table')
                        }
                    
                    ])
                ],
                schema: this.parser.schema(),
            }),
            nodeViews: {
                ...this.parser.nodeViews(),
            }
        })
    }
}