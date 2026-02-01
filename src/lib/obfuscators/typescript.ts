// TypeScript Obfuscator - Strips types then applies JS obfuscation
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class TypeScriptObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield', 'true', 'false', 'null',
        'undefined', 'NaN', 'Infinity', 'console', 'window', 'document',
        'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
        'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'Symbol',
        'arguments', 'eval', 'async', 'await', 'of', 'atob', 'btoa',
        'TextEncoder', 'TextDecoder', 'Uint8Array', 'Function', 'type', 'interface'
    ]);

    obfuscate(code: string): string {
        // Step 0: Strip TypeScript-specific syntax to convert to JS
        let result = this.stripTypeScript(code);

        // Step 1: Remove comments
        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        // Step 2: Store strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        result = result.replace(/`(?:[^`\\]|\\.)*`/g, (match) => {
            const ph = `__TSSTR${strIdx}__`;
            strings.push({ original: match, placeholder: ph });
            strIdx++;
            return ph;
        });

        result = result.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
            const ph = `__TSSTR${strIdx}__`;
            strings.push({ original: match, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Restore and encode strings
        for (const { original, placeholder } of strings) {
            let replacement = original;

            if (!original.startsWith('`')) {
                const content = original.slice(1, -1);

                if (content.length > 0 && content.length < 100) {
                    if (this.options.base64Strings) {
                        const utf8Bytes = Array.from(new TextEncoder().encode(content));
                        const b64 = btoa(String.fromCharCode(...utf8Bytes));
                        replacement = `(new TextDecoder().decode(Uint8Array.from(atob("${b64}"),c=>c.charCodeAt(0))))`;
                    } else if (this.options.hexEncoding && this.options.encodeStrings) {
                        const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                        replacement = `"${hex}"`;
                    }
                }
            }

            result = result.replace(placeholder, replacement);
        }

        // Step 5: Dead code
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 6: Apply obfuscation based on intensity
        const intensity = this.options.intensity;

        if (intensity === 'extreme') {
            result = this.applyExtremeObfuscation(result);
        } else if (intensity === 'high') {
            result = this.applyHighObfuscation(result);
        } else if (this.options.minify) {
            result = this.minifyCode(result);
        }

        return result;
    }

    private stripTypeScript(code: string): string {
        let result = code;

        // Remove type/interface declarations entirely
        result = result.replace(/^\s*(export\s+)?(type|interface)\s+[^{]+\{[^}]*\}\s*;?\s*$/gm, '');
        result = result.replace(/^\s*(export\s+)?type\s+\w+\s*=\s*[^;]+;\s*$/gm, '');

        // Remove 'as Type' assertions
        result = result.replace(/\s+as\s+\w+(\[\])?(\s*[<>]\s*\w+)*/g, '');

        // Remove generic type parameters from functions: <T, U>
        result = result.replace(/<[^>()]+>/g, '');

        // Remove type annotations from parameters and variables: : Type
        // Be careful not to remove ternary operator colons
        result = result.replace(/:\s*\w+(\[\])?\s*(?=[,)=;}\n])/g, '');
        result = result.replace(/:\s*\w+(\[\])?\s*$/gm, '');

        // Remove access modifiers
        result = result.replace(/\b(public|private|protected|readonly)\s+/g, '');

        // Remove 'declare' keyword
        result = result.replace(/\bdeclare\s+/g, '');

        // Remove non-null assertions (!)
        result = result.replace(/!\./g, '.');
        result = result.replace(/!\s*;/g, ';');

        // Remove optional chaining type annotations
        result = result.replace(/\?\s*:/g, ':');

        // Clean up empty lines
        result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varMap = new Map<string, string>();

        const declPattern = /\b(var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;

        while ((match = declPattern.exec(code)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !varMap.has(name)) {
                varMap.set(name, this.generateConfusingName());
            }
        }

        let result = code;
        varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });

        return result;
    }

    private generateConfusingName(): string {
        const prefixes = ['_0x', '_0O', '_Il', '_lI'];
        const chars = 'O0Il1';
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        let suffix = '';
        for (let i = 0; i < 4; i++) {
            suffix += chars[Math.floor(Math.random() * chars.length)];
        }
        return prefix + suffix + Math.random().toString(16).substr(2, 4);
    }

    private injectDeadCode(code: string): string {
        const deadSnippets = ['void 0;', '(function(){})();', '!1;', '[]&&[];'];
        const lines = code.split('\n');
        const result: string[] = [];

        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.15 && (line.trim().endsWith(';') || line.trim().endsWith('}'))) {
                result.push(deadSnippets[Math.floor(Math.random() * deadSnippets.length)]);
            }
        }

        return result.join('\n');
    }

    private applyExtremeObfuscation(code: string): string {
        const minified = this.minifyCode(code);
        const utf8Bytes = Array.from(new TextEncoder().encode(minified));
        const b64 = btoa(String.fromCharCode(...utf8Bytes));
        return `eval(atob("${b64}"))`;
    }

    private applyHighObfuscation(code: string): string {
        const minified = this.minifyCode(code);
        const utf8Bytes = Array.from(new TextEncoder().encode(minified));
        const b64 = btoa(String.fromCharCode(...utf8Bytes));
        return `(new Function(atob("${b64}")))();`;
    }

    private minifyCode(code: string): string {
        let result = code;
        result = result.replace(/  +/g, ' ');
        result = result.replace(/\n\s*/g, ' ');
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:])\s*/g, '$1');
        result = result.replace(/\b(var|let|const|function|return|throw|new|typeof|if|else|for|while|do|switch|case|break|continue|try|catch|finally)\b(?=[^\s])/g, '$1 ');
        result = result.replace(/;+/g, ';');
        result = result.replace(/\s+/g, ' ');
        return result.trim();
    }
}
