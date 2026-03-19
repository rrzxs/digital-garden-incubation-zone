(function attachIncubatorMarkdown(globalScope) {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeUrl(rawUrl) {
        try {
            const url = new URL(rawUrl, globalScope.location?.origin || 'https://rrzxs.com');
            if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
                return url.href;
            }
        } catch {
            return '#';
        }
        return '#';
    }

    function renderInlineMarkdown(source) {
        const tokens = [];
        let text = String(source ?? '');

        text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
            const tokenIndex = tokens.push({
                type: 'link',
                label: escapeHtml(label),
                href: sanitizeUrl(href)
            }) - 1;
            return `@@MD_TOKEN_${tokenIndex}@@`;
        });

        text = text.replace(/`([^`\n]+)`/g, (_, code) => {
            const tokenIndex = tokens.push({
                type: 'code',
                code: escapeHtml(code)
            }) - 1;
            return `@@MD_TOKEN_${tokenIndex}@@`;
        });

        text = escapeHtml(text);
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');

        return text.replace(/@@MD_TOKEN_(\d+)@@/g, (_, index) => {
            const token = tokens[Number(index)];
            if (!token) {
                return '';
            }
            if (token.type === 'link') {
                return `<a href="${token.href}" target="_blank" rel="noreferrer noopener">${token.label}</a>`;
            }
            if (token.type === 'code') {
                return `<code>${token.code}</code>`;
            }
            return '';
        });
    }

    function renderParagraphBlock(block) {
        return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br>')}</p>`;
    }

    function renderListBlock(block) {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
        const tag = ordered ? 'ol' : 'ul';
        const items = lines.map((line) => {
            const content = ordered ? line.replace(/^\d+\.\s+/, '') : line.replace(/^[-*]\s+/, '');
            return `<li>${renderInlineMarkdown(content)}</li>`;
        }).join('');
        return `<${tag}>${items}</${tag}>`;
    }

    function renderHeadingBlock(block) {
        const match = block.match(/^(#{1,6})\s+(.+)$/);
        if (!match) {
            return null;
        }
        const level = match[1].length;
        return `<h${level}>${renderInlineMarkdown(match[2])}</h${level}>`;
    }

    function renderQuoteBlock(block) {
        const lines = block.split('\n').map((line) => line.replace(/^>\s?/, ''));
        return `<blockquote>${lines.map((line) => `<p>${renderInlineMarkdown(line)}</p>`).join('')}</blockquote>`;
    }

    function renderMarkdown(source) {
        const codeBlocks = [];
        const normalized = String(source ?? '').replace(/\r\n/g, '\n').trim();
        if (!normalized) {
            return '<p></p>';
        }

        const withPlaceholders = normalized.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_, language, code) => {
            const tokenIndex = codeBlocks.push({
                language: escapeHtml(language || ''),
                code: escapeHtml(code.trimEnd())
            }) - 1;
            return `@@MD_CODE_BLOCK_${tokenIndex}@@`;
        });

        const blocks = withPlaceholders.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
        const html = blocks.map((block) => {
            const codeMatch = block.match(/^@@MD_CODE_BLOCK_(\d+)@@$/);
            if (codeMatch) {
                const codeBlock = codeBlocks[Number(codeMatch[1])];
                const languageClass = codeBlock.language ? ` class="language-${codeBlock.language}"` : '';
                return `<pre class="md-code-block"><code${languageClass}>${codeBlock.code}</code></pre>`;
            }

            const heading = renderHeadingBlock(block);
            if (heading) {
                return heading;
            }

            if (block.split('\n').every((line) => /^\d+\.\s+/.test(line.trim())) || block.split('\n').every((line) => /^[-*]\s+/.test(line.trim()))) {
                return renderListBlock(block);
            }

            if (block.split('\n').every((line) => /^>\s?/.test(line.trim()))) {
                return renderQuoteBlock(block);
            }

            return renderParagraphBlock(block);
        }).join('');

        return html;
    }

    globalScope.DigitalGardenIncubatorMarkdown = {
        escapeHtml,
        renderMarkdown
    };
})(typeof window !== 'undefined' ? window : globalThis);
