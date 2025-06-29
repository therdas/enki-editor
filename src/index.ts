import { data } from "./data"

import { setFragmentHandler } from './enki-custom-schema/syntax-extensions/directive'
import { EnkiEditor } from "./enki-editor"


// class EnkiEditor {
//     public view;
//     // private pmu = new ProseMirrorUnified([new MarkdownExtension, new HtmlExtension]);
//     private pmu = new ProseMirrorUnified([
//         new efmExtension, 
//         new eGFMExtension, 
//         new GFMTableExtension, 
//         new GFMEditableTasklistExtension, 
//         new WikiLinkItemExtension, 
//         new TaggableExtension, 
//         new TextDirectiveExtension, 
//         new ContainerDirectiveExtension, 
//         new LeafDirectiveExtension,
//         new HtmlExtension,
//         new InlineMathExtension,
//         new BlockMathExtension,
//     ]);

//     constructor(target: HTMLElement, content: string) {
//         target.replaceChildren();
//         this.view = new EditorView(target, {
//             state: EditorState.create({
//                 doc: this.pmu.parse(content),
//                 plugins: [
//                     ...autocomplete(testAutocompleteOpts as ACO),
//                     dropCursor(),
//                     gapCursor(),
//                     this.pmu.inputRulesPlugin(),
//                     this.pmu.keymapPlugin(),
//                     history(),

//                     columnResizing({ View: TableView }),
//                     tableEditing(),
//                     keymap({
//                         "Tab": goToNextCell(1),
//                         "Shift-Tab": goToNextCell(-1),
//                         "Mod-z": undo,
//                         "Mod-y": redo,
//                     }),
//                     DragHandle,
//                     menuPlugin([
//                         {
//                             command: toggleMark(this.pmu.schema().marks['strong']),
//                             textIcon: 'format_bold',
//                             cls: ['material-icons'],
//                             predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
//                         },
//                         {
//                             command: toggleMark(this.pmu.schema().marks['em']),
//                             textIcon: 'format_italic',
//                             cls: ['material-icons'],
//                             predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
//                         },
//                         {
//                             command: toggleMark(this.pmu.schema().marks['strikethrough']),
//                             textIcon: 'strikethrough_s',
//                             cls: ['material-icons'],
//                             predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
//                         },
//                         {
//                             command: URLSelector.openConvertDialog,
//                             textIcon: 'link',
//                             cls: ['material-icons'],
//                             predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
//                         },
//                         {
//                             command: toggleMark(this.pmu.schema().marks['code']),
//                             textIcon: 'code',
//                             cls: ['material-icons'],
//                             predicate: (view) => view.state.selection.from != view.state.selection.to && !isNodeActive(view.state, 'html')
//                         },
//                         {
//                             command: addRowAfter,
//                             textIcon: 'add_row_below',
//                             label: 'Add Row',
//                             cls: ['material-icons'],
//                             predicate: (view) => isNodeActive(view.state, 'table')
//                         },
//                         {
//                             command: addColumnAfter,
//                             textIcon: 'add_column_right',
//                             label: 'Add Column',
//                             cls: ['material-icons'],
//                             predicate: (view) => isNodeActive(view.state, 'table')
//                         }
//                     ])
//                 ],
//                 schema: this.pmu.schema(),
//             }),
//             nodeViews: {
//                 ...this.pmu.nodeViews(),
//             }
//         })
//     }
// }

setFragmentHandler({
    leaf: [
        {
            name: 'youtube',
            func: (args) => {
                const url = args.url;
                const elem = document.createElement('iframe');

                elem.width = "500";
                elem.height = "350";
                elem.title = "YouTube Video Player";
                elem.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                elem.referrerPolicy = "strict-origin-when-cross-origin";
                elem.allowFullscreen = true;
                elem.src = url;

                return [document.createElement('span') as HTMLElement, elem as HTMLElement, document.createElement('span') as HTMLElement];
            }
        }
    ],
    text: [
        {
            name: 'color',
            func:(args) => {
                const color = args.color;
                const elem = document.createElement('span');
                elem.style.color = color;

                return [document.createElement('span'), undefined, elem];
            }
        }
    ]
})

window.onload = () => {
    let place = document.querySelector("#editor");
    let _ = new EnkiEditor(<HTMLElement>place, data);
}