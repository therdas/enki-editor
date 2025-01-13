import { redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
    Node,
    Node as ProseMirrorNode,
} from "prosemirror-model";
import { EditorState, Selection, Transaction } from "prosemirror-state";
import { EditorView, NodeView } from "prosemirror-view";

import { EditorView as CodeMirror, KeyBinding, ViewPlugin, ViewUpdate, keymap as cmKeymap, drawSelection } from '@codemirror/view';
import { html } from "@codemirror/lang-html"
import { defaultKeymap } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"

import { exitCode } from "prosemirror-commands"

import { schema } from "prosemirror-schema-basic"
import { TextSelection } from "prosemirror-state";

export class HtmlEditableView implements NodeView {
    dom: HTMLElement;
    codeMirror: CodeMirror;
    tagName: string | undefined;
    updating: boolean;

    constructor(public node: ProseMirrorNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.codeMirror = new CodeMirror({
            doc: this.node.textContent,
            extensions: [
                cmKeymap.of([
                    ...this.codeMirrorKeymap(),
                    ...defaultKeymap
                ]),
                drawSelection(),
                syntaxHighlighting(defaultHighlightStyle),
                html(),
                CodeMirror.updateListener.of(update => this.forwardUpdate(update)),
                HtmlRenderPlugin
            ],
            
        })

        this.dom = this.codeMirror.dom;
        this.updating = false;
    }

    forwardUpdate(update: ViewUpdate) {
        if (this.updating || !this.codeMirror.hasFocus) return
        let offset = this.getPos()! + 1, { main } = update.state.selection
        let selFrom = offset + main.from, selTo = offset + main.to
        let pmSel = this.outerView.state.selection
        if (update.docChanged || pmSel.from != selFrom || pmSel.to != selTo) {
            let tr = this.outerView.state.tr
            update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
                if (text.length)
                    tr.replaceWith(offset + fromA, offset + toA,
                        schema.text(text.toString()))
                else
                    tr.delete(offset + fromA, offset + toA)
                offset += (toB - fromB) - (toA - fromA)
            })
            tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo))
            this.outerView.dispatch(tr)
        }
    }

    setSelection(anchor: number, head: number) {
        this.codeMirror.focus()
        this.updating = true
        this.codeMirror.dispatch({ selection: { anchor, head } })
        this.updating = false
    }

    codeMirrorKeymap(): KeyBinding[] {
        let view = this.outerView
        return [
            { key: "ArrowUp", run: () => this.maybeEscape("line", -1) },
            { key: "ArrowLeft", run: () => this.maybeEscape("char", -1) },
            { key: "ArrowDown", run: () => this.maybeEscape("line", 1) },
            { key: "ArrowRight", run: () => this.maybeEscape("char", 1) },
            {
                key: "Ctrl-Enter", run: () => {
                    if (!exitCode(view.state, view.dispatch)) return false
                    view.focus()
                    return true
                }
            },
            {
                key: "Ctrl-z", mac: "Cmd-z",
                run: () => undo(view.state, view.dispatch)
            },
            {
                key: "Shift-Ctrl-z", mac: "Shift-Cmd-z",
                run: () => redo(view.state, view.dispatch)
            },
            {
                key: "Ctrl-y", mac: "Cmd-y",
                run: () => redo(view.state, view.dispatch)
            }
        ]
    }

    maybeEscape(unit: string, dir: number): boolean {
        let {state} = this.codeMirror, {main} = state.selection
        if (!main.empty) return false
        // @ts-ignore
        if (unit == "line") main = state.doc.lineAt(main.head)
        if (dir < 0 ? main.from > 0 : main.to < state.doc.length) return false
        let targetPos = this.getPos() ?? 0 + (dir < 0 ? 0 : this.node.nodeSize)
        let selection = Selection.near(this.outerView.state.doc.resolve(targetPos), dir)
        let tr = this.outerView.state.tr.setSelection(selection).scrollIntoView()
        this.outerView.dispatch(tr)
        this.outerView.focus()
        return true
    }

    update(node: Node) {
        if (node.type != this.node.type) return false
        this.node = node
        if (this.updating) return true
        let newText = node.textContent, curText = this.codeMirror.state.doc.toString()
        if (newText != curText) {
            let start = 0, curEnd = curText.length, newEnd = newText.length
            while (start < curEnd &&
                curText.charCodeAt(start) == newText.charCodeAt(start)) {
                ++start
            }
            while (curEnd > start && newEnd > start &&
                curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)) {
                curEnd--
                newEnd--
            }
            this.updating = true
            this.codeMirror.dispatch({
                changes: {
                    from: start, to: curEnd,
                    insert: newText.slice(start, newEnd)
                }
            })
            this.updating = false
        }
        return true
    }

    selectNode() { this.codeMirror.focus() }
    stopEvent() { return true }

    // ignoreMutation() { return true }
}

function arrowHandler(dir: 'left' | 'right' | 'up' | 'down') {
  return (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => {
    if (state.selection.empty && view!.endOfTextblock(dir)) {
      let side = dir == "left" || dir == "up" ? -1 : 1
      let $head = state.selection.$head
      let nextPos = Selection.near(
        state.doc.resolve(side > 0 ? $head.after() : $head.before()), side)
      if (nextPos.$head && nextPos.$head.parent.type.name == "code_block") {
        dispatch!(state.tr.setSelection(nextPos))
        return true
      }
    }
    return false
  }
}

export const arrowHandlers = keymap({
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down")
})


const HtmlRenderPlugin = ViewPlugin.fromClass( 
    class {
        private html: string;
        private container: HTMLElement;
        private dom: HTMLElement;

        constructor(view: CodeMirror) {
            this.container = document.createElement('div');
            this.html = view.state.doc.toString();
            this.container.classList.add('cm-html-renderer');
            this.dom = view.dom;

            this.container.innerHTML = this.html;
            view.dom.appendChild(this.container);
            
        }

        update(update: ViewUpdate) {
            this.html = update.state.doc.toString();
            this.container.innerHTML = this.html;
            
            if(!update.view.hasFocus) {
                this.container.classList.remove('cm-html-renderer-inactive');
                update.view.contentDOM.classList.add('cm-html-editor-inactive')
            } else {
                this.container.classList.add('cm-html-renderer-inactive');
                update.view.contentDOM.classList.remove('cm-html-editor-inactive')
            }
        }

        destroy() {
            this.container.remove();
        }
    }
)