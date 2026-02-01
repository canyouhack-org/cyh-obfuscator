// JavaScript/TypeScript Obfuscator - Hardcore Edition
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class JavaScriptObfuscator extends BaseObfuscator {
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
        'TextEncoder', 'TextDecoder', 'Uint8Array', 'Function', 'parseInt',
        'parseFloat', 'isNaN', 'isFinite', 'decodeURI', 'encodeURI',
        'decodeURIComponent', 'encodeURIComponent', 'escape', 'unescape'
    ]);

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Remove comments
        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        // Step 2: Store strings to protect them
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        result = result.replace(/`(?:[^`\\]|\\.)*`/g, (match) => {
            const ph = `__JSSTR${strIdx}__`;
            strings.push({ original: match, placeholder: ph });
            strIdx++;
            return ph;
        });

        result = result.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
            const ph = `__JSSTR${strIdx}__`;
            strings.push({ original: match, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 3: Rename variables with confusing names
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
                        const hex = content.split('').map(c => {
                            const code = c.charCodeAt(0);
                            if (code < 128 && code > 31) {
                                return `\\x${code.toString(16).padStart(2, '0')}`;
                            }
                            return c;
                        }).join('');
                        replacement = `"${hex}"`;
                    } else if (this.options.unicodeEscape && this.options.encodeStrings) {
                        const unicode = content.split('').map(c => {
                            const code = c.charCodeAt(0);
                            if (code < 128 && code > 31) {
                                return `\\u${code.toString(16).padStart(4, '0')}`;
                            }
                            return c;
                        }).join('');
                        replacement = `"${unicode}"`;
                    }
                }
            }

            result = result.replace(placeholder, replacement);
        }

        // Step 5: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCodeSafe(result);
        }

        // Step 6: Apply hardcore obfuscation based on intensity
        const intensity = this.options.intensity;

        if (intensity === 'extreme') {
            // Most complex: Array rotation + Function constructor + eval layers
            result = this.applyExtremeObfuscation(result);
        } else if (intensity === 'high') {
            // Function constructor + base64 eval
            result = this.applyHighObfuscation(result);
        } else if (this.options.minify) {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varMap = new Map<string, string>();

        // Strip TypeScript type annotations that break JS
        let result = code;
        // Remove type annotations from parameters: (a: string, b: number) -> (a, b)
        result = result.replace(/:\s*\w+(\[\])?\s*(?=[,)=])/g, '');
        // Remove return type annotations: function foo(): string { -> function foo() {
        result = result.replace(/\)\s*:\s*\w+(\[\])?\s*\{/g, ') {');
        // Remove type declarations from variables: let x: number = -> let x =
        result = result.replace(/:\s*\w+(\[\])?\s*=/g, ' =');

        const declPattern = /\b(var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;

        while ((match = declPattern.exec(result)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !varMap.has(name)) {
                varMap.set(name, this.generateConfusingName());
            }
        }

        const funcPattern = /function\s*[a-zA-Z_$]*\s*\(([^)]*)\)/g;
        while ((match = funcPattern.exec(result)) !== null) {
            const params = match[1].split(',').map(p => p.trim().split('=')[0].trim());
            for (const param of params) {
                if (param && !this.reserved.has(param) && !varMap.has(param)) {
                    varMap.set(param, this.generateConfusingName());
                }
            }
        }

        const arrowPattern = /\(([^)]*)\)\s*=>/g;
        while ((match = arrowPattern.exec(result)) !== null) {
            const params = match[1].split(',').map(p => p.trim().split('=')[0].trim());
            for (const param of params) {
                if (param && !this.reserved.has(param) && !varMap.has(param)) {
                    varMap.set(param, this.generateConfusingName());
                }
            }
        }

        varMap.forEach((newName, oldName) => {
            const regex = new RegExp(`\\b${oldName}\\b`, 'g');
            result = result.replace(regex, newName);
        });

        return result;
    }

    private generateConfusingName(): string {
        // Generate names with similar looking characters
        const prefixes = ['_0x', '_0O', '_Il', '_lI', '_O0'];
        const chars = 'O0Il1';
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        let suffix = '';
        for (let i = 0; i < 4; i++) {
            suffix += chars[Math.floor(Math.random() * chars.length)];
        }
        return prefix + suffix + Math.random().toString(16).substr(2, 4);
    }

    private injectDeadCodeSafe(code: string): string {
        const deadSnippets = [
            'void 0;',
            '(function(){})();',
            '!1;',
        ];
        const lines = code.split('\n');
        const result: string[] = [];

        for (const line of lines) {
            result.push(line);
            const trimmed = line.trim();
            // Don't add dead code after return, throw, break, continue
            const hasTerminator = /\b(return|throw|break|continue)\b/.test(trimmed);
            if (Math.random() < 0.15 && (trimmed.endsWith(';') || trimmed.endsWith('}')) && !hasTerminator) {
                result.push(deadSnippets[Math.floor(Math.random() * deadSnippets.length)]);
            }
        }

        return result.join('\n');
    }

    private applyExtremeObfuscation(code: string): string {
        // Minify first
        let processed = this.minifyCode(code);

        // Extract strings and create string array
        const strings: string[] = [];
        processed = processed.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
            const idx = strings.length;
            strings.push(match);
            return `_0x${idx.toString(16)}()`;
        });

        // Create string decoder functions
        const decoders = strings.map((s, i) => {
            const chars = s.slice(1, -1).split('').map(c => c.charCodeAt(0));
            const key = Math.floor(Math.random() * 50) + 10;
            const encoded = chars.map((c, j) => (c ^ (key + j)) & 0xFF);
            return `function _0x${i.toString(16)}(){var a=[${encoded.join(',')}],s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]^(${key}+i));return s;}`;
        }).join('');

        // Debugger protection
        const antiDebug = `(function(){var t=0;setInterval(function(){var s=Date.now();debugger;t+=(Date.now()-s>100)?1:0;if(t>2)while(1){}},100)})();`;

        // Self-defending code check
        const selfDefend = `(function(){try{var f=arguments.callee.toString();if(f.length<${processed.length / 2})while(1){}}catch(e){}})();`;

        return `${antiDebug}${selfDefend}${decoders}${processed}`;
    }

    private applyHighObfuscation(code: string): string {
        // Minify first
        let processed = this.minifyCode(code);

        // Debugger trap
        const debugTrap = `(function(){var d=new Date();debugger;if(new Date()-d>50)while(1){}})();`;

        // Hex encode all strings
        processed = processed.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
            const content = match.slice(1, -1);
            const hex = content.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
            return `"${hex}"`;
        });

        return `${debugTrap}${processed}`;
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove comments before minifying - they break single-line output
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        result = result.replace(/  +/g, ' ');
        result = result.replace(/\n\s*/g, ' ');
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:])\s*/g, '$1');
        result = result.replace(/\b(var|let|const|function|return|throw|new|typeof|if|else|for|while|do|switch|case|break|continue|try|catch|finally)\b(?=[^\s])/g, '$1 ');
        result = result.replace(/;+/g, ';');
        result = result.replace(/\s+/g, ' ');
        result = result.trim();
        return result;
    }
}
