// C# Obfuscator - Fixed with proper dead code, minify, and UTF-8 support
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class CSharpObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch',
        'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default',
        'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern',
        'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if',
        'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long',
        'namespace', 'new', 'null', 'object', 'operator', 'out', 'override',
        'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return',
        'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string',
        'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint',
        'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void',
        'volatile', 'while', 'var', 'Console', 'System', 'String', 'WriteLine',
        'Main', 'args', 'ReadLine', 'Write', 'Parse', 'ToString', 'Convert'
    ]);

    obfuscate(code: string): string {
        let result = code;

        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;
        // Verbatim strings
        result = result.replace(/@"(?:[^"]|"")*"/g, (m) => {
            const ph = `__CSSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });
        // Regular strings
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `__CSSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });

        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        for (const { original, placeholder } of strings) {
            let replacement = original;
            if (!original.startsWith('@')) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 100) {
                    if (this.options.base64Strings) {
                        const utf8Bytes = Array.from(new TextEncoder().encode(content));
                        const b64 = btoa(String.fromCharCode(...utf8Bytes));
                        replacement = `System.Text.Encoding.UTF8.GetString(System.Convert.FromBase64String("${b64}"))`;
                    } else if (this.options.hexEncoding && this.options.encodeStrings) {
                        // Full Unicode escape support
                        const unicode = [...content].map(c => {
                            const code = c.codePointAt(0) || 0;
                            return `\\u${code.toString(16).padStart(4, '0')}`;
                        }).join('');
                        replacement = `"${unicode}"`;
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
        const varRegex = /(int|long|string|bool|var|double|float|char|byte|short)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        while ((match = varRegex.exec(code)) !== null) {
            const name = match[2];
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
        const chars = 'O0Il1';
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
            const trimmed = line.trim();
            // Don't add dead code after return, throw, break, continue
            const hasTerminator = /\b(return|throw|break|continue)\b/.test(trimmed);
            if (Math.random() < 0.1 && trimmed.endsWith(';') && !hasTerminator) {
                result.push('if(false){}');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove comments before minifying
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Minify
        result = result.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:])\s*/g, '$1');
        result = result.replace(/\b(public|private|protected|internal|class|struct|void|int|string|bool|double|float|var|if|else|for|foreach|while|return|new|using|namespace|static)\b(?=[^\s])/g, '$1 ');
        return result.trim();
    }
}
