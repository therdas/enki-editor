import { ActionKind, AutocompleteAction, FromTo } from "prosemirror-autocomplete";
import { EditorView } from "prosemirror-view";
import { canonicals, makeNode, NodeTypes,  } from "./node-types"
import { TextSelection } from "prosemirror-state";

enum State {
    Open = 1,
    Closed = 2,
    Dirty = 4
}

export interface CompletionValues {
    
    keys: [string, string][]                      // Keys: Map from multiple key types to single key [eg. a -> z, b -> z]
    values: [string, string][] | 'key'            // Val:  Map from key to value [eg. z -> `val`] or to the single key [z]
}

export type CompletionOptions = {
    strict: boolean,
    name: string,
    trigger: string,
    map: CompletionValues,
    canonical: [string, string][]
    mapping: (arg: string) => string;
}[];

export const TestOptions: CompletionOptions = [
    {
        strict: true,
        name: 'mention',
        trigger: '@',
        map: {
            keys: [
                ['therdas', 'Rahul Das'], ['git@therdas.dev', 'Rahul Das'], 
                ['bidexd', 'Bideepto Bhattacharya'], ['bb@gmail.com', 'Bideepto Bhattacharya'],
                ['vahuja', 'Vani Ahuja']
            ],
            values: [
                ['Rahul Das', 'therdas'], 
                ['Bideepto Bhattacharya', 'bidexd'],
                ['Vani Ahuja', 'vahu']
            ]
        },
        canonical: [
            ['Rahul Das', 'therdas'],
            ['Bideepto Bhattacharya', 'bidexd'],
            ['Vani Ahuja', 'vahuja'],
        ],
        mapping: (val) => '/u/' + val
    },
    {
        name: 'hashtag',
            strict: true,
        trigger: '#',
        map: {
            keys: [
                ['Main Page', 'mainpageID'],
                ['Contents', 'contents']
            ],
            values: [
                ['Main Page', '/p/mainpage'],
                ['Contents', '/t/content']
            ]
        },
        canonical: [
            ['Main Page', 'mainpageID'],
            ['Contents', 'contents']
        ],
        mapping: (val) => '/tags/' + val
    },
    {
        name: 'inserter',
        trigger: '/',
        map: NodeTypes,
        canonical: canonicals,
        strict: true,
        mapping: (val) => val,
    }
]

export class SuggestionsManager {
    private view: EditorView | undefined
    private index: number = -1
    private range: FromTo | undefined
    private picker: HTMLElement | undefined;
    private container: HTMLElement;
    private state = State.Closed;

    // Redone
    // name -> keys and values
    private values = new Map<string, Map<string, string>> ();
    private mapping = new Map<string, (arg: string) => string>();
    private suggestions = new Map<string, [string, string][]>();

    private filtered: [string, string][] = [];
    private keyed: string = '';

    constructor(private options: CompletionOptions = TestOptions) {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);


        for(let option of options) {
            this.refreshSuggestions(option.name, option.map);
            this.mapping.set(option.name, option.mapping);
            this.suggestions.set(option.name, option.canonical);
        }
    }

    refreshSuggestions(key: string, data: CompletionValues) {
        this.values.set(key, new Map<string, string>());
        const mapper = this.values.get(key)!;

        if(data.values !== 'key'){
            let valMap = new Map<string, string>(data.values);
            
            for(let keys of data.keys) {
                const val = valMap.get(keys[1]);
                if(val) 
                    mapper.set(keys[0].toLowerCase(), val)
            }
        } else {
            for(let keys of data.keys)
                mapper.set(keys[0], keys[1])
        }
    }

    filter(key: string, partial: string) {
        console.log("Filter on ", key, partial)
        this.keyed = key;

        let candidates: [string, string][] = []
        if(partial.length === 0) {
            const data = this.suggestions.get(key);
            if(!data) return;
            candidates = data;
        } else {
            const data = this.values.get(key);
            if(!data) return;
            for(let x of data.keys()) {
                if(x.includes(partial))
                    candidates.push([x, data.get(x)!]);
            }
        }

        this.filtered = candidates;
        this.state |= State.Dirty;
        if(this.state & State.Open) {
            console.log("Updating...");
            this.refreshWindow();
        }
    }

    next() {
        if (this.index == -1) this.index = 0;
        else this.index = (this.index + 1) % this.filtered.length;
        this.updateSelection()
    }

    prev() {
        if (--this.index < 0) this.index = this.filtered.length - 1;
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

        for (const suggestion of this.filtered) {
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

                if (this.index < 0 || this.index >= this.filtered.length)
                    return;

                const tr = this.view.state.tr
                    .deleteRange(this.range.from, this.range.to)
                    .insertText(
                        this.mapping.get(this.keyed)!(suggestion[1])
                    )
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
                [this.picker.style.top, this.picker.style.left] = [rect.bottom + window.scrollY + 'px', rect.left + 'px']
        }
    }

    updateSelection() {
        if (!this.picker || !this.view) return;

        [...this.picker.children].forEach(elem => elem.classList.remove('selected'))

        if (this.index >= 0 && this.index < this.filtered.length)
            this.picker.children[this.index].classList.add('selected');
    }

    fire() {
        if (!this.view || !this.range)
            return;

        if (this.keyed == 'mention' || this.keyed == 'hashtag') {

            console.log("KEYED", this.keyed)
            const marker = this.keyed == 'mention' ? '@' : '#';
            const type = this.keyed == 'mention' ? 'mention' : 'tag';

            const tr = this.view.state.tr
                .deleteRange(this.range.from, this.range.to)
                .insert(
                    this.range.from,
                    this.view.state.schema.text(
                        marker + this.filtered[this.index][0],
                        [
                            this.view.state.schema.marks['taggable'].create({
                                href: this.mapping.get(this.keyed)!(this.filtered[this.index][1]),
                                'efm-taggable-marker': marker,
                                'efm-taggable-type': type,
                            })
                        ]
                    )
                )
            this.view.dispatch(tr);
        } else if(this.keyed == 'inserter') {
            const replaceWith = makeNode(this.filtered[this.index][1], this.view.state.schema);
            
            if(replaceWith == undefined)
                return false;

            const tr = this.view.state.tr;

            tr.replaceRangeWith(this.range.from - 1, this.range.to, replaceWith[0])
              .setSelection(
                new TextSelection(
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