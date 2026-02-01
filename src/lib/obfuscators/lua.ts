// Lua Obfuscator - Fixed comments and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class LuaObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
        'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
        'true', 'until', 'while', 'print', 'pairs', 'ipairs', 'next', 'type', 'tostring',
        'tonumber', 'error', 'assert', 'pcall', 'xpcall', 'require', 'module', 'setmetatable',
        'getmetatable', 'rawget', 'rawset', 'rawequal', 'select', 'unpack', 'table', 'string', 'math'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract strings FIRST to protect them
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract long bracket strings [[...]]
        result = result.replace(/\[\[[^\]]*\]\]/g, (m) => {
            const ph = `___LUASTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double and single quoted strings
        result = result.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___LUASTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            // Remove multi-line comments --[[ ... ]]
            result = result.replace(/--\[\[[^\]]*\]\]/g, '');
            // Remove single-line comments --
            result = result.replace(/--[^\n]*/g, '');
        }

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 5: Minify
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        // Step 6: Restore strings with optional encoding
        for (const { original, placeholder } of strings) {
            let replacement = original;
            if (!original.startsWith('[[')) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 100) {
                    if (this.options.hexEncoding && this.options.encodeStrings) {
                        const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                        replacement = `"${hex}"`;
                    }
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const localRegex = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const funcRegex = /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = funcRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }
        while ((match = localRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        this.varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });
        return result;
    }

    private generateConfusingName(): string {
        const chars = 'O0Il1_';
        let name = '';
        for (let i = 0; i < 8; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        return name + Math.random().toString(36).substr(2, 4);
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.1 && line.trim() && !line.trim().startsWith('--')) {
                result.push('local _ = nil');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Remove blank lines and extra whitespace
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Join carefully - handle comments properly
        const resultParts: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\s+/g, ' ');
            const isFullLineComment = line.startsWith('--');
            // Check for inline comment (code followed by --)
            const hasInlineComment = !isFullLineComment && /\s--/.test(line);
            const nextLine = lines[i + 1];
            const nextIsComment = nextLine && nextLine.trim().startsWith('--');
            const endsWithKeyword = /\b(end|then|do)\s*$/.test(line);

            if (isFullLineComment || hasInlineComment || nextIsComment) {
                // Lines with comments need newline separation
                resultParts.push(line + '\n');
            } else if (i === lines.length - 1) {
                resultParts.push(line);
            } else if (endsWithKeyword) {
                resultParts.push(line + ' ');
            } else {
                resultParts.push(line + ' ');
            }
        }

        let result = resultParts.join('');

        // Compress spaces but NOT inside comments
        const finalLines = result.split('\n');
        const processedLines: string[] = [];
        for (const line of finalLines) {
            if (line.trim().startsWith('--')) {
                // Keep comment lines as-is
                processedLines.push(line);
            } else {
                // Check for inline comment
                const commentIdx = line.indexOf(' --');
                if (commentIdx > 0) {
                    // Split code and comment
                    const codePart = line.substring(0, commentIdx);
                    const commentPart = line.substring(commentIdx);
                    // Compress only the code part
                    let compressed = codePart.replace(/\s*([,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(function|local|if|then|else|end|for|while|do|return)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed + commentPart);
                } else {
                    // No comment, compress normally
                    let compressed = line.replace(/\s*([,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(function|local|if|then|else|end|for|while|do|return)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed);
                }
            }
        }

        return processedLines.join('\n').trim();
    }
}
