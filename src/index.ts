import {EditorState, Plugin} from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * Create prompter widget
 * @param tooltip Tooltip to show when a new blank paragraph is created and the cursor is active within it
 * @returns ProseMirror Plugin to show an div.prosemirror-prompter with tooltip on blank lines
 */
export const Prompter = function(tooltip: string) {
    return new Plugin({
        view(editorView) {return new PrompterWidgetView(editorView, tooltip)}
    })
}

class PrompterWidgetView {
    tooltip: HTMLDivElement;
    constructor(view: EditorView, private tooltipString: string) {
        this.tooltip = document.createElement('div');
        this.tooltip.className = "prosemirror-prompter";
        view.dom.parentNode?.appendChild(this.tooltip);
        this.tooltip.textContent = this.tooltipString;

        this.update(view, null);
    }

    update(view: EditorView, _: EditorState | null) {

        let selection = view.state.selection.$anchor;
        let node = selection.node(selection.depth);

        if(node.textContent.trim().length == 0) {
            this.tooltip.style.display = 'block';
        } else {
            this.tooltip.style.display = 'none';
        }

        let pos = view.coordsAtPos(selection.pos - selection.parentOffset);

        this.tooltip.style.position = 'absolute';
        this.tooltip.style.left = pos.left + 'px';
        this.tooltip.style.top = pos.top + 'px';
        this.tooltip.style.transform = 'translateY(-1em)'
    }
}