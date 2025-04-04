import { ActionKind, AutocompleteAction, FromTo } from "prosemirror-autocomplete";
import { EditorView } from "prosemirror-view";
import { makeNode, nodeTypes } from "./node-types"
import { NodeSelection } from "prosemirror-state";

enum State {
    Open = 1,
    Closed = 2,
    Dirty = 4
}

export class SuggestionsManager {
    private data: Map<string, [string, string, string][]> = new Map();
    private filterView: [string, string, string][] = [];
    private view: EditorView | undefined
    private index: number = -1
    private range: FromTo | undefined
    private picker: HTMLElement | undefined;
    private container: HTMLElement;
    private state = State.Closed;
    private type = '';

    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);
        this.refreshSuggestions('mention', [['Rahul Das', 'therdas', '/u/therdas'], ['Bideepto Bhattacharya', 'bidexd', '/u/bidexd'], ['Vani Ahuja', 'vahuja', 'u/vahuja']])
        this.refreshSuggestions('hashtag', [['Main Page', 'mainpage', '/p/mainpage'], ['contents', 'contents', '/u/content']])
        this.refreshSuggestions('inserter', nodeTypes())
    }

    refreshSuggestions(key: string, data: [string, string, string][]) {
        this.data.set(key, data);
    }

    filter(key: string, partial: string) {
        const dataset = this.data.get(key);
        this.type = key;
        if (!dataset) return;

        this.filterView = dataset.filter(arg => {
            return arg[0].startsWith(partial) ||
                arg[1].startsWith(partial);
        })

        this.state |= State.Dirty;

        if (this.state & State.Open) {
            this.refreshWindow()
        }
    }

    next() {
        if (this.index == -1) this.index = 0;
        else this.index = (this.index + 1) % this.filterView.length;
        this.updateSelection()
    }

    prev() {
        if (this.index == -1) this.index = 0;
        if (--this.index < 0) this.index = this.filterView.length - 1;
        this.updateSelection()
    }

    setState(state: State) {
        if (state & State.Closed)
            this.state = State.Closed;
        else if (state & State.Open && this.state & State.Closed)
            this.state = State.Open | State.Dirty;

        this.refreshWindow();
    }

    buildView() {
        const parent = document.createElement('div');
        parent.classList.add('suggestions', 'list');

        for (const suggestion of this.filterView) {
            const child = document.createElement('div');
            let title = document.createElement('span');
            let description = document.createElement('div');
            [title.textContent, description.textContent] = suggestion;
            child.classList.add('item');
            child.append(title, description);
            parent.append(child);

            child.addEventListener('click', (e: MouseEvent) => {
                if (!this.view || !this.range)
                    return;

                if (this.index < 0 || this.index >= this.filterView.length)
                    return;

                const tr = this.view.state.tr
                    .deleteRange(this.range.from, this.range.to)
                    .insertText(this.filterView[this.index][2])
                this.view.dispatch(tr)
                this.view.focus()

                this.state = State.Closed;
                this.refreshWindow();

                e.stopPropagation()
            })
        }

        return parent;
    }

    refreshWindow() {
        if ((
            this.state & State.Closed ||
            this.state & State.Dirty
        ) && this.picker) {
            this.container.removeChild(this.picker);
            this.picker.remove()
            this.picker = undefined;
            this.index = -1;
        }

        if (this.state & State.Open) {
            if (!this.picker) {
                this.picker = this.buildView();
                this.container.appendChild(this.picker);
            }
            this.updateSelection();

            const rect = document.getElementsByClassName('autocomplete')[0].getBoundingClientRect();
            if (rect)
                [this.picker.style.top, this.picker.style.left] = [rect.bottom + 'px', rect.left + 'px']
        }
    }

    updateSelection() {
        if (!this.picker || !this.view) return;

        [...this.picker.children].forEach(elem => elem.classList.remove('selected'))

        if (this.index >= 0 && this.index < this.filterView.length)
            this.picker.children[this.index].classList.add('selected');
    }

    fire() {
        if (!this.view || !this.range)
            return;

        if (this.type == 'mention' || this.type == 'hashtag') {

            const marker = this.type == 'mention' ? '@' : '#';
            const type = this.type == 'mention' ? 'mention' : 'tag';

            const tr = this.view.state.tr
                .deleteRange(this.range.from, this.range.to)
                .insert(
                    this.range.from,
                    this.view.state.schema.text(
                        this.filterView[this.index][1],
                        [
                            this.view.state.schema.marks['taggable'].create({
                                href: this.filterView[this.index][2],
                                'efm-taggable-marker': marker,
                                'efm-taggable-type': type,
                            })
                        ]
                    )
                )
            this.view.dispatch(tr);
        } else {
            const replaceWith = makeNode(this.filterView[this.index][2], this.view.state.schema);
            
            if(replaceWith == undefined)
                return false;

            const tr = this.view.state.tr;

            tr.replaceRangeWith(this.range.from - 1, this.range.to,
                    replaceWith[0]
            ).setSelection(
                new NodeSelection(
                    tr.doc.resolve(this.range.from + replaceWith[1]), 
                )
            );

            this.view.dispatch(tr);
        }

        this.setState(State.Closed);
    }

    public reducer(action: AutocompleteAction): boolean {
        this.view = action.view;

        switch (action.kind) {
            case ActionKind.open:
                this.setState(State.Open);
                this.range = action.range;
                this.filter(action.type?.name ?? 'dropdown', '');
                return true;
            case ActionKind.close:
                this.setState(State.Closed);
                return true;
            case ActionKind.enter:
                this.fire();
                return true;
            case ActionKind.up:
                this.prev();
                return true;
            case ActionKind.down:
                this.next();
                return true;
            case ActionKind.filter:
                this.filter(action.type?.name ?? 'dropdown', action.filter ?? '')
                this.range = action.range;
                return true;
            default:
                return false;
        }
    }
}