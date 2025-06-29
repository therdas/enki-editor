import { toggleMark } from "prosemirror-commands";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { findContainerParent } from "./utils";

export class URLSelector {

    public static focus = 0;

    //TODO Delete test data
    public static items = new Map<string, string>(
        [
            ['hey', '/p/hey'],
            ['bye!', '/p/bye'],
            ['hello!', 'p/hello'],
            ['balls', '/p/ball']
        ]
    );
    public static open = false;
    public static container: HTMLDivElement | undefined = undefined;

    public static setURLs(urls: [string, string][]) {
        for (let entry in urls) {
            let [title, url] = entry;
            URLSelector.items.set(title, url);
        }
    }

    public static clearURLs() {
        this.items.clear;
    }

    public static openConvertDialog(state: EditorState, _?: (tr: Transaction) => void, view?: EditorView): boolean {
        URLSelector.focus = -1;

        let opts: HTMLOptionElement[] = [];

        const container = document.createElement('div');
        URLSelector.container = container;
        container.classList.add('prosemirror-url-selector');

        const searchField = document.createElement('input');
        searchField.type = 'text';
        searchField.setAttribute('list', '');
        searchField.setAttribute('name', 'url-selector-list');
        searchField.setAttribute('role', 'combobox');
        searchField.setAttribute('autocomplete', 'off');
        container.appendChild(searchField);

        // Position
        let $parent = findContainerParent(state.selection, state)
        let pos = $parent.node().type.name !== 'paragraph' ? $parent.pos - $parent.parentOffset : $parent.pos
        let rect = view?.coordsAtPos(pos);

        if(rect) {
            container.style.top = rect.top + window.scrollY + 'px';
            container.style.left = rect.left + 'px';
        }

        let done = container.appendChild(document.createElement('span'));
        done.classList.add('material-icon');
        done.textContent = 'keyboard_return'

        const dataList = document.createElement('datalist');
        dataList.id = 'url-selector-list'

        for (let item of URLSelector.items.entries()) {
            let opt = document.createElement('option');
            opt.textContent = item[0];
            opt.value = item[1];
            dataList.append(opt);
            opt.addEventListener('click', (_) => searchField.value = opt.value);

            opts.push(opt);
        }

        container.appendChild(dataList);
        document.body.appendChild(container);

        function arrowhandler(evt: KeyboardEvent) {
            let sentinel = URLSelector.focus == -1 ? 0 : URLSelector.focus;

            if(evt.key == "ArrowDown") {
                if(URLSelector.focus !== -1 && URLSelector.focus <= opts.length){
                    opts[URLSelector.focus].classList.remove('active');
                }

                do {
                    URLSelector.focus++;
                    if(URLSelector.focus >= opts.length)
                        URLSelector.focus = 0;
                } while (
                    opts[URLSelector.focus].classList.contains('hidden') && 
                    URLSelector.focus != sentinel
                )
                

                opts[URLSelector.focus].classList.add('active');
            } else if(evt.key == "ArrowUp") {
                if(URLSelector.focus !== -1)
                    opts[URLSelector.focus].classList.remove('active');

                do {
                    -- URLSelector.focus;
                    if(URLSelector.focus < 0)
                        URLSelector.focus = opts.length - 1;
                } while (
                    opts[URLSelector.focus].classList.contains('hidden') &&
                    URLSelector.focus !== sentinel
                )

                opts[URLSelector.focus].classList.add('active');
            }
        }

        searchField.addEventListener('keydown', arrowhandler)

        function destroy() {
            clear(container);
        }

        function filter(_: Event) {
            //add current to the end of the list as the custom url. Include custom class
            let url = document.createElement('option');
            url.className = ('custom-url');
            url.textContent = 'External Link ↵';
            url.value = searchField.value;
            url.addEventListener('click', (_) => searchField.value = url.value);

            for(let child of dataList.children) {
                let elem = child as HTMLOptionElement;

                if(elem.classList.contains('custom-url'))
                    dataList.removeChild(child);
            }

            dataList.insertBefore(url, dataList.firstChild);


            for(let elem of opts) {
                if(
                    ! (
                        ( elem.value.includes (searchField.value ))|| 
                        ( elem.textContent?.includes (searchField.value) ?? false)
                    )
                ) {
                    elem.classList.add('hidden');
                } else {
                    if(elem.classList.contains('hidden'))
                        elem.classList.remove('hidden');
                }
            }
        }

        function fire(event: KeyboardEvent | MouseEvent) {
            if ( 
                event instanceof KeyboardEvent && event.key == "Enter" ||
                event instanceof MouseEvent && true
            ) {

                let url = URLSelector.items.get(searchField.value);
                if (url == undefined)
                    url = searchField.value;

                toggleMark(state.schema.marks['link'], { href: url });

                destroy();
            }
        }

        searchField.focus()

        searchField.addEventListener('focusout', destroy);
        searchField.addEventListener('keydown', fire);
        searchField.addEventListener('input', filter);
        done.addEventListener('click', fire);
        return true;
    }
}

//https://stackoverflow.com/questions/32259635/recursively-remove-all-nested-nodes-in-javascript
function clear(node: Node) {
    while (node.hasChildNodes()) {
        clear(node.firstChild!);
    }
    if (node.parentNode)
        node.parentNode.removeChild(node);
}
