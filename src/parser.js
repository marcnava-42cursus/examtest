import { KEYWORDS, TYPES, FUNCTIONS, BLOCK_DEFS } from './constants.js';
import { state } from './state.js';

export function parseCode(code) {
    state.rawCode = code;
    const rawLines = code.split('\n');
    state.lines = rawLines.map((line, i) => {
        const expanded = line.replace(/\t/g, '    ');
        const indent = Math.floor((expanded.length - expanded.trimStart().length) / 4);
        const text = expanded.trimStart().replace(/\s+/g, ' ');
        const isEmpty = text.trim() === '';
        const isBrace = text.trim() === '{' || text.trim() === '}';
        const isComment = text.trim().startsWith('//') || text.trim().startsWith('/*');
        const isInclude = text.trim().startsWith('#include');
        const quiz = !isEmpty && !isBrace && !isComment && !isInclude;
        return { text, indent, quiz, original_index: i };
    });
    detectBlocks();
}

function detectBlocks() {
    state.blocks = [];
    const lines = state.lines;
    let i = 0;
    let currentBlock = null;
    let braceDepth = 0;
    let blockStartIdx = 0;

    const funcStarts = [];
    for (let li = 0; li < lines.length; li++) {
        const t = lines[li].text;
        if (li + 1 < lines.length && lines[li + 1].text.trim() === '{' &&
            lines[li].indent === 0 && /^(int|void|char|static)/.test(t) && /\)/.test(t)) {
            funcStarts.push(li);
        }
    }

    if (funcStarts.length > 0 && funcStarts[0] > 0) {
        const varLines = [];
        for (let li = 0; li < funcStarts[0]; li++) {
            if (lines[li].quiz) varLines.push(li);
        }
        if (varLines.length > 0) {
            state.blocks.push({
                name: 'Variables globales', icon: '📦',
                lines: varLines, allLines: Array.from({ length: funcStarts[0] }, (_, i) => i)
            });
        }
    }

    for (let fi = 0; fi < funcStarts.length; fi++) {
        const start = funcStarts[fi];
        let end = start + 1;
        let depth = 0;
        for (let li = start; li < lines.length; li++) {
            if (lines[li].text.trim() === '{') depth++;
            if (lines[li].text.trim() === '}') { depth--; if (depth === 0) { end = li; break; } }
        }
        const blockLines = [];
        const allLines = [];
        for (let li = start; li <= end; li++) {
            allLines.push(li);
            if (lines[li].quiz) blockLines.push(li);
        }
        let name = lines[start].text.match(/(\w+)\s*\(/)?.[1] || 'bloque';
        const defBlock = BLOCK_DEFS.find(b => b.fn === name);
        const icon = defBlock ? defBlock.icon : '📄';
        const displayName = defBlock ? defBlock.name : name + '()';

        state.blocks.push({ name: displayName, icon, lines: blockLines, allLines });
    }
}

export function tokenize(text) {
    const re = /[ ]+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*|\/\*[\s\S]*?\*\/|#[a-z]+|[A-Za-z_][A-Za-z0-9_]*|[0-9]+|./g;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        const t = m[0];
        let type;
        if (/^[ ]+$/.test(t)) type = 'ws';
        else if (t[0] === '"' || t[0] === "'") type = 'str';
        else if (t.startsWith('//') || t.startsWith('/*')) type = 'comment';
        else if (t.startsWith('#')) type = 'macro';
        else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) type = 'word';
        else if (/^[0-9]+$/.test(t)) type = 'num';
        else type = 'punct';
        out.push({ type, text: t });
    }
    return out;
}

export function getTokenClass(tok, tokens, i) {
    if (tok.type === 'ws') return '';
    if (tok.type === 'str') return 'tok-str';
    if (tok.type === 'num') return 'tok-num';
    if (tok.type === 'comment') return 'tok-comment';
    if (tok.type === 'macro') return 'tok-macro';
    if (KEYWORDS.has(tok.text)) return 'tok-keyword';
    if (TYPES.has(tok.text)) return 'tok-type';
    if (FUNCTIONS.has(tok.text) || (tokens[i + 1] && tokens[i + 1].text === '(')) return 'tok-fn';
    if (tok.type === 'word') return 'tok-ident';
    return 'tok-punct';
}
