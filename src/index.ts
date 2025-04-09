import { EditorView } from "prosemirror-view"
import { ProseMirrorUnified } from "prosemirror-unified"
import { efmExtension, eGFMExtension, GFMEditableTasklistExtension } from "./enki-custom-schema/syntax-extensions"
import { EditorState } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history, redo, undo } from "prosemirror-history"
import { GFMTableExtension } from "./enki-custom-schema/syntax-extensions"
import { tableEditing, columnResizing, goToNextCell } from "prosemirror-tables"
import { keymap } from "prosemirror-keymap"
import { TableView } from "./enki-custom-schema/syntax-extensions/Table/TableView"
import { data } from "./data"

import "../style.sass"
import "../style/index.scss"
import { WikiLinkItemExtension } from "./enki-custom-schema/syntax-extensions/wiki-links/wikiLink"
import { TaggableExtension } from "./enki-custom-schema/syntax-extensions/Taggable/taggable"
import autocomplete from 'prosemirror-autocomplete'
import { SuggestionsManager } from "./reducers"
import { AutocompleteAction, Options as ACO } from "prosemirror-autocomplete"
import { TextDirectiveExtension, TextDirectiveView, ContainerDirectiveExtension, ContainerDirectiveView, LeafDirectiveExtension, LeafDirectiveView, setFragmentHandler } from './enki-custom-schema/syntax-extensions/directive'
import { DragHandle } from "./enki-custom-schema/plugins/DragHandle"
import { Schema } from "prosemirror-model"
import { makeNodes } from "./node-types"
import { HtmlExtension } from "./enki-custom-schema/syntax-extensions/html/HtmlExtension"
import { selectionSizePlugin } from "./enki-custom-schema/syntax-extensions/Table/TableNiceEditor"
import { menuBar } from "./enki-custom-schema/syntax-extensions/menu"
import { update } from "lodash"


const autocompleteOpts = {
    triggers: [
        { name: 'hashtag', trigger: '#' },
        { name: 'mention', trigger: '@' },
        { name: 'inserter', trigger: '/' },
    ],
    reducer: (arg: AutocompleteAction): boolean => false,
}

function buildTypeInfo(schema: Schema) {
    for (let scheme in schema.nodes) {
        console.log(`${scheme}: ${schema.nodes[scheme]}`)
    }
}
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
        new HtmlExtension
    ]);

    constructor(target: HTMLElement, content: string) {
        const reduc = new SuggestionsManager();
        autocompleteOpts.reducer = reduc.reducer.bind(reduc);
        buildTypeInfo(this.pmu.schema())
        target.replaceChildren();
        this.view = new EditorView(target, {
            state: EditorState.create({
                doc: this.pmu.parse(content),
                plugins: [
                    ...autocomplete(autocompleteOpts as ACO),
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
                    selectionSizePlugin
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

        makeNodes(this.pmu.schema());
        // applyDevTools(this.view);
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