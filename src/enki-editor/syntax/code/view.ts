import {
  EditorView as CodeMirror, type KeyBinding, ViewUpdate, keymap as cmKeymap, drawSelection,
} from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"

import { exitCode } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { EditorView, EditorView as PMEditorView, type NodeView as PMNodeView } from "prosemirror-view"
import { Node } from "prosemirror-model"
import { EditorState, Selection, TextSelection, Transaction } from "prosemirror-state"
import { SelectionRange as CMSelectionRange, Compartment } from "@codemirror/state"
import { Line } from "@codemirror/state"

import { cpp } from "@codemirror/lang-cpp";
import { angular } from "@codemirror/lang-angular";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript, typescriptLanguage } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sass } from "@codemirror/lang-sass";
import { sql } from "@codemirror/lang-sql";
import { vue } from "@codemirror/lang-vue";
import { wast } from "@codemirror/lang-wast";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";

const LanguageMap = new Map<string, any>([
  ["C/C++", cpp],
  ["Javascript", javascript],
  ["Typescript", () => typescriptLanguage],
  ["Angular", angular],
  ["CSS", css],
  ["Go", go],
  ["HTML", html],
  ["Java", java],
  ["JSON", json],
  ["Markdown", markdown],
  ["PHP", php],
  ["Python", python],
  ["Rust", rust],
  ["SASS", sass],
  ["SQL", sql],
  ["Vue", vue],
  ["WAST", wast],
  ["XML", xml],
  ["YAML", yaml],
]);

const aliases = new Map<string, string>([
  ['C', 'C/C++'],
  ['C++', 'C/C++'],
  ['CPP', 'C/C++'],
  ['JS', 'Javascript'],
  ['TS', 'Typescript'],
]);

export class CodeBlockView implements PMNodeView {
  dom: HTMLElement;
  cm: CodeMirror;
  updating = false;
  footer: HTMLElement;
  langHolder: Compartment;
  langSelector: HTMLSelectElement | null = null;

  constructor(private node: Node, private view: PMEditorView, private getPos: () => number | undefined) {

    this.langHolder = new Compartment();

    this.cm = new CodeMirror({
      doc: this.node.textContent,
      extensions: [
        cmKeymap.of([
          ...this.codeMirrorKeymap(),
          ...defaultKeymap
        ]),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle),
        this.langHolder.of([]),
        CodeMirror.updateListener.of(update => this.forwardUpdate(update))
      ]
    })


    // The editor's outer node is our DOM representation
    this.dom = document.createElement('div');
    this.dom.classList.add('prosemirror-codemirror-codeblock')
    this.footer = this.dom.appendChild(document.createElement('div'))
    this.dom.appendChild(this.cm.dom);

    // This flag is used to avoid an update loop between the outer and
    // inner editor
    this.updating = false

    this.footer.appendChild(this.createControls(node.attrs.lang == null ? 'Markdown' : node.attrs.lang));
    this.initLanguage(node.attrs.lang == null ? 'Markdown' : node.attrs.lang)
  }

  getProvider(name: string){
    if(aliases.get(name))
      name = aliases.get(name)!;
    return LanguageMap.get(name);
  }

  createControls(setTo: string){
    if(aliases.get(setTo))
      setTo = aliases.get(setTo)!;

    const opts = document.createElement('select');
    opts.classList.add('prosemirror-code-selector');
    opts.value = "Code"
    LanguageMap.forEach((_, key) => {
        const opt = opts.appendChild(document.createElement('option'));
        opt.value = key
        opt.textContent = key
      }
    )
    opts.value = setTo
    opts.addEventListener('change', this.handleLanguageChange.bind(this));
    this.initLanguage('Javascript');

    this.langSelector = opts;

    return opts;
  }

  initLanguage(langName: string) {
    let name = aliases.get(langName) ?? langName;
    const handler = this.getProvider(name);



    this.cm.dispatch({effects: this.langHolder.reconfigure(handler())})
  }

  handleLanguageChange(event: Event) {
    let newLang = (event.target! as HTMLSelectElement).value;
    let name = aliases.get(newLang) ?? newLang;

    const handler = this.getProvider(name);

    this.cm.dispatch({effects: this.langHolder.reconfigure(handler())});
    this.view.dispatch(this.view.state.tr.setNodeMarkup(
      this.getPos()!,
      undefined,
      {
        lang: name
      }
    ))
  }

  forwardUpdate(update: ViewUpdate) {
    if (this.updating || !this.cm.hasFocus) return
    let offset = this.getPos()! + 1, { main } = update.state.selection
    let selFrom = offset + main.from, selTo = offset + main.to
    let pmSel = this.view.state.selection
    if (update.docChanged || pmSel.from != selFrom || pmSel.to != selTo) {
      let tr = this.view.state.tr
      update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
        if (text.length)
          tr.replaceWith(offset + fromA, offset + toA,
            this.view.state.schema.text(text.toString()))
        else
          tr.delete(offset + fromA, offset + toA)
        offset += (toB - fromB) - (toA - fromA)
      })
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo))
      this.view.dispatch(tr)
    }
  }

  setSelection(anchor: number, head: number) {
    this.cm.focus()
    this.updating = true
    this.cm.dispatch({ selection: { anchor, head } })
    this.updating = false
  }

  codeMirrorKeymap(): KeyBinding[] {
    let view = this.view
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

  maybeEscape(unit: string, dir: number) {
    let main: CMSelectionRange | Line;
    let { state } = this.cm;
    main = state.selection.main
    if (!main.empty) return false
    if (unit == "line") {
      main = state.doc.lineAt(main.head)
    }
    if (dir < 0 ? main.from > 0 : main.to < state.doc.length) return false
    let targetPos = this.getPos()! + (dir < 0 ? 0 : this.node.nodeSize)
    let selection = Selection.near(this.view.state.doc.resolve(targetPos), dir)
    let tr = this.view.state.tr.setSelection(selection).scrollIntoView()
    this.view.dispatch(tr)
    this.view.focus()
    return true;
  }

  update(node: Node) {
    if (node.type != this.node.type) return false
    this.node = node
    if (this.updating) return true
    let newText = node.textContent, curText = this.cm.state.doc.toString()
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
      this.cm.dispatch({
        changes: {
          from: start, to: curEnd,
          insert: newText.slice(start, newEnd)
        }
      })
      this.updating = false
    }
    return true
  }

  selectNode() { this.cm.focus() }
  stopEvent() { return true }
}

function arrowHandler(dir: 'left' | 'right' | 'up' | 'down') {
  return (state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, view: EditorView | undefined) => {
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

export const arrowHandlers = {
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down")
}
