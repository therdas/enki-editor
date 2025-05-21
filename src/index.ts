import { EditorView } from "prosemirror-view"
import { ProseMirrorUnified } from "prosemirror-unified"
import { efmExtension, eGFMExtension, GFMEditableTasklistExtension } from "./enki-custom-schema/syntax-extensions"
import { EditorState } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history, redo, undo } from "prosemirror-history"
import { GFMTableExtension } from "./enki-custom-schema/syntax-extensions"
import { tableEditing, columnResizing, goToNextCell, addRowAfter, addColumnAfter } from "prosemirror-tables"
import { keymap } from "prosemirror-keymap"
import { TableView } from "./enki-custom-schema/syntax-extensions/Table/TableView"
import { data } from "./data"

import { WikiLinkItemExtension } from "./enki-custom-schema/syntax-extensions/wiki-links/wikiLink"
import { TaggableExtension } from "./enki-custom-schema/syntax-extensions/Taggable/taggable"
import autocomplete from 'prosemirror-autocomplete'
import { SuggestionsManager, testAutocompleteOpts } from "./reducers"
import { AutocompleteAction, Options as ACO } from "prosemirror-autocomplete"
import { TextDirectiveExtension, TextDirectiveView, ContainerDirectiveExtension, ContainerDirectiveView, LeafDirectiveExtension, LeafDirectiveView, setFragmentHandler } from './enki-custom-schema/syntax-extensions/directive'
import { DragHandle } from "./enki-custom-schema/plugins/DragHandle"
import { HtmlExtension } from "./enki-custom-schema/syntax-extensions/html/HtmlExtension"
import { isNodeActive, menuPlugin } from "./enki-custom-schema/plugins/floater-menu"
import { toggleMark, wrapIn } from "prosemirror-commands"
import { URLSelector } from "./enki-custom-schema/plugins/floater-menu/url"
import { times } from "lodash"
import { BlockMathExtension, InlineMathExtension } from "./enki-custom-schema/syntax-extensions/math"
import { nullCmd } from "./enki-custom-schema/syntax-extensions/Table/TableCell"

class EnkiEditor {
    public view;
    // private pmu = new ProseMirrorUnified([new MarkdownExtension, new HtmlExtension]);
    private pmu = new ProseMirrorUnified([
        new efmExtension, 
        new eGFMExtension, 
        new GFMTableExtension, 
        new GFMEditableTasklistExtension, 
        new WikiLinkItemExtension, 
        new TaggableExtension, 
        new TextDirectiveExtension, 
        new ContainerDirectiveExtension, 
        new LeafDirectiveExtension,
        new HtmlExtension,
        new InlineMathExtension,
        new BlockMathExtension,
    ]);

    constructor(target: HTMLElement, content: string) {
        const reduc = new SuggestionsManager();
        target.replaceChildren();
        this.view = new EditorView(target, {
            state: EditorState.create({
                doc: this.pmu.parse(content),
                plugins: [
                    ...autocomplete(testAutocompleteOpts as ACO),
                    dropCursor(),
                    gapCursor(),
                    this.pmu.inputRulesPlugin(),
                    this.pmu.keymapPlugin(),
                    history(),

                    columnResizing({ View: TableView }),
                    tableEditing(),
                    keymap({
                        "Tab": goToNextCell(1),
                        "Shift-Tab": goToNextCell(-1),
                        "Mod-z": undo,
                        "Mod-y": redo,
                    }),
                    DragHandle,
                    menuPlugin([
                        {
                            command: toggleMark(this.pmu.schema().marks['strong']),
                            textIcon: 'format_bold',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: toggleMark(this.pmu.schema().marks['em']),
                            textIcon: 'format_italic',
                            cls: ['material-icons'],
                            predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
                        },
                        {
                            command: toggleMark(this.pmu.schema().marks['strikethrough']),
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
                            command: toggleMark(this.pmu.schema().marks['code']),
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
                schema: this.pmu.schema(),
            }),
            nodeViews: {
                "markdown-block-directive": (node, view, getPos) => new ContainerDirectiveView(node, view, getPos),
                "markdown-text-directive": (node, view, getPos) => new TextDirectiveView(node, view, getPos),
                "markdown-leaf-directive": (node, view, getPos) => new LeafDirectiveView(node, view, getPos),
                ...this.pmu.nodeViews(),
            }
        })
    }
}

setFragmentHandler({
    leaf: [
        {
            name: 'youtube',
            func: (args) => {
                const url = args.url;
                const elem = document.createElement('iframe');

                elem.width = "500";
                elem.height = "350";
                elem.title = "YouTube Video Player";
                elem.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                elem.referrerPolicy = "strict-origin-when-cross-origin";
                elem.allowFullscreen = true;
                elem.src = url;

                return [document.createElement('span') as HTMLElement, elem as HTMLElement, document.createElement('span') as HTMLElement];
            }
        }
    ]
})

window.onload = () => {
    let place = document.querySelector("#editor");
    let view: EnkiEditor = new EnkiEditor(<HTMLElement>place, data);
}