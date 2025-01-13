// Inspired by and based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-1939067692
// Credits to quantepreneur

import { NodeSelection, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { ResolvedPos } from "prosemirror-model";
import { throttle } from "lodash";
import { serializeForClipboard } from '../../../node_modules/prosemirror-view/src/clipboard.ts'


/** Static obj for state */
const State = {
    pos$: undefined as ResolvedPos | undefined,
}

/**
 * One caveat: 
 * - It **has** to be a "Parent"-type element.
 * - If it is a Paragraph, we need to check if its parent is:
 *   - Not Doc/Root and
 *   - Not another container
 *   if so, that is to be the new parent.
 * Assumption's that a Paragraph cannot contain another Paragraph.
 * Also, if we get a root, do not perform the exit.
 */
export const DragHandle = new Plugin({
    view(view: EditorView) {
        let dragger: HTMLDivElement | null = document.body.appendChild(document.createElement('div'));
        dragger.textContent = '⠿';
        dragger.id ='drag-handle';
        dragger.draggable = true;
        dragger.ondragstart = e => dragStart(view, e);
        return {
            update(view, prevState) {

            },
            destroy() {
                if(dragger)
                    document.removeChild(dragger);
                dragger = null;
            }
        }
    },
    props: {
        handleDOMEvents: {
            mousemove: throttle((view, event) => {
                
                let coords = { left: event.clientX, top: event.clientY }

                let pos$ = getLegalPosAtCoords(coords, view);
                if(!pos$) return;
                
                State.pos$ = pos$;
                console.log("POS SET TO ", pos$);
                let rect = view.coordsAtPos(pos$.pos - pos$.parentOffset - 1);

                let dragger = document.querySelector('#drag-handle') as HTMLElement;

                if(!dragger) return;
                dragger.style.top = rect.top + 'px';
                dragger.style.left = (rect.left - 40) + 'px';
            }, 100)
        }
    }
})

function dragStart(view: EditorView, event: DragEvent) {
    console.log("Look maa im draggin", State.pos$)
    if(!event.dataTransfer || !State.pos$)
        return;

    let pos$ = State.pos$;

    if(pos$ !== null) {
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos$.pos - 1 - pos$.parentOffset)))
        console.log(view.state.selection.content())
        let slice = view.state.selection.content()

        // @ts-expect-error View (global) is pulling from .d.ts file, the function below does so via the .ts file,
        // hence the mismatch 
        let {dom, text} = serializeForClipboard(view, slice)

        event.dataTransfer.clearData()
        event.dataTransfer.setData('text/html', dom.innerHTML)
        event.dataTransfer.setData('text/plain', text)

        view.dragging = { slice, move: true }
        view.focus()
    }
}

function getLegalPosAtCoords(coords: {left: number, top: number}, view: EditorView): ResolvedPos | null {
    let pos = view.posAtCoords(coords);

    if(!pos) return null;
    let pos$: ResolvedPos | null = view.state.doc.resolve(pos.pos);

    let type = pos$.parent.type.name;
    if(type === 'paragraph') {
        const newpos$ = view.state.doc.resolve(pos.pos - pos$.parentOffset - 1);
        if(newpos$.node(newpos$.depth).type.name !== 'doc') {
            pos$ = newpos$;
        }
    } else if(type === 'doc') {
        // For the purposes of this editor we ignore `doc`s.
        pos$ = null;
    }

    return pos$;
}