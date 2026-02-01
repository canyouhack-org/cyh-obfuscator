// PHP Obfuscator - Fixed with proper dead code, minify, and better encoding
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class PhpObfuscator extends BaseObfuscator {
    private reserved = new Set([
        '__halt_compiler', 'abstract', 'and', 'array', 'as', 'break', 'callable',
        'case', 'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default',
        'die', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor',
        'endforeach', 'endif', 'endswitch', 'endwhile', 'eval', 'exit', 'extends',
        'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'goto',
        'if', 'implements', 'include', 'include_once', 'instanceof', 'insteadof',
        'interface', 'isset', 'list', 'match', 'namespace', 'new', 'or', 'print',
        'private', 'protected', 'public', 'require', 'require_once', 'return',
        'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield',
        'true', 'false', 'null', '$this', '$_GET', '$_POST', '$_SESSION', '$_SERVER',
        '$_REQUEST', '$_FILES', '$_ENV', '$_COOKIE', 'self', 'parent'
    ]);

    obfuscate(code: string): string {
        let result = code;

        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
            result = this.removeSingleLineComments(result, '#');
        }

        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;
        result = result.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `__PHPSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });

        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        for (const { original, placeholder } of strings) {
            let replacement = original;
            const content = original.slice(1, -1);

            if (content.length > 0 && content.length < 100) {
                if (this.options.base64Strings) {
                    const utf8Bytes = Array.from(new TextEncoder().encode(content));
                    const b64 = btoa(String.fromCharCode(...utf8Bytes));
                    replacement = `base64_decode('${b64}')`;
                } else if (this.options.hexEncoding && this.options.encodeStrings) {
                    const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                    replacement = `"${hex}"`;
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
        const varRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = varRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has('$' + name) && !varMap.has(name) && !name.startsWith('_')) {
                varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\$${oldName}\\b`, 'g'), `$${newName}`);
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
            const trimmed = line.trim();
            // Don't add dead code after return, throw, break, continue
            const hasTerminator = /\b(return|throw|break|continue|exit|die)\b/.test(trimmed);
            if (Math.random() < 0.1 && trimmed.endsWith(';') && !hasTerminator) {
                result.push('if(0){}');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove comments before minifying - they break single-line output
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/#.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Minify
        result = result.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:.])(?!\?)\s*/g, '$1');
        result = result.replace(/\b(function|if|else|for|foreach|while|return|class|public|private|protected|echo|new|static)\b(?=[^\s])/g, '$1 ');
        return result.trim();
    }
}
