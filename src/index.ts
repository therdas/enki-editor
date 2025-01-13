import { EditorView } from "prosemirror-view"
import { ProseMirrorUnified } from "prosemirror-unified"
import { efmExtension, eGFMExtension, GFMEditableTasklistExtension } from "./enki-custom-schema/syntax-extensions"
import { EditorState} from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history, redo, undo } from "prosemirror-history"
import { GFMTableExtension } from "./enki-custom-schema/syntax-extensions"
import { tableEditing, columnResizing, goToNextCell } from "prosemirror-tables"
import { keymap } from "prosemirror-keymap"
import { TableView } from "./enki-custom-schema/syntax-extensions/Table/TableView"

import { data } from "./data"

import "../style.sass"
import { HtmlExtension }  from "./enki-custom-schema/syntax-extensions/Html/HtmlExtension"
import { HtmlEditableView } from "./enki-custom-schema/syntax-extensions/Html/HtmlView"
import { WikiLinkItemExtension } from "./enki-custom-schema/syntax-extensions/wiki-links/wikiLink"
import { TaggableExtension } from "./enki-custom-schema/syntax-extensions/Taggable/taggable"
import autocomplete from 'prosemirror-autocomplete'
import { SuggestionsManager } from "./reducers"
import {AutocompleteAction, Options as ACO} from "prosemirror-autocomplete"
import { TextDirectiveExtension, TextDirectiveView } from "./enki-custom-schema/syntax-extensions/Directive/TextDirectiveExtension"
import { ContainerDirectiveExtension, ContainerDirectiveView } from "./enki-custom-schema/syntax-extensions/Directive/ContainerDirectiveExtension"
import { LeafDirectiveExtension, LeafDirectiveView, registerLeafDirective } from "./enki-custom-schema/syntax-extensions/Directive/LeafDirectiveExtension"
import { DragHandle } from "./enki-custom-schema/plugins/DragHandle"

import applyDevTools from "prosemirror-dev-tools";

const autocompleteOpts = {
    triggers: [
        { name: 'hashtag', trigger: '#' },
        { name: 'mention', trigger: '@' },
        { name: 'dropdown', trigger: '/' },
    ],
    reducer: (arg: AutocompleteAction): boolean => false,
}

class EnkiEditor {
    public view;
    private pmu = new ProseMirrorUnified([new efmExtension, new eGFMExtension, new GFMTableExtension, new HtmlExtension, new GFMEditableTasklistExtension, new WikiLinkItemExtension, new TaggableExtension, new TextDirectiveExtension, new ContainerDirectiveExtension, new LeafDirectiveExtension]);
    // private pmu = new ProseMirrorUnified([new eGFMExtension, new GFMTableExtension, new HtmlExtension, new GFMEditableTasklistExtension, new WikiLinkItemExtension, new TaggableExtension])

    constructor(target: HTMLElement, content: string) {
        const reduc = new SuggestionsManager();
        autocompleteOpts.reducer = reduc.reducer.bind(reduc);
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

                    columnResizing({View: TableView}), 
                    tableEditing(),
                    keymap({
                        "Tab": goToNextCell(1),
                        "Shift-Tab": goToNextCell(-1),
                        "Mod-z": undo,
                        "Mod-y": redo, 
                    }),
                    DragHandle,
                ],
                schema: this.pmu.schema(),
            }),
            nodeViews: {
                html (node, view, getPos) { return new HtmlEditableView(node, view, getPos) },
                "markdown-block-directive": (node, view, getPos) => new ContainerDirectiveView(node, view, getPos),
                "markdown-text-directive": (node, view, getPos) => new TextDirectiveView(node, view, getPos),
                "markdown-leaf-directive": (node, view, getPos) => new LeafDirectiveView(node, view, getPos),
            }
        })

        // applyDevTools(this.view);
    }
}

registerLeafDirective('youtube', (node) => {
        let elem = document.createElement('div');

        let iframe: HTMLIFrameElement = elem.appendChild(document.createElement('iframe'));
        iframe.src = `https://www.youtube.com/embed/${node.attrs.attrs.url.slice(-11)}`

        return elem;
})


window.onload = () => {
    let place = document.querySelector("#editor");
    let view: EnkiEditor = new EnkiEditor(<HTMLElement>place, data);  
}