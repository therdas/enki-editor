// Inspired by and based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-1939067692
// Credits to quantepreneur

import { NodeSelection, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node as PMNode } from "prosemirror-model";

export const DragHandle = new Plugin({
    view(view: EditorView) {
        let dragger: HTMLDivElement | null = document.body.appendChild(document.createElement('div'));
        dragger.textContent = '⠿';
        dragger.id ='drag-handle';
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
            drop(view, event) {
                setTimeout(() => {
                    let node = document.querySelector('.Prosemirror-hideselection')
                    if(node) {
                        node.classList.remove('Prosemirror-hideselection')
                    }
                }, 50);
            },
            mousemove(view, event) {
                let coords = { left: event.clientX, top: event.clientY }

                let pos = view.posAtCoords(coords)!
                let nod = view.domAtPos(pos.pos);
                let pos$ = view.state.doc.resolve(pos.pos);

                console.log(">",pos)
                console.log(pos, "::", pos$.parent.type.name);
                if(pos$.parent.type.isInline) {
                    console.log("FALSEEEE")
                }

                let q = pos$.pos;

                let rect = view.coordsAtPos(pos$.pos - pos$.parentOffset);


                let dragger = document.querySelector('#drag-handle') as HTMLElement;

                if(!dragger) return;
                dragger.style.top = rect.top + 'px';
                dragger.style.left = rect.left + 'px';
            }
        }
    }
})