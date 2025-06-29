import { type Command, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { findContainerParent } from './utils';

export interface MenuItem {
    command: Command,
    textIcon: string,
    label?: string,
    cls: string[],
    predicate: (view: EditorView) => boolean
}

interface CMenuItem extends MenuItem {
    _dom: HTMLElement | undefined;
}

function createDOM(text: string, cls: string[], label?: string) {
    const container = document.createElement('span');
    const elem = document.createElement('span');

    elem.textContent = text;
    elem.classList.add(...cls);

    container.appendChild(elem);
    if(label) {
        let lbl = container.appendChild(document.createElement('span'));
        lbl.textContent = label;
    }
    return container;
}


export class MenuView {
    public dom: HTMLElement;
    public items: CMenuItem[] = [];
    constructor(items: MenuItem[], public editorView: EditorView) {
        this.dom = document.createElement('div');
        this.dom.classList.add('menubar');

        this.items = items.map(({command, textIcon, label, cls, predicate}) => {
            return {   
                command, 
                textIcon, 
                cls,
                predicate,
                _dom: createDOM(textIcon, cls, label)
            }
        });
        this.items.forEach(({_dom}) => this.dom.appendChild(_dom!))

        this.update();

        this.dom.addEventListener("mousedown", e =>  {
            e.preventDefault();
            editorView.focus();
            this.items.forEach(({command, _dom}) => {
                if(_dom!.contains(e.target! as HTMLElement))
                    command(editorView.state, editorView.dispatch, editorView)
            })
        }) 
    }
    update() {
        let show = false;
        this.items.forEach(({predicate, _dom}) =>  {
            show = show || predicate(this.editorView);
            _dom!.style.display = predicate(this.editorView) ? "" : "none";
        })


        this.dom.style.display = show ? "" : "none";
        let $parent = findContainerParent(this.editorView.state.selection, this.editorView.state)
        let pos = $parent.node().type.name !== 'paragraph' ? $parent.pos - $parent.parentOffset : $parent.pos
        let rect = this.editorView.coordsAtPos(pos)

        this.dom.style.top = rect.top + window.scrollY + 'px';
        this.dom.style.left = rect.left + 'px';
    }

    destroy() {this.dom.remove()}
}

export function menuPlugin(items: MenuItem[]) {
    return new Plugin({
        view(editorView) {
            let menuView = new MenuView(items, editorView);
            editorView.dom.parentElement?.insertBefore(menuView.dom, editorView.dom);
            return menuView
        }
    })
}