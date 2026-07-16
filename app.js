// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      1.3-Beta
// @description  VJudge 增强脚本
// @author       wyh120715
// @license      MIT
// @match        https://vjudge.net/*
// @match        https://cn.vjudge.net/*
// @exclude      *iframe*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self) return;

    // ================= IndexedDB 存储 =================
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

    // ================= 样式注入 (多维全息重塑系统) =================
    const styles = `
        :root {
            --vjb-fallback-bg: #f8f9fa;
            --vjb-hover-bg: rgba(0, 0, 0, 0.04);
            --vjb-card-bg: rgba(255, 255, 255, 0.72);
            --vjb-card-border: rgba(0, 0, 0, 0.08);
            --vjb-btn-sec-bg: transparent;
            --vjb-text-main: #212529;
            --vjb-text-muted: #5c636a;
            --vjb-cell-bg: rgba(255, 255, 255, 0.4);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --vjb-fallback-bg: #141414;
                --vjb-hover-bg: rgba(255, 255, 255, 0.06);
                --vjb-card-bg: rgba(25, 20, 20, 0.55);
                --vjb-card-border: rgba(255, 255, 255, 0.08);
                --vjb-btn-sec-bg: rgba(255, 255, 255, 0.04);
                --vjb-text-main: #eeeeee;
                --vjb-text-muted: #aaaaaa;
                --vjb-cell-bg: rgba(0, 0, 0, 0.2);
            }
        }
        html[data-bs-theme='dark'], html[data-theme='dark'], body.dark, .dark-mode, [theme='dark'] {
            --vjb-fallback-bg: #141414 !important;
            --vjb-hover-bg: rgba(255, 255, 255, 0.06) !important;
            --vjb-card-bg: rgba(25, 20, 20, 0.55) !important;
            --vjb-card-border: rgba(255, 255, 255, 0.08) !important;
            --vjb-btn-sec-bg: rgba(255, 255, 255, 0.04) !important;
            --vjb-text-main: #eeeeee !important;
            --vjb-text-muted: #aaaaaa !important;
            --vjb-cell-bg: rgba(0, 0, 0, 0.2) !important;
        }
        html[data-bs-theme='light'] {
            --vjb-fallback-bg: #f8f9fa !important;
            --vjb-hover-bg: rgba(0, 0, 0, 0.04) !important;
            --vjb-card-bg: rgba(255, 255, 255, 0.72) !important;
            --vjb-card-border: rgba(0, 0, 0, 0.08) !important;
            --vjb-btn-sec-bg: transparent !important;
            --vjb-text-main: #212529 !important;
            --vjb-text-muted: #5c636a !important;
            --vjb-cell-bg: rgba(255, 255, 255, 0.4) !important;
        }

        body { background: transparent !important; }
        body, div, span, a, button, input, li, ul, .nav-slider { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        #vjb-bg-container, #vjb-bg-image, #vjb-bg-video, .vjb-nav-slider, img, svg, i, [class*="icon"], [class*="fa"], [class*="glyphicon"], table, tr, td, th { transition: none !important; }
        #contest-rank-table *, #listStatus * { transition: none !important; }

        #vjb-bg-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -9999; pointer-events: none; overflow: hidden; background: var(--vjb-fallback-bg); }
        #vjb-bg-image, #vjb-bg-video { width: 100%; height: 100%; object-fit: cover; opacity: var(--vjb-opacity, 0.85); transition: opacity 0.5s ease; }

        /* 全局基础组件圆滑矩形化 */
        #problem-submit, .btn-primary, .btn-check:checked + .btn, .btn-check:checked + .btn-primary, .btn-check:checked + .btn-outline-primary, .btn-group > .btn.active, .btn-group > .btn:active, .nav-pills .nav-link.active, .nav-pills > li.active > a {
            background-color: var(--vjb-theme, #4a90e2) !important; border-color: var(--vjb-theme, #4a90e2) !important; background-image: none !important; color: #ffffff !important; border-radius: 6px !important;
        }
        #problem-submit.btn-outline-primary, .btn-outline-primary { color: var(--vjb-theme, #4a90e2) !important; border-color: var(--vjb-theme, #4a90e2) !important; background-color: transparent !important; border-radius: 6px !important; }
        #problem-submit.btn-outline-primary:hover, .btn-outline-primary:hover { background-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; }
        .pagination .active .page-link, .pagination .page-item.active .page-link, .page-link.active { background-color: var(--vjb-theme, #4a90e2) !important; border-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; }
        .pagination .page-item .page-link { border-radius: 6px !important; margin: 0 2px; }

        .badge { border-radius: 4px !important; }
        .form-select, .search_text, input[type="text"] { border-radius: 6px !important; border: 1px solid var(--vjb-card-border) !important; }
        .badge.text-bg-primary, .badge.bg-primary { background-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; border: none !important; }
        .badge.border-primary, .badge.text-primary, .statement-badge-lang { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme, #4a90e2) !important; background-color: transparent !important; }
        .problem-description-item.active .statement-badge { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme, #4a90e2) !important; }

        .text-primary { color: var(--vjb-theme, #4a90e2) !important; }
        .bg-primary { background-color: var(--vjb-theme, #4a90e2) !important; }
        .border-primary { border-color: var(--vjb-theme, #4a90e2) !important; }

        /* 仅在比赛概览卡片处映射主色调，使其跟随主题色，避免污染全局倒计时/时间等组件 */
        .contest-meta-section, .contest-meta-section-title {
            --color-primary: var(--vjb-theme) !important;
            --bs-primary: var(--vjb-theme) !important;
        }

        .navbar-nav .nav-link, .nav-tabs .nav-link, .contest-problem-menu .nav-link, .btn-link { position: relative; overflow: hidden; color: var(--vjb-text-muted) !important; transition: color 0.3s cubic-bezier(0.22, 1, 0.36, 1) !important; }
        .navbar-nav .nav-link:hover, .nav-tabs .nav-link:hover, .contest-problem-menu .nav-link:hover { color: var(--vjb-theme, #4a90e2) !important; }
        .navbar-nav .active > .nav-link, .navbar-nav .nav-link.active, .nav-tabs .nav-link.active, .contest-problem-menu .nav-link.active { border-bottom: none !important; background: transparent !important; color: var(--vjb-theme, #4a90e2) !important; font-weight: bold !important; }

        .nav-pills .nav-link:not(.active), #problem-nav .nav-link:not(.active) { color: var(--vjb-text-muted) !important; background: transparent !important; font-weight: 500 !important; }
        .nav-pills .nav-link:not(.active):hover, #problem-nav .nav-link:not(.active):hover { color: var(--vjb-theme, #4a90e2) !important; background-color: var(--vjb-hover-bg) !important; }

        #prob-operation .btn-secondary, #buttonContainer .btn-secondary, #right-panel .btn-secondary { background-color: var(--vjb-btn-sec-bg) !important; border: 1px solid var(--vjb-card-border) !important; color: var(--vjb-text-muted) !important; box-shadow: none !important; border-radius: 6px !important; }
        #prob-operation .btn-secondary:hover, #buttonContainer .btn-secondary:hover, #right-panel .btn-secondary:hover { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme, #4a90e2) !important; background-color: var(--vjb-hover-bg) !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important; }
        .list-group-item.active { background-color: var(--vjb-hover-bg) !important; border: 1px solid var(--vjb-card-border) !important; border-left: 4px solid var(--vjb-theme, #4a90e2) !important; color: var(--vjb-text-main) !important; box-shadow: none !important; }
        .list-group-item.active .statement-author-row a, .list-group-item.active .statement-author-row span { color: var(--vjb-theme, #4a90e2) !important; font-weight: bold !important; }

        #time-info { background: var(--vjb-card-bg) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid var(--vjb-card-border) !important; border-radius: 14px !important; padding: 15px 20px !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important; margin-bottom: 20px !important; color: var(--vjb-text-main) !important; }
        #time-info h3 { color: var(--vjb-text-main) !important; }
        .contest-time-progress { background-color: var(--vjb-theme, #4a90e2) !important; box-shadow: 0 0 12px var(--vjb-theme, #4a90e2); border-radius: 4px !important; }
        #contest-time.noUi-target { background-color: rgba(128, 128, 128, 0.15) !important; border: none !important; height: 6px !important; border-radius: 4px !important; }
        .noUi-handle { width: 16px !important; height: 16px !important; right: -8px !important; top: -5px !important; background-color: #ffffff !important; border: 3px solid var(--vjb-theme, #4a90e2) !important; border-radius: 50% !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important; cursor: pointer !important; transition: transform 0.2s !important; }
        .noUi-handle:hover { transform: scale(1.25); }
        .noUi-handle::before, .noUi-handle::after { display: none !important; }

        /* ========== 💡 统一回归无边界分离晶格格式 ========== */
        table.table, #contest-rank-table, #listStatus, #group-featured-articles-table, #group-contest-table, #group-member-table {
            width: 100% !important;
            border-collapse: separate !important;
            border-spacing: 2px 2px !important;
            background-color: var(--vjb-card-bg) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid var(--vjb-card-border) !important;
            border-radius: 8px !important;
            padding: 4px !important;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06) !important;
            margin-top: 15px !important;
        }
        #listStatus {
            table-layout: auto !important;
        }

        /* 💡 强制所有表头居中修复 */
        table.table thead tr, #contest-rank-table thead tr, #listStatus thead tr { background: transparent !important; }

        table.table th, #contest-rank-table th, #listStatus th, th {
            font-weight: 700 !important;
            color: var(--vjb-text-main) !important;
            padding: 8px 6px !important;
            text-align: center !important;
            vertical-align: middle !important;
            border: none !important;
            border-bottom: 2px solid var(--vjb-card-border) !important;
            background: transparent !important;
            box-shadow: none !important;
        }

        #contest-rank-table th {
            padding: 6px 2px !important;
            height: auto !important;
            min-height: 0 !important;
        }

        table.table th *, #contest-rank-table th *, #listStatus th * {
            text-align: center !important;
        }

        /* 修复 VJudge 的独立包裹的嵌套导致的错位，让它排列整齐居中，并且靠拢 */
        #contest-rank-table th div {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        #contest-rank-table th div * {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.0 !important;
            display: inline-block !important;
            text-align: center !important;
        }
        #contest-rank-table th br {
            display: none !important;
        }

        table.table td, #contest-rank-table td, #listStatus td {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-radius: 4px !important; /* 晶格小圆角 */
            box-shadow: none !important;
            border: none !important;
            /* 绝对使用 background-color 防止进度条图层被覆盖 */
            background-color: var(--vjb-cell-bg) !important;
            padding: 8px 6px !important;
            vertical-align: middle !important;
            text-align: center !important; /* 强制所有数据居中 */
            white-space: nowrap !important;
        }
        #contest-rank-table td {
            padding: 6px 2px !important;
        }

        table.table tbody tr:hover td, #contest-rank-table tbody tr:not(.myself):not(.my-team):hover td, #listStatus tbody tr:hover td {
            background-color: var(--vjb-hover-bg) !important;
        }

        /* 个别名称的左对齐保护（防拥挤） */
        table.table td.team, #contest-rank-table td.team, table.table td.prob-title, table.table td.title {
            text-align: left !important;
            padding-left: 10px !important;
        }
        table.table th.team, #contest-rank-table th.team, table.table th.prob-title, table.table th.title {
            text-align: left !important;
            padding-left: 10px !important;
        }
        table.table th.team *, #contest-rank-table th.team *, table.table th.prob-title *, table.table th.title * {
            text-align: left !important;
        }

        table.table td.team div, #contest-rank-table td.team div, table.table td.team a, #contest-rank-table td.team a { max-width: none !important; white-space: nowrap; overflow: visible; text-align: left !important; }
        .contestant-avatar { width: 20px !important; height: 20px !important; border-radius: 50% !important; object-fit: cover !important; margin-right: 6px !important; border: 1px solid var(--vjb-card-border) !important; }

        /* 💡 柔和修复“我自己”在排行榜中的高亮，绝对不会太浓！ */
        tr.myself td, tr.my-team td, #contest-rank-table tr.myself td, #contest-rank-table tr.my-team td {
            background-color: color-mix(in srgb, var(--vjb-theme) 10%, var(--vjb-cell-bg)) !important;
            color: var(--vjb-text-main) !important;
            font-weight: 700 !important;
        }

        #contest-rank-table td.prob.accepted:not(.fb), #contest-rank-table tr:hover td.prob.accepted:not(.fb) {
            background-color: color-mix(in srgb, rgba(46, 204, 113, 1) 22%, var(--vjb-cell-bg)) !important;
            color: rgba(39, 174, 96, 0.95) !important; font-weight: 600 !important;
        }
        #contest-rank-table td.prob.accepted.fb, #contest-rank-table tr:hover td.prob.accepted.fb { background-image: linear-gradient(135deg, rgba(39, 174, 96, 0.85), rgba(46, 204, 113, 0.85)) !important; color: #ffffff !important; font-weight: 700 !important; }
        #contest-rank-table td.prob span, #contest-rank-table td.prob.accepted span { color: #ff6b6b !important; font-weight: 700 !important; }
        #contest-rank-table td.prob:not(.accepted):has(span), #contest-rank-table tr:hover td.prob:not(.accepted):has(span) { background-color: color-mix(in srgb, #e74c3c 15%, var(--vjb-cell-bg)) !important; }

        /* 💡 联动主题色的 C++ 语言列标签居中修复 */
        td.language, th.language { text-align: center !important; }
        #listStatus td.language div, #listStatus td.language span, .view-solution.self {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 auto !important; /* 核心居中 */
            width: fit-content !important;
            padding: 3px 10px !important;
            border-radius: 4px !important;
            background-color: color-mix(in srgb, var(--vjb-theme) 10%, transparent) !important;
            color: var(--vjb-theme) !important;
            font-weight: 700 !important;
            border: 1px solid color-mix(in srgb, var(--vjb-theme) 30%, transparent) !important;
            white-space: nowrap !important;
        }

        /* ========== 💡 评测结果悬浮块终极完全居中对齐 ========== */
        td.status, th.status { text-align: center !important; vertical-align: middle !important; }

        .vjb-status-block {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            margin: 0 auto !important; /* 核心居中引力 */
            width: auto !important;
            max-width: none !important;
            padding: 3px 10px !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            letter-spacing: 0.3px !important;
            white-space: nowrap !important;
            text-decoration: none !important;
            line-height: 1.2 !important;
            border: 1px solid transparent !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            transition: all 0.2s ease !important;
        }
        .vjb-status-block:hover { filter: brightness(1.2) !important; transform: translateY(-0.5px); }

        .vjb-color-green { background-color: rgba(46, 204, 113, 0.12) !important; color: #2ecc71 !important; border-color: rgba(46, 204, 113, 0.35) !important; }
        .vjb-color-red { background-color: rgba(231, 76, 60, 0.12) !important; color: #ff6b6b !important; border-color: rgba(231, 76, 60, 0.35) !important; }
        .vjb-color-orange { background-color: rgba(243, 156, 18, 0.12) !important; color: #f39c12 !important; border-color: rgba(243, 156, 18, 0.35) !important; }
        .vjb-color-purple { background-color: rgba(155, 89, 182, 0.15) !important; color: #be7bee !important; border-color: rgba(155, 89, 182, 0.4) !important; }
        .vjb-color-bright-yellow { background-color: rgba(241, 196, 15, 0.12) !important; color: #ffd740 !important; border-color: rgba(241, 196, 15, 0.4) !important; }
        .vjb-color-dark-yellow { background-color: rgba(211, 84, 0, 0.12) !important; color: #e67e22 !important; border-color: rgba(211, 84, 0, 0.35) !important; }
        .vjb-color-grey { background-color: rgba(149, 165, 166, 0.12) !important; color: #a6b9bb !important; border-color: rgba(149, 165, 166, 0.3) !important; }

        /* ========== 💡 团队与小组页面规范化卡片 ========== */
        .group-side-panel-column .card, #group-intro-card, #group-featured-articles-card, #group-contests-card, #group-members-card {
            background-color: var(--vjb-card-bg) !important;
            backdrop-filter: blur(12px) !important;
            border: 1px solid var(--vjb-card-border) !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04) !important;
            margin-bottom: 25px !important;
            color: var(--vjb-text-main) !important;
            padding: 18px !important;
        }
        #group-logo { border-radius: 8px !important; border: 1px solid var(--vjb-card-border) !important; padding: 4px !important; background-color: rgba(255, 255, 255, 0.05) !important; }
        .list-group-item { background-color: transparent !important; color: var(--vjb-text-main) !important; border-color: var(--vjb-card-border) !important; }

        /* 评论区美化 */
        .comment-post { background-color: var(--vjb-card-bg) !important; backdrop-filter: blur(12px) !important; border: 1px solid var(--vjb-card-border) !important; border-radius: 14px !important; margin-bottom: 20px !important; padding: 8px 5px !important; box-shadow: 0 6px 20px rgba(0,0,0,0.04) !important; }
        .comment-post .info { display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 12px !important; padding-bottom: 10px !important; margin-bottom: 12px !important; border-bottom: 1px solid var(--vjb-card-border) !important; color: var(--vjb-text-muted) !important; }
        .comment-post .info > span:not([class]) { display: none !important; }
        .comment-post .info .author { font-weight: 800 !important; color: var(--vjb-theme, #4a90e2) !important; }
        .comment-post .info .time { background-color: var(--vjb-btn-sec-bg) !important; padding: 3px 10px !important; border-radius: 10px !important; border: 1px solid var(--vjb-card-border) !important; }
        .comment-post .info .vote { display: flex !important; gap: 10px !important; background-color: var(--vjb-btn-sec-bg) !important; padding: 4px 12px !important; border-radius: 12px !important; align-items: center !important; border: 1px solid var(--vjb-card-border) !important; }
        .comment-post .info .operation { margin-left: auto !important; display: flex !important; gap: 8px !important; }
        .comment-post .info .operation a { background-color: var(--vjb-btn-sec-bg) !important; padding: 4px 14px !important; border-radius: 12px !important; color: var(--vjb-text-main) !important; text-decoration: none !important; font-weight: 500 !important; border: 1px solid var(--vjb-card-border) !important; transition: all 0.2s !important; }
        .comment-post .info .operation a:hover { background-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; border-color: var(--vjb-theme, #4a90e2) !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important; }
        .author-avatar img { border-radius: 50% !important; border: 2px solid var(--vjb-card-border) !important; padding: 2px !important; width: 45px !important; height: 45px !important; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important; }
        .author-avatar img:hover { transform: scale(1.15) rotate(5deg) !important; border-color: var(--vjb-theme, #4a90e2) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }

        /* 面板按钮与窗口 */
        #vjb-float-btn { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background-color: rgba(30, 30, 30, 0.8); backdrop-filter: blur(10px); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9998; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
        #vjb-float-btn:hover { transform: scale(1.1) rotate(90deg); background-color: rgba(60, 60, 60, 0.9); }
        #vjb-float-btn svg { width: 28px; height: 28px; fill: #fff; }
        #vjb-settings-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 420px; max-height: 85vh; background-color: rgba(20, 20, 20, 0.95); backdrop-filter: blur(20px); border-radius: 16px; padding: 25px; z-index: 9999; color: #eee; box-shadow: 0 10px 40px rgba(0,0,0,0.5); opacity: 0; pointer-events: none; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; transition: all 0.3s; }
        #vjb-settings-panel.active { opacity: 1; pointer-events: all; transform: translate(-50%, -50%) scale(1); }
        .vjb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        .vjb-title { font-size: 18px; font-weight: bold; color: #fff; }
        .vjb-close { cursor: pointer; font-size: 24px; color: #aaa; transition: color 0.2s; }
        .vjb-close:hover { color: #fff; }
        .vjb-group { margin-bottom: 20px; }
        .vjb-label { display: block; margin-bottom: 8px; font-size: 14px; color: #ccc; }
        .vjb-select, .vjb-input { width: 100%; padding: 8px 12px; background-color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #333; outline: none; box-sizing: border-box; }
        .vjb-range-wrap { display: flex; align-items: center; gap: 10px; }
        .vjb-range { flex: 1; accent-color: var(--vjb-theme, #4a90e2); }

        /* 💡 修复：最高优先级的滑动横条，保证绝对在所有层级最顶端，不会消失 */
        .vjb-nav-slider {
            position: absolute;
            height: 3px;
            background-color: var(--vjb-theme, #4a90e2) !important;
            border-radius: 3px 3px 0 0;
            pointer-events: none;
            opacity: 0;
            transition: left 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.4s ease, opacity 0.35s ease;
            box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important;
            z-index: 2147483647 !important;
            will-change: left, width;
            display: block !important;
        }
    `;
    GM_addStyle(styles);

    // ================= 💡 全息状态流自适应多维分色计算引擎 =================
    function processStatusTextElements() {
        const selectors = '#listStatus tbody td.status .view-solution, #listStatus tbody td.status > span, #listStatus tbody td.status > a, .status .view-solution, .status > span, table tbody td';
        const elements = document.querySelectorAll(selectors);

        elements.forEach(el => {
            if (el.closest('thead') || el.closest('th')) return;
            if (el.closest('.language') || el.classList.contains('language')) return;
            if (el.closest('.runtime') || el.closest('.memory') || el.closest('.length')) return;

            // 跳过 td 元素本身 —— 直接对 td 应用 flex 会破坏表格列对齐
            // badge 样式只应用在 td 内部的子元素上
            if (el.tagName === 'TD') {
                const table = el.closest('table');
                if (!table) return;
                const ths = Array.from(table.querySelectorAll('th'));
                const resIndex = ths.findIndex(th => th.textContent.includes('评测结果') || th.getAttribute('data-i18n') === 'status.list.result');
                if (resIndex === -1) return;
                const tr = el.closest('tr');
                if (!tr || tr.children[resIndex] !== el) return;

                // 若 td 内已有 .view-solution，交由该元素自身的选择器分支处理，避免双重嵌套
                if (el.querySelector('.view-solution')) return;

                // 找到或创建内部包装 span 用于挂 badge（仅针对纯文本内容的 td）
                let inner = el.querySelector('.vjb-status-inner');
                if (!inner) {
                    inner = document.createElement('span');
                    inner.className = 'vjb-status-inner';
                    while (el.firstChild) {
                        inner.appendChild(el.firstChild);
                    }
                    el.appendChild(inner);
                }
                el = inner;
            }

            let isConfirmedStatusContainer = false;

            if (el.closest('#listStatus tbody td.status')) {
                isConfirmedStatusContainer = true;
            } else if (el.classList.contains('view-solution') && !el.closest('.language')) {
                isConfirmedStatusContainer = true;
            } else if (el.classList.contains('vjb-status-inner')) {
                isConfirmedStatusContainer = true;
            }

            let txt = el.textContent ? el.textContent.trim() : "";
            if (!txt) return;
            let lowerTxt = txt.toLowerCase();

            const isGreen = lowerTxt.includes("accepted");
            const isRed = lowerTxt.includes("wrong answer") || lowerTxt.includes("hacked");
            const isOrange = lowerTxt.includes("presentation error");
            const isPurple = lowerTxt.includes("runtime error");
            const isBrightYellow = lowerTxt.includes("compilation error") || lowerTxt.includes("compile error") || lowerTxt.includes("compilations error");
            const isDarkYellow = lowerTxt.includes("time limit exceeded") || lowerTxt.includes("memory limit exceeded") || lowerTxt.includes("output limit exceeded") || lowerTxt.includes("idleness limit exceeded");

            // 严密的灰色状态拦截器字典
            const isGrey = lowerTxt.includes("system error") || lowerTxt.includes("internal error") ||
                lowerTxt.includes("rejected") || lowerTxt.includes("judgement failed") ||
                lowerTxt.includes("security violated") || lowerTxt.includes("denial of judgement") ||
                lowerTxt.includes("input preparation failed") || lowerTxt.includes("running") ||
                lowerTxt.includes("skipped") || lowerTxt.includes("pending") ||
                lowerTxt.includes("in queue") || lowerTxt.includes("waiting") ||
                lowerTxt.includes("judging") || lowerTxt.includes("network failed") ||
                lowerTxt.includes("login failed") || lowerTxt.includes("submitted") ||
                lowerTxt.includes("busy") || lowerTxt.includes("duplicate code") ||
                lowerTxt.includes("dumplicate code") || lowerTxt.includes("source code error") ||
                lowerTxt.includes("submit error") || lowerTxt.includes("problem unavailable");

            if (isConfirmedStatusContainer || isGreen || isRed || isOrange || isPurple || isBrightYellow || isDarkYellow || isGrey) {
                let colorClass = "vjb-color-red";

                if (isGreen) colorClass = "vjb-color-green";
                else if (isRed) colorClass = "vjb-color-red";
                else if (isOrange) colorClass = "vjb-color-orange";
                else if (isPurple) colorClass = "vjb-color-purple";
                else if (isBrightYellow) colorClass = "vjb-color-bright-yellow";
                else if (isDarkYellow) colorClass = "vjb-color-dark-yellow";
                else if (isGrey) colorClass = "vjb-color-grey";

                el.classList.add('vjb-status-block');
                el.classList.remove('vjb-color-green', 'vjb-color-red', 'vjb-color-orange', 'vjb-color-purple', 'vjb-color-bright-yellow', 'vjb-color-dark-yellow', 'vjb-color-grey');
                el.classList.add(colorClass);
            }
        });
    }

    // ================= 同源穿透向题面 iframe 灌入非干涉继承性字体样式 =================
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

            const hasCustomCode = settings.customFontCode.trim();
            const hasCustomContent = settings.customFontContent.trim();
            const useCode = hasCustomCode ? `"${settings.customFontCode}"` : (settings.fontCode !== 'none' ? `"${settings.fontCode}"` : '');
            const useContent = hasCustomContent ? `"${settings.customFontContent}"` : (settings.fontContent !== 'none' ? `"${settings.fontContent}"` : '');

            let iframeCss = '';
            if (useContent) {
                iframeCss += `
                    body, p, h1, h2, h3, h4, h5, h6, table, td, th, tr, li, ul, ol, dl, dt, dd, blockquote,
                    label, section, article, .markdown-body, .problem-content, .statement {
                        font-family: ${useContent}, sans-serif !important;
                    }
                `;
            }
            if (useCode) {
                iframeCss += `
                    pre, code:not([class*="math"]):not([class*="katex"]):not([class*="MathJax"]),
                    kbd, samp, .ace_editor, .source-code {
                        font-family: ${useCode}, monospace !important;
                    }
                `;
            }
            iframeCss += `
                var {
                    font-family: "Times New Roman", "Cambria", "MathJax_Math", serif !important;
                    font-style: italic !important;
                }
            `;
            style.innerHTML = iframeCss;
        } catch (e) { }
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
        } catch (e) { }
        applySettings();
    }

    async function saveSettings() {
        GM_setValue('vjb_settings', settings);
        try { await localDB.set('vjb_bgData', currentBgData); } catch (e) { }
        if (activeBgObjectURL) { URL.revokeObjectURL(activeBgObjectURL); activeBgObjectURL = ''; }
        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--vjb-opacity', settings.opacity);
        const themeColor = settings.themeColor || '#4a90e2';
        root.style.setProperty('--vjb-theme', themeColor);

        let fontStyleEl = document.getElementById('vjb-global-fonts');
        if (!fontStyleEl) {
            fontStyleEl = document.createElement('style');
            fontStyleEl.id = 'vjb-global-fonts';
            document.head.appendChild(fontStyleEl);
        }

        let fontCss = '';
        const hasCustomCode = settings.customFontCode.trim();
        const hasCustomContent = settings.customFontContent.trim();

        const useCode = hasCustomCode ? `"${settings.customFontCode}"` : (settings.fontCode !== 'none' ? `"${settings.fontCode}"` : '');
        const useContent = hasCustomContent ? `"${settings.customFontContent}"` : (settings.fontContent !== 'none' ? `"${settings.fontContent}"` : '');

        if (useContent) {
            fontCss += `
                body, p, h1, h2, h3, h4, h5, h6, table, td, th, tr, li, ul, ol, dl, dt, dd, blockquote,
                label, input, select, button, .btn, .markdown-body, .problem-content, .statement {
                    font-family: ${useContent}, sans-serif !important;
                }
                textarea:not(#submit-solution):not([name="source"]) { font-family: ${useContent}, sans-serif !important; }
            `;
        }
        if (useCode) {
            fontCss += `
                pre, code:not([class*="math"]):not([class*="katex"]):not([class*="MathJax"]),
                kbd, samp, .ace_editor, .source-code,
                #submit-solution, textarea[name="source"], .modal-body textarea {
                    font-family: ${useCode}, monospace !important;
                }
                pre *, code *, .ace_editor *, .source-code * { font-family: inherit !important; }
            `;
        }
        fontCss += `
            var:not(:has(.katex)):not(:has([class*="katex"])):not(:has([class*="MathJax"])) {
                font-family: "Times New Roman", "Cambria", "MathJax_Math", serif !important;
                font-style: italic !important;
            }
        `;
        fontStyleEl.innerHTML = fontCss;

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

        const makeOption = (list, selected) => list.map(f => `<option value="${f}" style="font-family: '${f}' !important;" ${f === selected ? 'selected' : ''}>${f}</option>`).join('');

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
                <select id="vjb-set-font-code" class="vjb-select" style="font-family: inherit;">
                    <option value="none" style="font-family: inherit;" ${settings.fontCode === 'none' ? 'selected' : ''}>不替换</option>
                    ${makeOption(FONTS.code, settings.fontCode)}
                </select>
                <input type="text" id="vjb-set-custom-code" class="vjb-input" style="margin-top:6px;" placeholder="或输入系统自定义代码字体名(有内容时优先)" value="${settings.customFontCode || ''}">
            </div>

            <div class="vjb-group">
                <label class="vjb-label">内容字体 (Content Font)</label>
                <select id="vjb-set-font-content" class="vjb-select" style="font-family: inherit;">
                    <option value="none" style="font-family: inherit;" ${settings.fontContent === 'none' ? 'selected' : ''}>不替换</option>
                    ${makeOption(FONTS.content, settings.fontContent)}
                </select>
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

        if (panel.classList.contains('active')) {
            selectedFileData = currentBgData;
            document.getElementById('vjb-set-theme').value = settings.themeColor;
            document.getElementById('vjb-set-font-code').value = settings.fontCode;
            document.getElementById('vjb-set-custom-code').value = settings.customFontCode || '';
            document.getElementById('vjb-set-font-content').value = settings.fontContent;
            document.getElementById('vjb-set-custom-content').value = settings.customFontContent || '';
            document.getElementById('vjb-set-opacity').value = settings.opacity;
            document.getElementById('vjb-op-val').innerText = Math.round(settings.opacity * 100) + '%';

            const radios = document.getElementsByName('bgType');
            for (let r of radios) { if (r.value === settings.bgType) r.checked = true; }

            const textEl = document.getElementById('vjb-drop-text');
            const infoEl = document.getElementById('vjb-file-info');
            if (currentBgData) {
                textEl.style.display = 'none'; infoEl.style.display = 'block';
                infoEl.innerHTML = currentBgData instanceof Blob ? `✓ 已托管本地大文件背景` : `✓ 已连接外部背景`;
            } else {
                textEl.style.display = 'block'; infoEl.style.display = 'none';
            }
        }
    }

    // ================= 极致柔和滑动逻辑 (事件委托) =================
    function initNavSlider() {
        let slider = document.querySelector('.vjb-nav-slider');
        if (!slider) {
            slider = document.createElement('div');
            slider.className = 'vjb-nav-slider';
            document.body.appendChild(slider);
        }

        function moveSlider(target) {
            if (!target) { slider.style.opacity = '0'; return; }
            const rect = target.getBoundingClientRect();
            const padding = 4;
            slider.style.width = `${Math.max(20, rect.width - padding * 2)}px`;
            slider.style.left = `${rect.left + window.scrollX + padding}px`;
            slider.style.top = `${rect.bottom + window.scrollY - 3}px`;
            slider.style.opacity = '1';
        }

        const activeFinder = () => {
            const activeItem = document.querySelector('.navbar-nav .nav-link.active, .navbar-nav > li.active > a, .nav-tabs .nav-link.active, .contest-problem-menu .nav-link.active');
            if (activeItem) moveSlider(activeItem); else slider.style.opacity = '0';
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
            if (e.target && e.target.tagName === 'IFRAME') injectIframeStyles(e.target);
        }, true);
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); toggleSettingsPanel(); }
        });

        const statusObserver = new MutationObserver(() => {
            processStatusTextElements();
        });
        statusObserver.observe(document.body, { childList: true, subtree: true });
        processStatusTextElements();
    }

    init();
})();
