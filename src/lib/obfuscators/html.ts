// HTML Obfuscator - Works with CSS obfuscator for class/id renaming
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class HtmlObfuscator extends BaseObfuscator {
    constructor(options: ObfuscationOptions) {
        super(options);
    }

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Remove HTML comments
        if (this.options.removeComments) {
            result = result.replace(/<!--[\s\S]*?-->/g, '');
        }

        // Step 2: Rename classes and IDs
        if (this.options.renameVariables) {
            result = this.renameClassesAndIds(result);
        }

        // Step 3: Encode text content
        if (this.options.encodeStrings) {
            result = this.encodeTextContent(result);
        }

        // Step 4: Obfuscate inline CSS
        result = this.obfuscateInlineStyles(result);

        // Step 5: Obfuscate inline JavaScript
        result = this.obfuscateInlineScript(result);

        // Step 6: Minify
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyHtml(result);
        }

        return result;
    }

    private renameClassesAndIds(code: string): string {
        let result = code;

        // Rename class attributes
        result = result.replace(/class\s*=\s*["']([^"']+)["']/gi, (match, classes) => {
            const newClasses = classes.split(/\s+/).map((cls: string) => {
                if (cls.trim().length === 0) return cls;
                if (!this.variableMap.has(cls)) {
                    this.variableMap.set(cls, this.generateObfuscatedName());
                }
                return this.variableMap.get(cls);
            }).join(' ');
            return `class="${newClasses}"`;
        });

        // Rename id attributes
        result = result.replace(/id\s*=\s*["']([^"']+)["']/gi, (match, id) => {
            if (!this.variableMap.has(id)) {
                this.variableMap.set(id, this.generateObfuscatedName());
            }
            return `id="${this.variableMap.get(id)}"`;
        });

        // Rename for attributes (labels)
        result = result.replace(/for\s*=\s*["']([^"']+)["']/gi, (match, forId) => {
            const newId = this.variableMap.get(forId);
            return newId ? `for="${newId}"` : match;
        });

        // Rename href="#id" references
        result = result.replace(/href\s*=\s*["']#([^"']+)["']/gi, (match, id) => {
            const newId = this.variableMap.get(id);
            return newId ? `href="#${newId}"` : match;
        });

        return result;
    }

    private encodeTextContent(code: string): string {
        // Encode text between tags (but not inside script/style)
        return code.replace(/>([^<]+)</g, (match, text) => {
            if (text.trim().length === 0) return match;

            // Convert to HTML entities
            const encoded = text.split('').map((c: string) => {
                if (c === ' ' || c === '\n' || c === '\t') return c;
                const code = c.charCodeAt(0);
                // Only encode printable ASCII
                if (code >= 32 && code <= 126 && c !== '&' && c !== '<' && c !== '>') {
                    return `&#${code};`;
                }
                return c;
            }).join('');

            return `>${encoded}<`;
        });
    }

    private obfuscateInlineStyles(code: string): string {
        // Find <style> tags and minify CSS inside
        return code.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
            // Minify CSS
            let minified = css
                .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove comments
                .replace(/\s+/g, ' ')
                .replace(/\s*{\s*/g, '{')
                .replace(/\s*}\s*/g, '}')
                .replace(/\s*:\s*/g, ':')
                .replace(/\s*;\s*/g, ';')
                .trim();

            // Rename class selectors in CSS (sync with HTML)
            this.variableMap.forEach((newName, oldName) => {
                minified = minified.replace(new RegExp(`\\.${this.escapeRegex(oldName)}\\b`, 'g'), '.' + newName);
                minified = minified.replace(new RegExp(`#${this.escapeRegex(oldName)}\\b`, 'g'), '#' + newName);
            });

            return `<style>${minified}</style>`;
        });
    }

    private obfuscateInlineScript(code: string): string {
        // Find <script> tags and minify JS inside
        return code.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
            if (js.trim().length === 0) return match;

            // Basic minification
            let minified = js
                .replace(/\/\/[^\n]*/g, '')  // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
                .replace(/\s+/g, ' ')
                .trim();

            // Rename getElementById/querySelector references
            this.variableMap.forEach((newName, oldName) => {
                minified = minified.replace(new RegExp(`getElementById\\s*\\(\\s*['"]${this.escapeRegex(oldName)}['"]\\s*\\)`, 'g'), `getElementById('${newName}')`);
                minified = minified.replace(new RegExp(`querySelector\\s*\\(\\s*['"]#${this.escapeRegex(oldName)}['"]\\s*\\)`, 'g'), `querySelector('#${newName}')`);
                minified = minified.replace(new RegExp(`querySelector\\s*\\(\\s*['"]\\.${this.escapeRegex(oldName)}['"]\\s*\\)`, 'g'), `querySelector('.${newName}')`);
            });

            return `<script>${minified}</script>`;
        });
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private generateObfuscatedName(): string {
        const chars = 'OoIl';
        const allChars = 'OoIl10';
        let name = chars[Math.floor(Math.random() * chars.length)];
        for (let i = 0; i < 5; i++) {
            name += allChars[Math.floor(Math.random() * allChars.length)];
        }
        this.counter++;
        return name + this.counter;
    }

    private minifyHtml(code: string): string {
        return code
            .replace(/>\s+</g, '><')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n\s*/g, '')
            .trim();
    }

    // Export variable map for CSS sync
    getVariableMap(): Map<string, string> {
        return this.variableMap;
    }
}
