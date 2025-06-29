// Inspired by and based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-1939067692
// Credits to quantepreneur

import { NodeSelection, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { ResolvedPos, Slice } from "prosemirror-model";
import { throttle } from "lodash";
import { serializeForClipboard } from "../../libs/serialize";


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
        let dragger: HTMLDivElement = document.createElement('div');
        document.body.append(dragger);
        dragger.textContent = '⠿';
        dragger.id = 'drag-handle';
        dragger.draggable = true;
        dragger.ondragstart = e => dragStart(view, e);
        dragger.ondragend = _ => dragEnd();

        // let inserter: HTMLDivElement = document.createElement('div');
        // document.body.appendChild(inserter);
        // inserter.textContent = '+';
        // inserter.id = 'inserter';
        // inserter.draggable = false;
        // inserter.onclick = e => insertType(view, e);

        return {
            update() {
                // There's really no need to update a draggerhandle
            },
            destroy() {
                if(dragger.parentElement) dragger.parentElement.removeChild(dragger)
                // if(inserter.parentElement) inserter.parentElement.removeChild(inserter)
            }
        }
    },
    props: {
        handleDOMEvents: {
            mousemove: throttle((view, event) => {

                let coords = { left: event.clientX, top: event.clientY }

                let pos$ = getLegalPosAtCoords(coords, view);
                if (!pos$) return;

                State.pos$ = pos$;
                let rect = view.coordsAtPos(pos$.pos - pos$.parentOffset - 1);

                let dragger = document.querySelector('#drag-handle') as HTMLElement;
                let inserter = document.querySelector('#inserter') as HTMLElement;

                if (!dragger) return;
                dragger.style.top = rect.top + 'px';
                dragger.style.left = (rect.left - 40) + 'px';

                if (inserter !== null) {
                    inserter.style.top = rect.top + 'px';
                    inserter.style.left = (rect.left - 40) + 'px';
                }
            }, 100)
        }
    }
})

function dragEnd() {
    let elem = document.getElementById('temp-draggable');
    elem && elem.parentElement && elem.parentElement.removeChild(elem);


    if (window.getSelection()) {
        window.getSelection()?.empty();
    }
}

function dragStart(view: EditorView, event: DragEvent) {
    if (!event.dataTransfer || !State.pos$)
        return;

    let pos$: ResolvedPos;
    let slice: Slice;

    // Do this if the user selects multiple things
    if (view.state.selection.head !== view.state.selection.anchor) {
        slice = view.state.selection.content();
    } else {
        pos$ = State.pos$;
        if (pos$ !== null) {
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos$.pos - 1 - pos$.parentOffset)))
        } else return;
        slice = view.state.selection.content();
    }

    // hence the mismatch 
    let { dom, text } = serializeForClipboard(view, slice)

    document.body.appendChild(dom);
    dom.id = 'temp-draggable';

    event.dataTransfer.clearData()
    event.dataTransfer.setData('text/html', dom.innerHTML)
    event.dataTransfer.setData('text/plain', text)
    event.dataTransfer.setDragImage(dom, -40, -40);

    view.dragging = { slice, move: true }
    view.focus()
}

function getLegalPosAtCoords(coords: { left: number, top: number }, view: EditorView): ResolvedPos | null {
    let pos = view.posAtCoords(coords);

    if (!pos) return null;
    let pos$: ResolvedPos | null = view.state.doc.resolve(pos.pos);

    let type = pos$.parent.type.name;
    if (type === 'paragraph') {
        const newpos$ = view.state.doc.resolve(pos.pos - pos$.parentOffset - 1);
        if (newpos$.node(newpos$.depth).type.name !== 'doc') {
            pos$ = newpos$;
        }
    } else if (type === 'doc') {
        // For the purposes of this editor we ignore `doc`s.
        pos$ = null;
    }

    return pos$;
}