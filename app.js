// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  VJudge 增强脚本
// @author       wyh120715
// @match        https://vjudge.net/*
// @match        https://cn.vjudge.net/*
// @exclude      *iframe*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/583544/VJudgeBetter.user.js
// @updateURL https://update.greasyfork.org/scripts/583544/VJudgeBetter.meta.js
// ==/UserScript==

(function() {
    'use strict';

    if (window.top !== window.self) return;

    // ================= IndexedDB 存储 (支持大型视频/壁纸) =================
    const localDB = {
        init() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('VJudgeBetterDB', 1);
                req.onupgradeneeded = e => e.target.result.createObjectStore('bgStore');
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e);
            });
        },
        async set(key, val) {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('bgStore', 'readwrite');
                tx.objectStore('bgStore').put(val, key);
                tx.oncomplete = () => resolve();
                tx.onerror = e => reject(e);
            });
        },
        async get(key) {
            const db = await this.init();
            return new Promise(resolve => {
                const req = db.transaction('bgStore').objectStore('bgStore').get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        }
    };

    // ================= 配置与全局变量 =================
    const FONTS = {
        code: [
            "JetBrains Mono NL", "JetBrains Mono", "Fira Code", "Cascadia Code",
            "Source Code Pro", "Consolas", "Monaco", "Menlo", "Ubuntu Mono", "Courier New"
        ],
        content: [
            "Google Sans", "Inter", "Roboto", "Microsoft YaHei", "PingFang SC",
            "Segoe UI", "-apple-system", "BlinkMacSystemFont", "Arial"
        ]
    };

    const DEFAULT_SETTINGS = {
        bgType: 'image',
        opacity: 0.85,
        fontCode: 'JetBrains Mono NL',
        customFontCode: '',
        fontContent: 'Google Sans',
        customFontContent: '',
        themeColor: '#4a90e2'
    };

    let settings = { ...DEFAULT_SETTINGS };
    let currentBgData = null;
    let selectedFileData = null;
    let activeBgObjectURL = '';

    // ================= 样式注入 (全面无死角接管系统) =================
    const styles = `
        :root {
            --vjb-fallback-bg: #f8f9fa;
            --vjb-hover-bg: rgba(0, 0, 0, 0.05);
            --vjb-card-bg: rgba(255, 255, 255, 0.75);
            --vjb-card-border: rgba(0, 0, 0, 0.08);
            --vjb-btn-sec-bg: transparent;
            --vjb-text-main: #212529;
            --vjb-text-muted: #5c636a;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --vjb-fallback-bg: #141414;
                --vjb-hover-bg: rgba(255, 255, 255, 0.08);
                --vjb-card-bg: rgba(20, 20, 20, 0.45);
                --vjb-card-border: rgba(255, 255, 255, 0.1);
                --vjb-btn-sec-bg: rgba(255, 255, 255, 0.04);
                --vjb-text-main: #eeeeee;
                --vjb-text-muted: #aaaaaa;
            }
        }
        html[data-bs-theme='dark'], html[data-theme='dark'], body.dark, .dark-mode, [theme='dark'] {
            --vjb-fallback-bg: #141414 !important;
            --vjb-hover-bg: rgba(255, 255, 255, 0.08) !important;
            --vjb-card-bg: rgba(20, 20, 20, 0.45) !important;
            --vjb-card-border: rgba(255, 255, 255, 0.1) !important;
            --vjb-btn-sec-bg: rgba(255, 255, 255, 0.04) !important;
            --vjb-text-main: #eeeeee !important;
            --vjb-text-muted: #aaaaaa !important;
        }
        html[data-bs-theme='light'] {
            --vjb-fallback-bg: #f8f9fa !important;
            --vjb-hover-bg: rgba(0, 0, 0, 0.05) !important;
            --vjb-card-bg: rgba(255, 255, 255, 0.75) !important;
            --vjb-card-border: rgba(0, 0, 0, 0.08) !important;
            --vjb-btn-sec-bg: transparent !important;
            --vjb-text-main: #212529 !important;
            --vjb-text-muted: #5c636a !important;
        }

        body { background: transparent !important; }

        body, div, span, a, button, input, table, tr, td, th, li, ul, .nav-slider {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        #vjb-bg-container, #vjb-bg-image, #vjb-bg-video, .vjb-nav-slider,
        img, svg, i, [class*="icon"], [class*="fa"], [class*="glyphicon"] {
            transition: none !important;
        }

        #vjb-bg-container {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -9999; pointer-events: none; overflow: hidden; background: var(--vjb-fallback-bg);
        }
        #vjb-bg-image, #vjb-bg-video {
            width: 100%; height: 100%; object-fit: cover;
            opacity: var(--vjb-opacity, 0.85); transition: opacity 0.5s ease;
        }

        /* ========== 💡 强力清洗 ID 级与弹窗选项按钮的主题色残留 ========== */
        #problem-submit,
        .btn-primary,
        .btn-check:checked + .btn,
        .btn-check:checked + .btn-primary,
        .btn-check:checked + .btn-outline-primary,
        .btn-group > .btn.active,
        .btn-group > .btn:active,
        .nav-pills .nav-link.active,
        .nav-pills > li.active > a {
            background-color: var(--vjb-theme, #4a90e2) !important;
            border-color: var(--vjb-theme, #4a90e2) !important;
            background-image: none !important; /* 彻底移除原生渐变蓝层 */
            color: #ffffff !important;
        }

        /* 💡 修复提交按钮在没有 hover 时的原生半透蓝色残留 */
        #problem-submit.btn-outline-primary, .btn-outline-primary {
            color: var(--vjb-theme, #4a90e2) !important;
            border-color: var(--vjb-theme, #4a90e2) !important;
            background-color: transparent !important;
        }
        #problem-submit.btn-outline-primary:hover, .btn-outline-primary:hover {
            background-color: var(--vjb-theme, #4a90e2) !important;
            color: #ffffff !important;
        }

        /* ========== 💡 完美修复“官方”、“中文”等胶囊边框与文本换色 ========== */
        .statement-badge, .statement-badge-lang, .badge {
            border: 1px solid var(--vjb-theme, #4a90e2) !important;
            color: var(--vjb-theme, #4a90e2) !important;
            background-color: transparent !important;
        }
        .badge.text-bg-primary, .badge.bg-primary {
            background-color: var(--vjb-theme, #4a90e2) !important;
            color: #ffffff !important;
            border: none !important;
        }

        /* 全站基础文字色彩共鸣 */
        .text-primary { color: var(--vjb-theme, #4a90e2) !important; }
        .bg-primary { background-color: var(--vjb-theme, #4a90e2) !important; }
        .border-primary { border-color: var(--vjb-theme, #4a90e2) !important; }

        .pagination > .active > a, .pagination > .active > span {
            background-color: var(--vjb-theme, #4a90e2) !important;
            border-color: var(--vjb-theme, #4a90e2) !important;
            color: #ffffff !important;
        }

        /* 导航条统一洗蓝 */
        .navbar-nav .nav-link, .nav-tabs .nav-link, .contest-problem-menu .nav-link, .btn-link {
            position: relative; overflow: hidden; color: var(--vjb-text-muted) !important;
            transition: color 0.3s cubic-bezier(0.22, 1, 0.36, 1) !important;
        }
        .navbar-nav .nav-link:hover, .nav-tabs .nav-link:hover, .contest-problem-menu .nav-link:hover { color: var(--vjb-theme, #4a90e2) !important; }
        .navbar-nav .active > .nav-link, .navbar-nav .nav-link.active, .nav-tabs .nav-link.active, .contest-problem-menu .nav-link.active {
            border-bottom: none !important; background: transparent !important; color: var(--vjb-theme, #4a90e2) !important; font-weight: bold !important;
        }

        /* 非激活题目标签对比度提升 */
        .nav-pills .nav-link:not(.active), #problem-nav .nav-link:not(.active) {
            color: var(--vjb-text-muted) !important; background: transparent !important; font-weight: 500 !important;
        }
        .nav-pills .nav-link:not(.active):hover, #problem-nav .nav-link:not(.active):hover {
            color: var(--vjb-theme, #4a90e2) !important; background: var(--vjb-hover-bg) !important;
        }

        /* 次要功能按钮组美化 */
        #prob-operation .btn-secondary {
            background-color: var(--vjb-btn-sec-bg) !important; border: 1px solid var(--vjb-card-border) !important; color: var(--vjb-text-muted) !important; box-shadow: none !important;
        }
        #prob-operation .btn-secondary:hover {
            border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme, #4a90e2) !important; background-color: var(--vjb-hover-bg) !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important;
        }

        /* 翻译卡片融合 */
        .list-group-item.active {
            background-color: var(--vjb-hover-bg) !important; border: 1px solid var(--vjb-card-border) !important; border-left: 4px solid var(--vjb-theme, #4a90e2) !important; color: var(--vjb-text-main) !important; box-shadow: none !important;
        }
        .list-group-item.active .statement-author-row a, .list-group-item.active .statement-author-row span { color: var(--vjb-theme, #4a90e2) !important; font-weight: bold !important; }

        /* 比赛时间顶栏卡片磨砂玻璃化 */
        #time-info {
            background: var(--vjb-card-bg) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid var(--vjb-card-border) !important; border-radius: 14px !important; padding: 20px !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important; margin-bottom: 25px !important; color: var(--vjb-text-main) !important;
        }
        #time-info h3 { color: var(--vjb-text-main) !important; }
        .contest-time-progress { background: var(--vjb-theme, #4a90e2) !important; box-shadow: 0 0 12px var(--vjb-theme, #4a90e2); border-radius: 4px !important; }
        #contest-time.noUi-target { background: rgba(128, 128, 128, 0.15) !important; border: none !important; height: 6px !important; border-radius: 4px !important; }
        .noUi-handle { width: 16px !important; height: 16px !important; right: -8px !important; top: -5px !important; background: #ffffff !important; border: 3px solid var(--vjb-theme, #4a90e2) !important; border-radius: 50% !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important; cursor: pointer !important; transition: transform 0.2s !important; }
        .noUi-handle:hover { transform: scale(1.25); }
        .noUi-handle::before, .noUi-handle::after { display: none !important; }
        #info-running { background: rgba(231, 76, 60, 0.12) !important; color: #e74c3c !important; padding: 4px 14px !important; border-radius: 20px !important; font-weight: bold !important; font-size: 13px !important; display: inline-block !important; border: 1px solid rgba(231, 76, 60, 0.25) !important; }

        /* 设置面板样式 */
        #vjb-float-btn { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: rgba(30, 30, 30, 0.8); backdrop-filter: blur(10px); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9998; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
        #vjb-float-btn:hover { transform: scale(1.1) rotate(90deg); background: rgba(60, 60, 60, 0.9); }
        #vjb-float-btn svg { width: 28px; height: 28px; fill: #fff; }
        #vjb-settings-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 420px; max-height: 85vh; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(20px); border-radius: 16px; padding: 25px; z-index: 9999; color: #eee; box-shadow: 0 10px 40px rgba(0,0,0,0.5); opacity: 0; pointer-events: none; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; transition: all 0.3s; }
        #vjb-settings-panel.active { opacity: 1; pointer-events: all; transform: translate(-50%, -50%) scale(1); }
        .vjb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        .vjb-title { font-size: 18px; font-weight: bold; color: #fff; }
        .vjb-close { cursor: pointer; font-size: 24px; color: #aaa; transition: color 0.2s; }
        .vjb-close:hover { color: #fff; }
        .vjb-group { margin-bottom: 20px; }
        .vjb-label { display: block; margin-bottom: 8px; font-size: 14px; color: #ccc; }
        .vjb-select, .vjb-input { width: 100%; padding: 8px 12px; background: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #333; outline: none; box-sizing: border-box; }
        .vjb-range-wrap { display: flex; align-items: center; gap: 10px; }
        .vjb-range { flex: 1; accent-color: var(--vjb-theme, #4a90e2); }
        .vjb-nav-slider { position: absolute; height: 3px; background: var(--vjb-theme, #4a90e2); border-radius: 3px 3px 0 0; pointer-events: none; opacity: 0; transition: left 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.4s ease, opacity 0.35s ease; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2); z-index: 9997; will-change: left, width; }

        /* ========== 💡 智能字体引擎分配 (自然落级继承法) ========== */
        body, p, h1, h2, h3, h4, h5, h6, table, td, th, tr, li, ul, ol, dl, dt, dd, blockquote,
        label, input, select, button, .btn, .markdown-body, .problem-content, .statement {
            font-family: var(--vjb-font-content, 'Google Sans'), sans-serif !important;
        }

        /* 剔除多行文本框的全局干扰，确保提交框强制使用等宽编程字体 */
        textarea:not(#submit-solution):not([name="source"]) {
            font-family: var(--vjb-font-content, 'Google Sans'), sans-serif !important;
        }

        /* 💡 靶向锁定：代码块、Ace编辑器、以及代码提交弹窗内部输入区，一并强制纠正为编程字体 */
        pre, code:not([class*="math"]):not([class*="katex"]):not([class*="MathJax"]),
        kbd, samp, .ace_editor, .source-code,
        #submit-solution, textarea[name="source"], .modal-body textarea {
            font-family: var(--vjb-font-code, 'JetBrains Mono NL'), monospace !important;
        }
        pre *, code *, .ace_editor *, .source-code * { font-family: inherit !important; }

        /* AtCoder 裸写独立变量防御 */
        var:not(:has(.katex)):not(:has([class*="katex"])):not(:has([class*="MathJax"])) {
            font-family: "Times New Roman", "Cambria", "MathJax_Math", serif !important;
            font-style: italic !important;
        }

        .standings-table thead tr { background: linear-gradient(90deg, rgba(74,144,226,0.1) 0%, rgba(74,144,226,0.3) 100%) !important; }
        .standings-table tbody tr:hover { background: var(--vjb-hover-bg) !important; transform: scale(1.005); }
        .status-accepted { color: #2ecc71 !important; font-weight: bold; }
        .status-wrong-answer { color: #e74c3c !important; }
        .status-pending { color: #f1c40f !important; }
        .medal-gold { background: linear-gradient(45deg, #FFD700, #FDB931) !important; color: #000 !important; }
        .medal-silver { background: linear-gradient(45deg, #E0E0E0, #BDBDBD) !important; color: #000 !important; }
        .medal-bronze { background: linear-gradient(45deg, #CD7F32, #A0522D) !important; color: #fff !important; }
    `;
    GM_addStyle(styles);

    // ================= 💡 核心功能：向题面 iframe 内部灌入带防御机制的字体样式 =================
    function injectIframeStyles(iframe) {
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc || !doc.head) return;

            let style = doc.getElementById('vjb-iframe-styles');
            if (!style) {
                style = doc.createElement('style');
                style.id = 'vjb-iframe-styles';
                doc.head.appendChild(style);
            }

            const codeFont = settings.customFontCode ? `"${settings.customFontCode}"` : settings.fontCode;
            const contentFont = settings.customFontContent ? `"${settings.customFontContent}"` : settings.fontContent;

            style.innerHTML = `
                body, p, h1, h2, h3, h4, h5, h6, table, td, th, tr, li, ul, ol, dl, dt, dd, blockquote,
                label, section, article, .markdown-body, .problem-content, .statement {
                    font-family: ${contentFont}, sans-serif !important;
                }
                var {
                    font-family: "Times New Roman", "Cambria", "MathJax_Math", serif !important;
                    font-style: italic !important;
                }
                pre, code:not([class*="math"]):not([class*="katex"]):not([class*="MathJax"]),
                kbd, samp, .ace_editor, .source-code {
                    font-family: ${codeFont}, monospace !important;
                }
            `;
        } catch(e) {}
    }

    function initIframeObserver() {
        const container = document.getElementById('frame-description-container');
        if (!container) return;

        const observer = new MutationObserver(() => {
            const iframe = container.querySelector('iframe');
            if (iframe) {
                injectIframeStyles(iframe);
                iframe.addEventListener('load', () => injectIframeStyles(iframe), { once: true });
            }
        });
        observer.observe(container, { childList: true, subtree: true });

        const iframe = container.querySelector('iframe');
        if (iframe) injectIframeStyles(iframe);
    }

    // ================= 业务控制 =================

    async function loadSettings() {
        const saved = GM_getValue('vjb_settings');
        if (saved) settings = { ...DEFAULT_SETTINGS, ...saved };
        try {
            const savedBg = await localDB.get('vjb_bgData');
            if (savedBg) currentBgData = savedBg;
        } catch(e) {}
        applySettings();
    }

    async function saveSettings() {
        GM_setValue('vjb_settings', settings);
        try { await localDB.set('vjb_bgData', currentBgData); } catch(e) {}
        if (activeBgObjectURL) { URL.revokeObjectURL(activeBgObjectURL); activeBgObjectURL = ''; }
        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--vjb-opacity', settings.opacity);

        const codeFont = settings.customFontCode ? `"${settings.customFontCode}"` : settings.fontCode;
        const contentFont = settings.customFontContent ? `"${settings.customFontContent}"` : settings.fontContent;

        root.style.setProperty('--vjb-font-code', codeFont);
        root.style.setProperty('--vjb-font-content', contentFont);
        root.style.setProperty('--vjb-theme', settings.themeColor);

        document.querySelectorAll('#frame-description-container iframe').forEach(injectIframeStyles);

        let container = document.getElementById('vjb-bg-container');
        if (!container) { initBackground(); container = document.getElementById('vjb-bg-container'); }
        if (!container) return;

        if (currentBgData) {
            document.body.style.setProperty('background', 'transparent', 'important');
            container.style.display = 'block';

            let srcToUse = '';
            if (currentBgData instanceof Blob) {
                if (!activeBgObjectURL) activeBgObjectURL = URL.createObjectURL(currentBgData);
                srcToUse = activeBgObjectURL;
            } else {
                srcToUse = currentBgData;
            }

            if (settings.bgType === 'video') {
                let video = document.getElementById('vjb-bg-video');
                if (!video) {
                    video = document.createElement('video');
                    video.id = 'vjb-bg-video'; video.autoplay = true; video.loop = true;
                    video.muted = true; video.playsInline = true;
                    container.innerHTML = ''; container.appendChild(video);
                }
                if (video.src !== srcToUse) video.src = srcToUse;
            } else {
                let img = document.getElementById('vjb-bg-image');
                if (!img) {
                    img = document.createElement('img');
                    img.id = 'vjb-bg-image';
                    container.innerHTML = ''; container.appendChild(img);
                }
                if (img.src !== srcToUse) img.src = srcToUse;
            }
        } else {
            document.body.style.removeProperty('background');
            container.style.display = 'none';
            container.innerHTML = '';
            if (activeBgObjectURL) { URL.revokeObjectURL(activeBgObjectURL); activeBgObjectURL = ''; }
        }
    }

    function initBackground() {
        if (document.getElementById('vjb-bg-container')) return;
        const container = document.createElement('div');
        container.id = 'vjb-bg-container';
        document.body.prepend(container);
    }

    function createFloatButton() {
        if (document.getElementById('vjb-float-btn')) return;
        const btn = document.createElement('div');
        btn.id = 'vjb-float-btn';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
        btn.onclick = toggleSettingsPanel;
        document.body.appendChild(btn);
    }

    function createSettingsPanel() {
        if (document.getElementById('vjb-settings-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'vjb-settings-panel';

        const makeOption = (list, selected) => list.map(f => `<option value="${f}" ${f === selected ? 'selected' : ''}>${f}</option>`).join('');

        panel.innerHTML = `
            <div class="vjb-header"><span class="vjb-title">VJudgeBetter 设置</span><span class="vjb-close">&times;</span></div>

            <div class="vjb-group">
                <label class="vjb-label">个性全局主题色 (Theme Color)</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="color" id="vjb-set-theme" value="${settings.themeColor}" style="width: 50px; height: 35px; padding: 0; border: none; background: transparent; cursor: pointer;">
                    <button id="vjb-reset-theme" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #ccc; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 13px; transition: all 0.2s;">恢复默认蓝</button>
                </div>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">代码字体 (Code Font)</label>
                <select id="vjb-set-font-code" class="vjb-select">${makeOption(FONTS.code, settings.fontCode)}</select>
                <input type="text" id="vjb-set-custom-code" class="vjb-input" style="margin-top:6px;" placeholder="或输入系统自定义代码字体名(有内容时优先)" value="${settings.customFontCode || ''}">
            </div>

            <div class="vjb-group">
                <label class="vjb-label">内容字体 (Content Font)</label>
                <select id="vjb-set-font-content" class="vjb-select">${makeOption(FONTS.content, settings.fontContent)}</select>
                <input type="text" id="vjb-set-custom-content" class="vjb-input" style="margin-top:6px;" placeholder="或输入系统自定义内容字体名(有内容时优先)" value="${settings.customFontContent || ''}">
            </div>

            <div class="vjb-group"><label class="vjb-label">背景透明度</label><div class="vjb-range-wrap"><input type="range" id="vjb-set-opacity" class="vjb-range" min="0" max="1" step="0.05" value="${settings.opacity}"><span id="vjb-op-val">${Math.round(settings.opacity * 100)}%</span></div></div>
            <div class="vjb-group"><label class="vjb-label">上传背景图片/视频</label>
                <div id="vjb-drop-zone" style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease;">
                    <div id="vjb-drop-text">点击或拖拽 (.jpg, .png, .gif, .mp4 最大20MB)</div>
                    <input type="file" id="vjb-file-input" accept="image/*,video/mp4" style="display: none;">
                    <div id="vjb-file-info" style="color: var(--vjb-theme, #4a90e2); display: none; font-weight: bold;"></div>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <label><input type="radio" name="bgType" value="image" ${settings.bgType === 'image' ? 'checked' : ''}> 图片/GIF</label>
                    <label><input type="radio" name="bgType" value="video" ${settings.bgType === 'video' ? 'checked' : ''}> 视频</label>
                    <button id="vjb-clear-bg" style="background:none; border:1px solid #666; color:#aaa; padding:2px 8px; border-radius:4px; cursor:pointer;">清除背景</button>
                </div>
            </div>
            <div style="text-align:right; margin-top:20px;"><button id="vjb-save-btn" style="background:var(--vjb-theme, #4a90e2); color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">保存并应用</button></div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('.vjb-close').onclick = toggleSettingsPanel;

        document.getElementById('vjb-reset-theme').onclick = () => {
            document.getElementById('vjb-set-theme').value = '#4a90e2';
        };

        const dropZone = document.getElementById('vjb-drop-zone');
        const fileInput = document.getElementById('vjb-file-input');

        function handleFileSelect(file) {
            if (!file) return;
            const maxSize = file.type.startsWith('video/') ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
            if (file.size > maxSize) return alert(`文件过大！大小不能超过 ${maxSize / 1024 / 1024}MB`);

            selectedFileData = file;
            document.getElementById('vjb-drop-text').style.display = 'none';
            const fi = document.getElementById('vjb-file-info');
            fi.style.display = 'block'; fi.innerHTML = `✓ 已临时选中文件：${file.name}`;
        }

        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => e.target.files.length > 0 && handleFileSelect(e.target.files[0]);

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--vjb-theme, #4a90e2)';
            dropZone.style.background = 'rgba(255,255,255,0.05)';
        };

        dropZone.ondragleave = () => {
            dropZone.style.borderColor = 'rgba(255,255,255,0.3)';
            dropZone.style.background = 'transparent';
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255,255,255,0.3)';
            dropZone.style.background = 'transparent';
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
        };

        document.getElementById('vjb-set-opacity').oninput = (e) => document.getElementById('vjb-op-val').innerText = Math.round(e.target.value * 100) + '%';

        document.getElementById('vjb-clear-bg').onclick = () => {
            selectedFileData = null;
            document.getElementById('vjb-drop-text').style.display = 'block';
            document.getElementById('vjb-file-info').style.display = 'none';
        };

        document.getElementById('vjb-save-btn').onclick = () => {
            settings.themeColor = document.getElementById('vjb-set-theme').value;
            settings.fontCode = document.getElementById('vjb-set-font-code').value;
            settings.customFontCode = document.getElementById('vjb-set-custom-code').value.trim();
            settings.fontContent = document.getElementById('vjb-set-font-content').value;
            settings.customFontContent = document.getElementById('vjb-set-custom-content').value.trim();
            settings.opacity = parseFloat(document.getElementById('vjb-set-opacity').value);
            settings.bgType = document.querySelector('input[name="bgType"]:checked').value;

            currentBgData = selectedFileData;
            saveSettings();
            toggleSettingsPanel();
        };
    }

    function toggleSettingsPanel() {
        const panel = document.getElementById('vjb-settings-panel');
        if (!panel) createSettingsPanel();
        panel.classList.toggle('active');

        if(panel.classList.contains('active')) {
            selectedFileData = currentBgData;

            document.getElementById('vjb-set-theme').value = settings.themeColor;
            document.getElementById('vjb-set-font-code').value = settings.fontCode;
            document.getElementById('vjb-set-custom-code').value = settings.customFontCode || '';
            document.getElementById('vjb-set-font-content').value = settings.fontContent;
            document.getElementById('vjb-set-custom-content').value = settings.customFontContent || '';
            document.getElementById('vjb-set-opacity').value = settings.opacity;
            document.getElementById('vjb-op-val').innerText = Math.round(settings.opacity * 100) + '%';

            const radios = document.getElementsByName('bgType');
            for(let r of radios) {
                if(r.value === settings.bgType) r.checked = true;
            }

            const textEl = document.getElementById('vjb-drop-text');
            const infoEl = document.getElementById('vjb-file-info');
            if (currentBgData) {
                textEl.style.display = 'none';
                infoEl.style.display = 'block';
                infoEl.innerHTML = currentBgData instanceof Blob ? `✓ 已托管本地大文件背景` : `✓ 已连接外部背景`;
            } else {
                textEl.style.display = 'block';
                infoEl.style.display = 'none';
            }
        }
    }

    // ================= 极致柔和滑动逻辑 =================
    function initNavSlider() {
        let slider = document.querySelector('.vjb-nav-slider');
        if (!slider) {
            slider = document.createElement('div');
            slider.className = 'vjb-nav-slider';
            document.body.appendChild(slider);
        }

        function moveSlider(target) {
            if (!target) {
                slider.style.opacity = '0';
                return;
            }
            const rect = target.getBoundingClientRect();
            const padding = 4;

            slider.style.width = `${Math.max(20, rect.width - padding * 2)}px`;
            slider.style.left = `${rect.left + window.scrollX + padding}px`;
            slider.style.top = `${rect.bottom + window.scrollY - 3}px`;
            slider.style.opacity = '1';
        }

        const activeFinder = () => {
            const activeItem = document.querySelector('.navbar-nav .nav-link.active, .navbar-nav > li.active > a, .nav-tabs .nav-link.active, .contest-problem-menu .nav-link.active');
            if (activeItem) {
                moveSlider(activeItem);
            } else {
                slider.style.opacity = '0';
            }
        };

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.navbar-nav .nav-link, .navbar-nav > li > a, .nav-tabs .nav-link, .contest-problem-menu .nav-link, .btn-link');
            if (target) moveSlider(target);
        });

        document.addEventListener('mouseout', (e) => {
            const fromNav = e.target.closest('.navbar-nav, .nav-tabs, .contest-problem-menu');
            const toNav = e.relatedTarget ? e.relatedTarget.closest('.navbar-nav, .nav-tabs, .contest-problem-menu') : null;
            if (fromNav && !toNav) activeFinder();
        });

        document.addEventListener('click', (e) => {
            const target = e.target.closest('.navbar-nav .nav-link, .navbar-nav > li > a, .nav-tabs .nav-link, .contest-problem-menu .nav-link, .btn-link');
            if (target) setTimeout(activeFinder, 100);
        });

        window.addEventListener('resize', activeFinder);
        setTimeout(activeFinder, 300);
    }

    // ================= 初始化入口 =================
    function init() {
        loadSettings();
        createFloatButton();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initNavSlider();
                initIframeObserver();
            });
        } else {
            initNavSlider();
            initIframeObserver();
        }

        document.addEventListener('load', (e) => {
            if (e.target && e.target.tagName === 'IFRAME') {
                injectIframeStyles(e.target);
            }
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                toggleSettingsPanel();
            }
        });
    }

    init();
})();
