import { ActionKind, AutocompleteAction, FromTo } from "prosemirror-autocomplete";
import { EditorView } from "prosemirror-view";

const picker = {
    view: null as EditorView | null,
    open: false,
    current: null as number | null,
    range: null as FromTo | null,
    suggestions: null as Array<[string, string]> | null,
    suggestionType: null as string | null,
    suggestionsBackup: null as Array<[string, string]> | null,
    suggestionBox: undefined as HTMLDivElement | undefined
}

function updatePicker(view: EditorView, remake: boolean = false) {
    console.log('PIN');

    if(!picker.open || remake){
        if(picker.suggestionBox){
            console.log("deleting")
            picker.suggestionBox.parentElement?.removeChild(picker.suggestionBox);
            delete picker.suggestionBox;
        }

        if(!remake)
            return;
    }

    if(!picker.suggestionBox){
        console.log("making")
        picker.suggestionBox = buildSuggestionElement();
        document.body.appendChild(picker.suggestionBox);
    }

    if(!picker.current)
        picker.current = 0;
    [...picker.suggestionBox.children].forEach(element => element.classList.remove('selected'));

    picker.suggestionBox.children[picker.current].classList.add('selected');

    picker.suggestionBox.style.top = view.coordsAtPos(view.state.selection.$head.pos).bottom + 'px';
    picker.suggestionBox.style.left = view.coordsAtPos(view.state.selection.$head.pos).left + 'px';
}

function buildSuggestionElement(): HTMLDivElement {
    const parent = document.createElement('div');
    parent.classList.add('suggestions', 'list');

    console.log(picker.suggestions);

    if(!picker.suggestions)
        throw Error('\n[enki:autocomplete] Autocompleter called before initialization of suggestions.\n[enki:autocomplete] Type: "' + picker.suggestionType + '"' );

    for(const suggestion of picker.suggestions) {
        const child = document.createElement('div');
        let title = document.createElement('span');
        let description = document.createElement('div');
        [title.textContent, description.textContent] = suggestion;
        child.classList.add('item');
        child.append(title, description);
        parent.append(child);

        child.addEventListener('click', (e: MouseEvent) => {
            if(!picker.view || !picker.range || !picker.suggestions)
                return;

            picker.open = false;
            const tr = picker.view.state.tr
            .deleteRange(picker.range?.from, picker.range?.to)
            .insertText(picker.suggestions[picker.current ?? 0][1])
            picker.view.dispatch(tr)
            picker.view.focus()
            updatePicker(picker.view)
            e.stopPropagation()
        })
    }

    return parent;
}

function mockType() {
    picker.suggestions = [['Rahul Das', 'therdas'], ['Bideepto Bhattacharya', 'bidexd'], ['Vani Ahuja', 'vahuja']]
}

export function reducer(action: AutocompleteAction): boolean {
    const view = action.view;
    picker.view = view;

    picker.suggestionType = action.type?.name ?? null;
    console.log("::",action)

    switch(action.kind) {
        case ActionKind.open:
            picker.current = 0;
            picker.open = true;
            picker.range = action.range;
            picker.suggestionType = action.type?.name ?? null;
            picker.suggestions = [];
            mockType();
            updatePicker(view, true);
            return true;
        case ActionKind.close:
            picker.open = false;
            updatePicker(view);
            return true;
        case ActionKind.enter: 
            const tr = action.view.state.tr
                       .deleteRange(action.range.from, action.range.to)
                       .insert(
                            action.range.from,
                            action.view.state.schema.text(
                                '@'+picker.suggestions![picker.current!][1],
                                [
                                    view.state.schema.marks['taggable'].create({
                                        href: `/users/${picker.suggestions![picker.current!][1]}`,
                                        'efm-taggable-marker': '@',
                                        'efm-taggable-type': 'mention',
                                    })
                                ]
                            )
                        )
            action.view.dispatch(tr);
            picker.open = false;
            return true;
        case ActionKind.down: 
            if(!picker.current) picker.current = 0;
            picker.current = (picker.current + 1) % (picker.suggestions?.length ?? 1);
            updatePicker(view);
            return true;
        case ActionKind.up: 
            if(!picker.current) picker.current = 0;
            picker.current = (-- picker.current) >= 0 ? picker.current : (picker.suggestions?.length ?? 1) - 1;
            updatePicker(view);
            return true;
        case ActionKind.filter:
            if(!picker.suggestionsBackup)
                picker.suggestionsBackup = [...picker.suggestions!];
            picker.suggestions = picker.suggestions!.filter((val) => val[1].startsWith(action.filter ?? '') || val[0].startsWith(action.filter ?? ''))
        default: 
            return false;
    }
}