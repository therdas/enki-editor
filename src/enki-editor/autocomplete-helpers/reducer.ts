'use client';

import { ActionKind, type AutocompleteAction, type FromTo } from "prosemirror-autocomplete";
import { EditorView } from "prosemirror-view";
import { canonicals, descriptions, makeNode, NodeTypes,  } from "./node-types"
import { TextSelection } from "prosemirror-state";
import { forEach } from "lodash";

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
    descriptions?: [string, string][];
}[];


export class SuggestionsManager {
    private view: EditorView | undefined
    private index: number = -1
    private range: FromTo | undefined
    private picker: HTMLElement | undefined;
    private container: HTMLElement;
    private state = State.Closed;

    private values = new Map<string, Map<string, string>> ();
    private mapping = new Map<string, (arg: string) => string>();
    private suggestions = new Map<string, [string, string][]>();

    private filtered: [string, string][] = [];
    private keyed: string = '';
    private current: string = '';

    private descriptions = new Map<string, string>();

    constructor(public options: CompletionOptions = DefaultOptionValues) {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);
        this.container.classList.add('suggestions-manager');


        for(let option of options) {
            this.refreshSuggestions(option.name, option.map);
            this.mapping.set(option.name, option.mapping);
            this.suggestions.set(option.name, option.canonical);

            if(option.descriptions) {
                forEach(option.descriptions, (val: [string, string]) => this.descriptions.set(val[0], val[1]))
            }
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
        this.keyed = key;
        this.current = partial;

        let candidates: [string, string][] = [];

        if(partial.length === 0 && this.suggestions.get(key)?.length !== 0) {
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
        parent.classList.add('suggestions-list');

        let index = 0;

        for (const suggestion of this.filtered) {
            let in_indx = index + 0;
            const child = document.createElement('div');
            let title = document.createElement('span');
            let description = document.createElement('span');
            title.textContent = suggestion[0];
            description.textContent = this.descriptions.get(suggestion[1]) ?? '';
            child.classList.add('item');
            child.append(title, description);
            parent.append(child);

            child.addEventListener('click', (e: MouseEvent) => {
                if (!this.view || !this.range)
                    return;

                this.index = in_indx;


                this.fire();
                this.view.focus()

                this.state = State.Closed;
                this.refreshWindow();

                e.stopPropagation()
            })

            ++index;
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
            // Calculate bottom
            let bottom = rect.bottom;
            if(rect.top < window.innerHeight / 2) {
                bottom = window.scrollY + rect.bottom - Math.floor(parseFloat(getComputedStyle(document.getElementsByClassName('autocomplete')[0].parentElement as HTMLElement).marginBottom))
            } else {
                bottom = window.scrollY + rect.top - Math.floor(window.innerHeight / 3 + parseFloat(getComputedStyle(document.body).fontSize));
            }

            this.picker.style.height = Math.floor(window.innerHeight / 3 ) + 'px';

            if (rect)
                [this.picker.style.top, this.picker.style.left] = [bottom + 'px', rect.left + 'px']
        }
    }

    updateSelection() {
        if (!this.picker || !this.view) return;

        [...this.picker.children].forEach(elem => elem.classList.remove('selected'))

        if (this.index >= 0 && this.index < this.filtered.length){
            this.picker.children[this.index].classList.add('selected');
            // Position
            let elem = this.picker.children[this.index] as HTMLElement;
            let height = elem.offsetTop - elem.offsetHeight * 3;
            height = height < 0 ? 0 : height;
            this.picker.scrollTop = height; 
        }
    }

    fire() {
        if (!this.view || !this.range)
            return false;
        try {
            if (this.keyed == 'mention' || this.keyed == 'hashtag') {

                const marker = this.keyed == 'mention' ? '@' : '#';
                const type = this.keyed == 'mention' ? 'mention' : 'tag';

                let txt = '', url = '';
                if(this.filtered[this.index] == undefined) {
                    url = this.mapping.get(this.keyed)!(this.current);
                    txt = this.current;
                } else {
                    url = this.mapping.get(this.keyed)!(this.filtered[this.index][1]);
                    txt = this.filtered[this.index][0];
                }

                const tr = this.view.state.tr
                    .deleteRange(this.range.from, this.range.to)
                    .insert(
                        this.range.from,
                        this.view.state.schema.text(
                            marker + txt,
                            [
                                this.view.state.schema.marks['taggable'].create({
                                    href: url,
                                    'efm-taggable-marker': marker,
                                    'efm-taggable-type': type,
                                })
                            ]
                        )
                    )
                this.view.dispatch(tr);
                return true;
            } else if(this.keyed == 'inserter') {
                const replaceWith = makeNode(this.filtered[this.index][1], this.view.state.schema);
                
                if(replaceWith == undefined)
                    return false;

                const tr = this.view.state.tr;

                tr.replaceRangeWith(this.range.from - 1, this.range.to + 1, replaceWith[0])
                .setSelection(
                    new TextSelection(
                        tr.doc.resolve(this.range.from + replaceWith[1]), 
                    )
                );

                this.view.dispatch(tr);
                return true;
            }

            this.setState(State.Closed);
        } catch(err) {
            console.log("Rec'd error", err);
            return false;
        }

        return false;
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
                return this.fire();
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

const DefaultOptionValues: CompletionOptions = [
    {
        name: 'hashtag',
        strict: false,
        trigger: '#',
        map: {
            keys: [
                ['maininterest', 'maininterest'],
                ['Contents', 'contents'],
                ['builder', 'builit']
            ],
            values: [
                ['maininterest', '/p/mainpage'],
                ['contents', '/t/content'],
                ['builit', '/t/buildit']
            ]
        },
        canonical: [
            ['Main Page', 'maininterest'],
            // ['Contents', 'contents']
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
        descriptions: descriptions
    },
    {
        name: 'wikilink',
        trigger: '[[',
        map: {
            keys: [
                ['New Page 2', 'New Page 2'],
                ['New Page 1', 'New Page 2'],
                ['New Page', 'New Page'],
                ['New Page', 'New Page'],
                ['New Page', 'New Page'],
                ['New Page', 'New Page'],
            ],
            values: [
                ['New Page 2', 'mbgaz6v9bs2k0ba80s'],
                ['New Page 1', 'mbgaz68pnp51465hdj'],
                ['New Page', 'mbgaz4y45ccm7g61bz'],
                ['New Page', 'mbgaz1uvlbqnb4bgc9'],
                ['New Page', 'mbgayo9fzv5tkb6xbe'],
                ['New Page', 'mbgaymiao589akizqt'],
            ]
        },
        canonical: [],
        strict: true,
        mapping: (val) => `/page/${val}`,
    }
]

const manager = new SuggestionsManager(DefaultOptionValues);

export const DefaultOptions = {
    triggers: [
        { name: 'hashtag', trigger: '#' },
        { name: 'inserter', trigger: '/' },
        { name: 'wikilink', trigger: '[[' }
    ],
    reducer: manager.reducer.bind(manager),
}

