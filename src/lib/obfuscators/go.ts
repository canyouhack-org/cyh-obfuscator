// Go Obfuscator - Fixed with proper dead code, minify, and better encoding
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class GoObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
        'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
        'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
        'var', 'true', 'false', 'nil', 'int', 'int8', 'int16', 'int32', 'int64',
        'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64',
        'complex64', 'complex128', 'bool', 'byte', 'rune', 'string', 'error',
        'fmt', 'Println', 'Printf', 'Print', 'Sprintf', 'Scanln', 'Scanf',
        'main', 'init', 'len', 'make', 'new', 'append', 'cap', 'copy', 'close',
        'delete', 'panic', 'recover', 'iota', 'os', 'Args', 'Stdin', 'Stdout'
    ]);

    obfuscate(code: string): string {
        let result = code;

        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;
        // Raw strings
        result = result.replace(/`[^`]*`/g, (m) => {
            const ph = `__GOSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });
        // Regular strings
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `__GOSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });

        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        for (const { original, placeholder } of strings) {
            let replacement = original;
            if (!original.startsWith('`')) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 100) {
                    if (this.options.hexEncoding && this.options.encodeStrings) {
                        const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                        replacement = `"${hex}"`;
                    }
                }
            }
            result = result.replace(placeholder, replacement);
        }

        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varMap = new Map<string, string>();
        const varRegex = /\b(var|func)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const shortVarRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:=/g;
        let match;

        while ((match = varRegex.exec(code)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !varMap.has(name)) {
                varMap.set(name, '_' + this.generateConfusingName());
            }
        }
        while ((match = shortVarRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !varMap.has(name)) {
                varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        varMap.forEach((newName, oldName) => {
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
        let insideFunc = false;
        let braceDepth = 0;

        for (const line of lines) {
            result.push(line);
            const trimmed = line.trim();

            // Track if we're inside a function
            if (trimmed.startsWith('func ')) {
                insideFunc = true;
                braceDepth = 0;
            }

            // Track brace depth
            braceDepth += (trimmed.match(/{/g) || []).length;
            braceDepth -= (trimmed.match(/}/g) || []).length;

            if (braceDepth <= 0 && insideFunc) {
                insideFunc = false;
            }

            // Only inject dead code inside functions
            if (!insideFunc || braceDepth < 1) continue;

            // Don't add dead code after return, break, continue
            const hasTerminator = /\b(return|break|continue|goto)\b/.test(trimmed);
            // Only add after lines ending with opening brace
            if (Math.random() < 0.1 && !hasTerminator && trimmed.endsWith('{')) {
                result.push('\t_ = func()int{return 0}()');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove comments before minifying
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Go requires newlines, so we can't join everything on one line
        // Just remove extra whitespace and blank lines
        const lines = result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        // Remove extra spaces within lines
        result = lines.map(line => {
            return line.replace(/\s+/g, ' ')
                .replace(/\s*([{},()=+\-*/<>!&|])\s*/g, '$1')
                .replace(/\b(func|var|if|else|for|return|type|struct|range|package|import)\b(?=[^\s])/g, '$1 ');
        }).join('\n');
        return result;
    }
}
