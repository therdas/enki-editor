import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

class UrlCreator {
    public static urls = new Map<string, string>(); // <Title, URL>

    public static setURLs(urls: [string, string][]) {
        for( let entry in urls) {
            let [title, url] = entry;
            this.urls.set(title, url);
        }
    }

    public static clearURLs() {
        this.urls.clear;
    }

    public static openConvertDialog(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean {
        
        return false;
    }
}

export function convertToUrl(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) {
    if(!dispatch)
        return;
    if(!view)
        return;
}
