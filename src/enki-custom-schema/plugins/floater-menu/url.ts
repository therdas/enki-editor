import { toggleMark } from "prosemirror-commands";
import { Command, EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { findContainerParent } from "./utils";

export class URLSelector {

    //TODO Delete test data
    public static items = new Map<string, string>(
        [
            ['hey', '/p/hey'],
            ['bye!', '/p/bye']
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

    public static openConvertDialog(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean {
        console.log("Opening");
        const container = document.createElement('div');
        URLSelector.container = container;
        container.classList.add('prosemirror-url-selector');

        const searchField = document.createElement('input');
        searchField.type = 'text';
        searchField.setAttribute('list', 'url-selector-list');
        container.appendChild(searchField);

        // Position
        let $parent = findContainerParent(state.selection, state)
        let pos = $parent.node().type.name !== 'paragraph' ? $parent.pos - $parent.parentOffset : $parent.pos
        let rect = view?.coordsAtPos(pos);

        if(rect) {
            container.style.top = rect.top + window.scrollY + 'px';
            container.style.left = rect.left + 'px';
        }

        const dataList = document.createElement('datalist');
        dataList.id = 'url-selector-list'

        for (let item of URLSelector.items.entries()) {
            let opt = document.createElement('option');
            opt.textContent = item[0];
            opt.value = item[1];
            dataList.append(opt);
            console.log("Appended", opt, "tp", dataList)
        }

        container.appendChild(dataList);
        document.body.appendChild(container);
        console.log("Appending", container);

        function destroy() {
            clear(container);
        }

        function fire(event: KeyboardEvent) {
            if (event.key == "Enter") {

                let url = URLSelector.items.get(searchField.value);
                if (url == undefined)
                    url = searchField.value;

                let cmd: Command = toggleMark(state.schema.marks['link'], { href: url });
                console.log(cmd(view!.state, dispatch, view));

                console.log("Waow")

                destroy();
            }
        }

        searchField.focus()

        searchField.addEventListener('focusout', destroy);
        searchField.addEventListener('keydown', fire);
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
