import { InputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import { BoldExtension as PMUBoldExtension } from "prosemirror-remark";

export class BoldExtension extends PMUBoldExtension {
    public override proseMirrorInputRules(
        proseMirrorSchema: Schema<string, string>
    ): Array<InputRule> {
        return [
            new InputRule(
                /\*\*([^\s](?:.*[^\s])?)\*\*([\s\S])$/u,
                (state, match, start, end) => {
                    return state.tr.addMark(start, end-1, proseMirrorSchema.marks[this.proseMirrorMarkName()].create())
                        .deleteRange(end-2, end)
                        .deleteRange(start, start + 2)
                        .removeStoredMark(proseMirrorSchema.marks[this.proseMirrorMarkName()])
                        .insertText(match[0].slice(-1), end-4);
                }
            ),
            new InputRule(
                /__([^\s](?:.*[^\s])?)__([\s\S])$/u,
                (state, match, start, end) => {
                    return state.tr.addMark(start, end-1, proseMirrorSchema.marks[this.proseMirrorMarkName()].create())
                        .deleteRange(end-2, end)
                        .deleteRange(start, start + 2)
                        .removeStoredMark(proseMirrorSchema.marks[this.proseMirrorMarkName()])
                        .insertText(match[0].slice(-1), end-3);
                }
            ),
            // new MarkInputRule(
            //     /(?<!\*)\*([^\s\*](?:[^\*]*[^\s\*])?)\*[^\*]$/u,
            //     proseMirrorSchema.marks[this.proseMirrorMarkName()],
            // ),
            // new MarkInputRule(
            //     /(?<!_)_([^\s_](?:.*[^\s])?)_([^_])$/u,
            //     proseMirrorSchema.marks[this.proseMirrorMarkName()],
            // ),
        ];
    }
}