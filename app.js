// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  VJudge 美化增强脚本 - 支持字体切换、背景设置、界面美化
// @author       VJudgeBetter Team
// @match        https://vjudge.net/*
// @match        https://cn.vjudge.net/*
// @exclude      *iframe*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_uploadBlob
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 【关键修复】确保只在主框架运行，防止在题面 iframe 中重复执行
    if (window.top !== window.self) {
        console.log('[VJudgeBetter] Skipping execution in iframe');
        return;
    }

    console.log('[VJudgeBetter] Initializing in main frame only');

    // ==================== 配置管理 ====================
    const CONFIG = {
        storagePrefix: 'VJB_',
        defaultFont: 'system-ui',
        defaultBgOpacity: 0.8,
        defaultBgType: 'image',
        supportedImageFormats: ['.jpg', '.jpeg', '.png', '.webp'],
        supportedAnimatedFormats: ['.gif'],
        supportedVideoFormats: ['.mp4', '.webm']
    };

    // ==================== 字体列表（分类） ====================
    const FONT_CATEGORIES = {
        code: {
            name: '代码字体',
            fonts: [
                'Consolas', 'Courier New', 'Courier', 'Monaco', 'monospace',
                'Menlo', 'Lucida Console', 'Andale Mono', 'DejaVu Sans Mono',
                'Fira Code', 'Source Code Pro', 'JetBrains Mono', 'JetBrains Mono NL',
                'Hack', 'Inconsolata', 'Roboto Mono', 'Ubuntu Mono', 'Droid Sans Mono',
                'PT Mono', 'Anonymous Pro', 'Envy Code R', 'PragmataPro',
                'Input Mono', 'Cascadia Code', 'IBM Plex Mono', 'Overpass Mono',
                'Fira Mono', 'SFMono-Regular', 'JetBrains Mono NF', 'Cascadia Mono'
            ]
        },
        problem: {
            name: '题面字体',
            fonts: [
                'Georgia', 'Times New Roman', 'Palatino', 'Palatino Linotype',
                'Book Antiqua', 'Garamond', 'Baskerville', 'Didot', 'Hoefler Text',
                'Cambria', 'Constantia', 'serif', 'Merriweather', 'Playfair Display',
                'Lora', 'PT Serif', 'Source Serif Pro', 'Libre Baskerville',
                'Crimson Text', 'EB Garamond', 'Cormorant Garamond', 'Vollkorn',
                'Cardo', 'Gentium Plus', 'Linux Libertine O', 'Charis SIL'
            ]
        },
        other: {
            name: '其他内容字体',
            fonts: [
                'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
                'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
                'Verdana', 'Tahoma', 'Trebuchet MS', 'Lucida Sans', 'Lucida Grande',
                'Franklin Gothic Medium', 'Gill Sans', 'Optima', 'Futura',
                'Century Gothic', 'Avant Garde', 'Myriad Pro', 'Myriad Set Pro',
                'Proxima Nova', 'Open Sans', 'Lato', 'Montserrat', 'Raleway',
                'Poppins', 'Nunito', 'Quicksand', 'Oswald', 'Merriweather Sans',
                'Work Sans', 'Inter', 'DM Sans', 'IBM Plex Sans', 'Fira Sans',
                'Source Sans Pro', 'PT Sans', 'Ubuntu', 'Cantarell', 'Droid Sans',
                'Google Sans', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB',
                'WenQuanYi Micro Hei', 'Noto Sans CJK SC', 'Source Han Sans CN',
                'Heiti SC', 'STHeiti', 'SimSun', 'Microsoft JhengHei', 'MingLiU',
                'PMingLiU', 'DFKai-SB', 'KaiTi', 'FangSong', 'Meiryo', 'Yu Gothic',
                'Malgun Gothic', 'Nanum Gothic', 'Segoe UI Emoji', 'Apple Color Emoji',
                'Noto Color Emoji', 'Impact', 'Arial Black', 'Comic Sans MS',
                'Pacifico', 'Dancing Script', 'Lobster', 'Great Vibes'
            ]
        }
    };

    // ==================== 字体检测 ====================
    function detectAvailableFonts(category) {
        const fonts = FONT_CATEGORIES[category]?.fonts || [];
        const detectedFonts = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const testText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const fontSize = 72;
        const width = 200;
        const height = 100;

        canvas.width = width;
        canvas.height = height;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        fonts.forEach(font => {
            ctx.font = `${fontSize}px "${font}"`;
            const metrics = ctx.measureText(testText);
            const textWidth = metrics.width;

            if (textWidth > 0) {
                const fontName = font.replace(/['"]/g, '');
                if (!detectedFonts.includes(fontName)) {
                    detectedFonts.push(fontName);
                }
            }
        });

        if (detectedFonts.length < 3) {
            return fonts.slice(0, 15);
        }

        return detectedFonts;
    }

    // ==================== 样式注入 ====================
    function injectStyles() {
        const styles = `
            /* 全局字体设置 - 分类控制 */
            body, .container-fluid, .navbar, .btn, input:not(.code-input), select:not(.code-input), textarea:not(.code-input) {
                font-family: var(--vjb-font-other, system-ui) !important;
            }

            /* 代码区域字体 */
            pre, code, .CodeMirror, .ace_editor, textarea.code-input, .code-input, 
            .form-control.code, .problem-code, .submit-code, .editor-container,
            .ace-content, .cm-content, .monaco-editor {
                font-family: var(--vjb-font-code, Consolas, monospace) !important;
            }

            /* 题面区域字体 */
            .problem-statement, .problem-description, .problem-content, 
            .statement-body, .markdown-body, .problem-text, .rich-text,
            .mathjax, .katex, .equation {
                font-family: var(--vjb-font-problem, Georgia, serif) !important;
            }

            /* 背景容器 */
            #vjb-background-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -9999;
                overflow: hidden;
                pointer-events: none;
            }

            #vjb-background-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: var(--vjb-bg-opacity, 0.8);
                transition: opacity 0.3s ease;
            }

            #vjb-background-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: var(--vjb-bg-opacity, 0.8);
                transition: opacity 0.3s ease;
            }

            /* 提交界面美化 */
            .vjb-submit-page .form-control,
            .vjb-submit-page .panel,
            .vjb-submit-page .well {
                background: rgba(255, 255, 255, 0.9) !important;
                backdrop-filter: blur(10px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }

            .vjb-submit-page .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border: none;
                border-radius: 8px;
                padding: 10px 24px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .vjb-submit-page .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }

            .vjb-submit-page .btn-primary:active {
                transform: translateY(0);
            }

            /* 比赛榜单美化 */
            .vjb-contest-standings .table {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }

            .vjb-contest-standings .table thead {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .vjb-contest-standings .table tbody tr:nth-child(even) {
                background: rgba(248, 249, 250, 0.5);
            }

            .vjb-contest-standings .table tbody tr:hover {
                background: rgba(102, 126, 234, 0.1);
                transform: scale(1.01);
                transition: all 0.2s ease;
            }

            /* AC/WA 状态颜色优化 */
            .vjb-contest-standings td.accepted,
            .vjb-status.accepted {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
                color: white;
                font-weight: bold;
            }

            .vjb-contest-standings td.wrong-answer,
            .vjb-status.wrong-answer {
                background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%) !important;
                color: white;
                font-weight: bold;
            }

            .vjb-contest-standings td.time-limit-exceeded,
            .vjb-status.time-limit-exceeded {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
                color: white;
                font-weight: bold;
            }

            .vjb-contest-standings td.memory-limit-exceeded,
            .vjb-status.memory-limit-exceeded {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
                color: white;
                font-weight: bold;
            }

            .vjb-contest-standings td.compilation-error,
            .vjb-status.compilation-error {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
                color: white;
                font-weight: bold;
            }

            /* 奖牌样式 */
            .vjb-medal-gold {
                background: linear-gradient(135deg, #ffd700 0%, #ffec8b 100%) !important;
                color: #333;
                font-weight: bold;
            }

            .vjb-medal-silver {
                background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%) !important;
                color: #333;
                font-weight: bold;
            }

            .vjb-medal-bronze {
                background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%) !important;
                color: white;
                font-weight: bold;
            }

            /* 设置面板样式 */
            #vjb-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 30px;
                z-index: 100000;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 650px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                display: none;
            }

            #vjb-settings-panel.active {
                display: block;
                animation: vjb-fade-in 0.3s ease;
            }

            @keyframes vjb-fade-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            #vjb-settings-panel h2 {
                margin-top: 0;
                color: #667eea;
                border-bottom: 2px solid #667eea;
                padding-bottom: 10px;
            }

            #vjb-settings-panel h3 {
                color: #333;
                margin-top: 20px;
                margin-bottom: 10px;
                font-size: 16px;
            }

            #vjb-settings-panel .setting-group {
                margin-bottom: 15px;
            }

            #vjb-settings-panel label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
            }

            #vjb-settings-panel select,
            #vjb-settings-panel input[type="file"],
            #vjb-settings-panel input[type="range"] {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
            }

            #vjb-settings-panel input[type="range"] {
                padding: 0;
                height: 8px;
            }

            #vjb-settings-panel .checkbox-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            #vjb-settings-panel .checkbox-group input[type="checkbox"] {
                width: auto;
            }

            #vjb-settings-panel .btn-close {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                width: 100%;
                margin-top: 20px;
            }

            #vjb-settings-panel .btn-close:hover {
                opacity: 0.9;
            }

            #vjb-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99999;
                display: none;
            }

            #vjb-overlay.active {
                display: block;
            }

            /* 浮动按钮样式 */
            #vjb-float-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
                cursor: pointer;
                z-index: 99997;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                padding: 0;
            }

            #vjb-float-btn:hover {
                transform: scale(1.1) rotate(30deg);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.7);
            }

            #vjb-float-btn svg {
                width: 28px;
                height: 28px;
                fill: white;
            }

            /* 快捷键提示 */
            #vjb-shortcut-hint {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(102, 126, 234, 0.9);
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 99998;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            #vjb-shortcut-hint.show {
                opacity: 1;
            }
        `;

        GM_addStyle(styles);
    }

    // ==================== 背景管理 ====================
    class BackgroundManager {
        constructor() {
            this.container = null;
            this.imageElement = null;
            this.videoElement = null;
            this.init();
        }

        init() {
            this.container = document.createElement('div');
            this.container.id = 'vjb-background-container';
            document.documentElement.appendChild(this.container);
            this.loadBackground();
        }

        loadBackground() {
            const bgData = GM_getValue(CONFIG.storagePrefix + 'background');
            const bgType = GM_getValue(CONFIG.storagePrefix + 'bgType', 'image');
            const opacity = GM_getValue(CONFIG.storagePrefix + 'bgOpacity', CONFIG.defaultBgOpacity);

            this.setOpacity(opacity);

            if (bgData && bgData.data) {
                if (bgType === 'video') {
                    this.setVideoBackground(bgData.data, bgData.name);
                } else {
                    this.setImageBackground(bgData.data, bgData.name);
                }
            }
        }

        setImageBackground(dataUrl, filename) {
            if (this.videoElement) {
                this.videoElement.remove();
                this.videoElement = null;
            }

            if (!this.imageElement) {
                this.imageElement = document.createElement('img');
                this.imageElement.id = 'vjb-background-image';
                this.container.appendChild(this.imageElement);
            }

            this.imageElement.src = dataUrl;
            this.imageElement.alt = filename || 'Background';
        }

        setVideoBackground(dataUrl, filename) {
            if (this.imageElement) {
                this.imageElement.remove();
                this.imageElement = null;
            }

            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'vjb-background-video';
                this.videoElement.autoplay = true;
                this.videoElement.loop = true;
                this.videoElement.muted = true;
                this.videoElement.playsInline = true;
                this.container.appendChild(this.videoElement);
            }

            this.videoElement.src = dataUrl;
        }

        setOpacity(opacity) {
            document.documentElement.style.setProperty('--vjb-bg-opacity', opacity);
            GM_setValue(CONFIG.storagePrefix + 'bgOpacity', opacity);
        }

        clearBackground() {
            if (this.imageElement) {
                this.imageElement.src = '';
            }
            if (this.videoElement) {
                this.videoElement.src = '';
            }
            GM_deleteValue(CONFIG.storagePrefix + 'background');
            GM_deleteValue(CONFIG.storagePrefix + 'bgType');
        }

        getFileType(filename) {
            const ext = '.' + filename.split('.').pop().toLowerCase();
            if (CONFIG.supportedVideoFormats.includes(ext)) {
                return 'video';
            }
            return 'image';
        }
    }

    // ==================== 字体管理 ====================
    class FontManager {
        constructor() {
            this.init();
        }

        async init() {
            this.loadFonts();
        }

        loadFonts() {
            const codeFont = GM_getValue(CONFIG.storagePrefix + 'fontCode', 'Consolas');
            const problemFont = GM_getValue(CONFIG.storagePrefix + 'fontProblem', 'Georgia');
            const otherFont = GM_getValue(CONFIG.storagePrefix + 'fontOther', 'system-ui');

            this.setFont('code', codeFont);
            this.setFont('problem', problemFont);
            this.setFont('other', otherFont);
        }

        setFont(category, fontName) {
            const cssVar = `--vjb-font-${category}`;
            document.documentElement.style.setProperty(cssVar, fontName);
            GM_setValue(CONFIG.storagePrefix + `font${category.charAt(0).toUpperCase() + category.slice(1)}`, fontName);
        }

        getAvailableFonts(category) {
            return detectAvailableFonts(category);
        }
    }

    // ==================== 界面美化 ====================
    class UIEnhancer {
        constructor() {
            this.observer = null;
            this.init();
        }

        init() {
            this.setupObserver();
            setTimeout(() => this.applyEnhancements(), 500);
        }

        setupObserver() {
            this.observer = new MutationObserver((mutations) => {
                let shouldApply = false;
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length > 0) {
                        shouldApply = true;
                    }
                });

                if (shouldApply) {
                    this.applyEnhancements();
                }
            });

            if (document.body) {
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }

        applyEnhancements() {
            const url = window.location.href;

            if (url.includes('/submit') || url.includes('/problem')) {
                document.querySelectorAll('.form-horizontal, .panel-default').forEach(el => {
                    el.closest('.container')?.classList.add('vjb-submit-page');
                });
            }

            if (url.includes('/contest') && (url.includes('/standing') || url.includes('/rank'))) {
                document.querySelectorAll('.standings, .table-responsive').forEach(el => {
                    el.classList.add('vjb-contest-standings');
                    this.enhanceStandingsTable(el);
                });
            }
        }

        enhanceStandingsTable(container) {
            const table = container.querySelector('table');
            if (!table) return;

            table.querySelectorAll('td').forEach(td => {
                const text = td.textContent.trim().toLowerCase();

                if (text.includes('accepted') || text === 'ac' || td.classList.contains('success')) {
                    td.classList.add('accepted');
                } else if (text.includes('wrong') || text === 'wa' || td.classList.contains('danger')) {
                    td.classList.add('wrong-answer');
                } else if (text.includes('time limit')) {
                    td.classList.add('time-limit-exceeded');
                } else if (text.includes('memory limit')) {
                    td.classList.add('memory-limit-exceeded');
                } else if (text.includes('compilation')) {
                    td.classList.add('compilation-error');
                }
            });

            table.querySelectorAll('tr').forEach((tr, index) => {
                if (index === 0) return;

                const rankCell = tr.querySelector('td:first-child');
                if (!rankCell) return;

                const rank = parseInt(rankCell.textContent);
                if (rank <= 1) {
                    tr.classList.add('vjb-medal-gold');
                } else if (rank <= 3) {
                    tr.classList.add('vjb-medal-silver');
                } else if (rank <= 5) {
                    tr.classList.add('vjb-medal-bronze');
                }
            });
        }
    }

    // ==================== 设置面板 ====================
    class SettingsPanel {
        constructor(backgroundManager, fontManager) {
            this.backgroundManager = backgroundManager;
            this.fontManager = fontManager;
            this.panel = null;
            this.overlay = null;
            this.hint = null;
            this.floatBtn = null;
            this.init();
        }

        init() {
            this.createFloatButton();
            this.createPanel();
            this.createOverlay();
            this.createShortcutHint();
            this.bindEvents();
            this.registerMenuCommands();
        }

        createFloatButton() {
            this.floatBtn = document.createElement('button');
            this.floatBtn.id = 'vjb-float-btn';
            this.floatBtn.title = 'VJudgeBetter 设置';
            this.floatBtn.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
            `;
            document.body.appendChild(this.floatBtn);
        }

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.id = 'vjb-settings-panel';

            const codeFonts = this.fontManager.getAvailableFonts('code');
            const problemFonts = this.fontManager.getAvailableFonts('problem');
            const otherFonts = this.fontManager.getAvailableFonts('other');

            const currentCodeFont = GM_getValue(CONFIG.storagePrefix + 'fontCode', 'Consolas');
            const currentProblemFont = GM_getValue(CONFIG.storagePrefix + 'fontProblem', 'Georgia');
            const currentOtherFont = GM_getValue(CONFIG.storagePrefix + 'fontOther', 'system-ui');
            const currentOpacity = GM_getValue(CONFIG.storagePrefix + 'bgOpacity', CONFIG.defaultBgOpacity);

            this.panel.innerHTML = `
                <h2>🎨 VJudgeBetter 设置</h2>

                <h3>⌨️ 代码字体</h3>
                <div class="setting-group">
                    <select id="vjb-font-code">
                        ${codeFonts.map(font =>
                            `<option value="${font}" ${font === currentCodeFont ? 'selected' : ''}>${font}</option>`
                        ).join('')}
                    </select>
                </div>

                <h3>📖 题面字体</h3>
                <div class="setting-group">
                    <select id="vjb-font-problem">
                        ${problemFonts.map(font =>
                            `<option value="${font}" ${font === currentProblemFont ? 'selected' : ''}>${font}</option>`
                        ).join('')}
                    </select>
                </div>

                <h3>🌐 其他内容字体</h3>
                <div class="setting-group">
                    <select id="vjb-font-other">
                        ${otherFonts.map(font =>
                            `<option value="${font}" ${font === currentOtherFont ? 'selected' : ''}>${font}</option>`
                        ).join('')}
                    </select>
                </div>

                <h3>🖼️ 背景设置</h3>
                <div class="setting-group">
                    <label for="vjb-bg-file">上传背景图片/视频</label>
                    <input type="file" id="vjb-bg-file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm">
                    <small style="color: #666; display: block; margin-top: 5px;">
                        支持格式：JPG, PNG, WebP, GIF (可选), MP4, WebM (可选)
                    </small>
                </div>

                <div class="setting-group">
                    <label for="vjb-bg-opacity">背景透明度：${Math.round(currentOpacity * 100)}%</label>
                    <input type="range" id="vjb-bg-opacity" min="0" max="100" value="${Math.round(currentOpacity * 100)}">
                </div>

                <div class="setting-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="vjb-enable-gif" ${GM_getValue(CONFIG.storagePrefix + 'enableGif', false) ? 'checked' : ''}>
                        <label for="vjb-enable-gif" style="margin: 0;">启用 GIF 背景支持</label>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="vjb-enable-video" ${GM_getValue(CONFIG.storagePrefix + 'enableVideo', false) ? 'checked' : ''}>
                        <label for="vjb-enable-video" style="margin: 0;">启用视频背景支持 (MP4/WebM)</label>
                    </div>
                </div>

                <div class="setting-group">
                    <button id="vjb-clear-bg" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%;">
                        🗑️ 清除背景
                    </button>
                </div>

                <button class="btn-close" id="vjb-close-settings">关闭设置</button>
            `;

            document.body.appendChild(this.panel);
        }

        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.id = 'vjb-overlay';
            document.body.appendChild(this.overlay);
        }

        createShortcutHint() {
            this.hint = document.createElement('div');
            this.hint.id = 'vjb-shortcut-hint';
            this.hint.textContent = '⌨️ 按 Alt+S 或点击右下角齿轮打开设置';
            document.body.appendChild(this.hint);

            setTimeout(() => {
                this.hint.classList.add('show');
                setTimeout(() => {
                    this.hint.classList.remove('show');
                }, 4000);
            }, 1500);
        }

        bindEvents() {
            // 浮动按钮点击
            this.floatBtn.addEventListener('click', () => {
                this.toggle();
            });

            // 字体选择 - 代码字体
            this.panel.querySelector('#vjb-font-code').addEventListener('change', (e) => {
                this.fontManager.setFont('code', e.target.value);
            });

            // 字体选择 - 题面字体
            this.panel.querySelector('#vjb-font-problem').addEventListener('change', (e) => {
                this.fontManager.setFont('problem', e.target.value);
            });

            // 字体选择 - 其他内容字体
            this.panel.querySelector('#vjb-font-other').addEventListener('change', (e) => {
                this.fontManager.setFont('other', e.target.value);
            });

            // 背景文件上传
            this.panel.querySelector('#vjb-bg-file').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const enableGif = GM_getValue(CONFIG.storagePrefix + 'enableGif', false);
                const enableVideo = GM_getValue(CONFIG.storagePrefix + 'enableVideo', false);

                const ext = '.' + file.name.split('.').pop().toLowerCase();

                if (ext === '.gif' && !enableGif) {
                    alert('GIF 背景未启用，请在设置中勾选"启用 GIF 背景支持"');
                    e.target.value = '';
                    return;
                }

                if (['.mp4', '.webm'].includes(ext) && !enableVideo) {
                    alert('视频背景未启用，请在设置中勾选"启用视频背景支持"');
                    e.target.value = '';
                    return;
                }

                const allowedFormats = [
                    ...CONFIG.supportedImageFormats,
                    ...(enableGif ? CONFIG.supportedAnimatedFormats : []),
                    ...(enableVideo ? CONFIG.supportedVideoFormats : [])
                ];

                if (!allowedFormats.includes(ext)) {
                    alert('不支持的文件格式！请使用 JPG, PNG, WebP' +
                          (enableGif ? ', GIF' : '') +
                          (enableVideo ? ', MP4, WebM' : ''));
                    e.target.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    const fileType = this.backgroundManager.getFileType(file.name);

                    GM_setValue(CONFIG.storagePrefix + 'background', {
                        data: dataUrl,
                        name: file.name
                    });
                    GM_setValue(CONFIG.storagePrefix + 'bgType', fileType);

                    if (fileType === 'video') {
                        this.backgroundManager.setVideoBackground(dataUrl, file.name);
                    } else {
                        this.backgroundManager.setImageBackground(dataUrl, file.name);
                    }

                    alert('背景设置成功！');
                };
                reader.readAsDataURL(file);
            });

            // 透明度调节
            this.panel.querySelector('#vjb-bg-opacity').addEventListener('input', (e) => {
                const opacity = e.target.value / 100;
                this.backgroundManager.setOpacity(opacity);
                this.panel.querySelector('label[for="vjb-bg-opacity"]').textContent =
                    `背景透明度：${e.target.value}%`;
            });

            // GIF 开关
            this.panel.querySelector('#vjb-enable-gif').addEventListener('change', (e) => {
                GM_setValue(CONFIG.storagePrefix + 'enableGif', e.target.checked);
            });

            // 视频开关
            this.panel.querySelector('#vjb-enable-video').addEventListener('change', (e) => {
                GM_setValue(CONFIG.storagePrefix + 'enableVideo', e.target.checked);
            });

            // 清除背景
            this.panel.querySelector('#vjb-clear-bg').addEventListener('click', () => {
                this.backgroundManager.clearBackground();
                alert('背景已清除！');
            });

            // 关闭按钮
            this.panel.querySelector('#vjb-close-settings').addEventListener('click', () => {
                this.hide();
            });

            // 点击遮罩关闭
            this.overlay.addEventListener('click', () => {
                this.hide();
            });

            // 键盘快捷键
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 's') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        }

        registerMenuCommands() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand('⚙️ 打开 VJudgeBetter 设置', () => this.show());
                GM_registerMenuCommand('🎨 重置所有设置', () => {
                    if (confirm('确定要重置所有设置吗？')) {
                        Object.keys(localStorage).forEach(key => {
                            if (key.startsWith(CONFIG.storagePrefix)) {
                                GM_deleteValue(key);
                            }
                        });
                        location.reload();
                    }
                });
            }
        }

        show() {
            this.panel.classList.add('active');
            this.overlay.classList.add('active');
        }

        hide() {
            this.panel.classList.remove('active');
            this.overlay.classList.remove('active');
        }

        toggle() {
            if (this.panel.classList.contains('active')) {
                this.hide();
            } else {
                this.show();
            }
        }
    }

    // ==================== 初始化 ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }

        function start() {
            injectStyles();

            const backgroundManager = new BackgroundManager();
            const fontManager = new FontManager();
            const uiEnhancer = new UIEnhancer();
            const settingsPanel = new SettingsPanel(backgroundManager, fontManager);

            console.log('✅ VJudgeBetter v2.0 已启动！按 Alt+S 或点击右下角齿轮图标打开设置面板');
        }
    }

    init();
})();
