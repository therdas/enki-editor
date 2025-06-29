import { Extension } from "prosemirror-unified";
import { ContainerDirectiveExtension } from "./container-directive-extension"
import { LeafDirectiveExtension } from "./leaf-directive-extension";
import { TextDirectiveExtension } from "./text-directive-extension";
import { DirectiveView } from "./directive-view";

export { ContainerDirectiveExtension } from "./container-directive-extension"
export { LeafDirectiveExtension } from "./leaf-directive-extension"
export { TextDirectiveExtension } from "./text-directive-extension"

export class DirectiveExtension extends Extension {
    override dependencies(): Array<Extension> {
        return [
            new ContainerDirectiveExtension,
            new LeafDirectiveExtension,
            new TextDirectiveExtension
        ]
    }
}

// 0: Container, 1: PluginDom, 2: ContentDom
export function setFragmentHandler(
    opts: {
        container?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement | undefined, HTMLElement ] }] ,
        leaf?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement | undefined, HTMLElement ] }] ,
        text?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement | undefined, HTMLElement ] }] ,
    },
    clear: boolean = false
) {
    if(clear) {
        DirectiveView.clearFragmentHandlers();

    }
    
    if(opts.container !== undefined)
        for(let i of opts.container){
            DirectiveView.addFragmentHandlers('block', i.name, i.func);
        }

    if(opts.leaf !== undefined)
        for(let i of opts.leaf){
            DirectiveView.addFragmentHandlers('leaf', i.name, i.func);
        }
    
    if(opts.text !== undefined)
        for(let i of opts.text){
            DirectiveView.addFragmentHandlers('text', i.name, i.func);
        }
}