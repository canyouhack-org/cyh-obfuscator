// C++ Obfuscator - Fixed with proper dead code, minify, and better encoding
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class CppObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
        'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
        'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
        'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
        'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
        'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline',
        'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
        'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public',
        'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed',
        'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch',
        'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef',
        'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
        'volatile', 'wchar_t', 'while', 'xor', 'xor_eq', 'std', 'cout', 'cin',
        'endl', 'string', 'vector', 'map', 'set', 'main', 'printf', 'scanf', 'include',
        'getline', 'size_t', 'NULL', 'argc', 'argv'
    ]);

    obfuscate(code: string): string {
        let result = code;

        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `__CPPSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });

        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        for (const { original, placeholder } of strings) {
            let replacement = original;
            const content = original.slice(1, -1);

            if (content.length > 0 && content.length < 100) {
                if (this.options.hexEncoding && this.options.encodeStrings) {
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
        const varRegex = /(int|long|short|char|float|double|bool|auto|string|void|size_t)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
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
            const hasTerminator = /\b(return|throw|break|continue)\b/.test(trimmed);
            if (Math.random() < 0.1 && trimmed.endsWith(';') && !hasTerminator) {
                result.push('if(0){}');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove comments before minifying
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Keep preprocessor directives on separate lines
        const preprocessor: string[] = [];
        result = result.replace(/^\s*#.*$/gm, (m) => {
            preprocessor.push(m.trim());
            return '';
        });
        // Minify
        result = result.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:.])(?!include)\s*/g, '$1');
        result = result.replace(/\b(int|void|if|else|for|while|return|class|public|private|using|namespace|struct|template)\b(?=[^\s])/g, '$1 ');
        // Prepend preprocessor directives
        if (preprocessor.length > 0) {
            result = preprocessor.join('\n') + '\n' + result.trim();
        }
        return result.trim();
    }
}
