// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  VJudge 增强脚本：平滑动画、统一字体、自定义背景、美化榜单
// @author       VJudgeBetter Team
// @match        https://vjudge.net/*
// @match        https://cn.vjudge.net/*
// @exclude      *iframe*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 防止在 iframe 中运行 (双重保险)
    if (window.top !== window.self) {
        return;
    }

    // ================= 配置与数据 =================
    const FONTS = {
        code: [
            "JetBrains Mono NL", "JetBrains Mono", "Fira Code", "Cascadia Code", 
            "Source Code Pro", "Consolas", "Monaco", "Menlo", "Ubuntu Mono", 
            "Roboto Mono", "Hack", "DejaVu Sans Mono", "Courier New", "Lucida Console", 
            "Inconsolata", "Droid Sans Mono", "PT Mono", "Anonymous Pro", 
            "IBM Plex Mono", "Overpass Mono", "Space Mono", "Input Mono", 
            "PragmataPro", "MonoLisa", "Comic Mono"
        ],
        content: [ // 题面现在使用此分类
            "Google Sans", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", 
            "Raleway", "Poppins", "Nunito", "Merriweather", "Playfair Display", 
            "Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", 
            "Georgia", "Times New Roman", "Palatino Linotype", "Book Antiqua", 
            "Microsoft YaHei", "SimHei", "SimSun", "KaiTi", "STHeiti", 
            "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans CN", 
            "Noto Serif CJK SC", "Source Han Serif CN", "Meiryo", "Yu Gothic", 
            "Malgun Gothic", "Apple SD Gothic Neo", "Dotum", "Gulim", 
            "Segoe UI", "System-ui", "-apple-system", "BlinkMacSystemFont", 
            "Emoji One Color", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"
        ]
    };

    const DEFAULT_SETTINGS = {
        bgImage: '',
        bgType: 'image', // image, gif, video
        opacity: 0.85,
        fontCode: 'JetBrains Mono NL',
        fontContent: 'Google Sans', // 题面和其他内容共用
        themeColor: '#4a90e2'
    };

    let settings = { ...DEFAULT_SETTINGS };

    // ================= 样式注入 =================
    const styles = `
        /* --- 全局平滑过渡 --- */
        body, div, span, a, button, input, table, tr, td, th, li, ul, .nav-slider {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        /* --- 背景层 --- */
        #vjb-bg-container {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -9999;
            pointer-events: none;
            overflow: hidden;
        }
        #vjb-bg-image, #vjb-bg-video {
            width: 100%; height: 100%;
            object-fit: cover;
            opacity: var(--vjb-opacity, 0.85);
            transition: opacity 0.5s ease;
        }

        /* --- 浮动齿轮按钮 --- */
        #vjb-float-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: rgba(30, 30, 30, 0.8);
            backdrop-filter: blur(10px);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9998;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
        }
        #vjb-float-btn:hover {
            transform: scale(1.1) rotate(90deg);
            background: rgba(60, 60, 60, 0.9);
        }
        #vjb-float-btn svg {
            width: 28px;
            height: 28px;
            fill: #fff;
        }

        /* --- 设置面板 --- */
        #vjb-settings-panel {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 400px;
            max-height: 80vh;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 25px;
            z-index: 9999;
            color: #eee;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            opacity: 0;
            pointer-events: none;
            border: 1px solid rgba(255,255,255,0.1);
            overflow-y: auto;
        }
        #vjb-settings-panel.active {
            opacity: 1;
            pointer-events: all;
            transform: translate(-50%, -50%) scale(1);
        }
        .vjb-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 10px;
        }
        .vjb-title { font-size: 18px; font-weight: bold; color: #fff; }
        .vjb-close { cursor: pointer; font-size: 24px; color: #aaa; }
        .vjb-close:hover { color: #fff; }
        
        .vjb-group { margin-bottom: 20px; }
        .vjb-label { display: block; margin-bottom: 8px; font-size: 14px; color: #ccc; }
        .vjb-select, .vjb-input {
            width: 100%;
            padding: 8px 12px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            color: #fff;
            font-family: inherit;
            outline: none;
        }
        .vjb-select:focus, .vjb-input:focus { border-color: var(--vjb-theme, #4a90e2); }
        .vjb-range-wrap { display: flex; align-items: center; gap: 10px; }
        .vjb-range { flex: 1; accent-color: var(--vjb-theme, #4a90e2); }
        
        /* --- 平滑滑动高亮 (Nav Slider) --- */
        .nav-menu, .problem-list-menu {
            position: relative;
            overflow: visible; 
        }
        /* 针对 VJudge 常见的导航结构 */
        .navbar-nav, .nav-tabs, .contest-problem-menu {
            position: relative;
        }
        
        /* 滑动块样式 */
        .vjb-nav-slider {
            position: absolute;
            bottom: 0;
            height: 3px;
            background: var(--vjb-theme, #4a90e2);
            border-radius: 3px 3px 0 0;
            pointer-events: none;
            transition: left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), width 0.3s ease;
            opacity: 0.8;
            box-shadow: 0 0 10px var(--vjb-theme, #4a90e2);
        }

        /* 强制链接相对定位以便计算 */
        .navbar-nav > li > a, 
        .nav-tabs > li > a, 
        .contest-problem-menu > li > a,
        .btn-link {
            position: relative;
            overflow: hidden;
        }
        
        /* 移除原有的底部边框或背景，由 slider 接管 */
        .navbar-nav > li.active > a, 
        .nav-tabs > li.active > a {
            border-bottom: none !important;
            background: transparent !important;
        }

        /* --- 字体应用 --- */
        /* 代码区域 */
        pre, code, .ace_editor, .ace_editor *, textarea.monospace, .input-textarea {
            font-family: var(--vjb-font-code, 'JetBrains Mono NL') !important;
        }
        
        /* 题面及其他内容 (统一使用 content 字体) */
        body, div, span, p, h1, h2, h3, h4, h5, h6, 
        .problem-content, .markdown-body, .table, .btn, 
        input:not([type="checkbox"]):not([type="radio"]), select {
            font-family: var(--vjb-font-content, 'Google Sans') !important;
        }
        
        /* 特殊排除：代码块内部不受 content 字体影响 (上面 pre/code 优先级更高) */
        
        /* --- 榜单美化 --- */
        .standings-table thead tr {
            background: linear-gradient(90deg, rgba(74,144,226,0.1) 0%, rgba(74,144,226,0.3) 100%) !important;
        }
        .standings-table tbody tr:hover {
            background: rgba(255,255,255,0.05) !important;
            transform: scale(1.005);
        }
        .status-accepted { color: #2ecc71 !important; font-weight: bold; }
        .status-wrong-answer { color: #e74c3c !important; }
        .status-pending { color: #f1c40f !important; }
        
        /* 奖牌渐变 */
        .medal-gold { background: linear-gradient(45deg, #FFD700, #FDB931) !important; color: #000 !important; }
        .medal-silver { background: linear-gradient(45deg, #E0E0E0, #BDBDBD) !important; color: #000 !important; }
        .medal-bronze { background: linear-gradient(45deg, #CD7F32, #A0522D) !important; color: #fff !important; }
    `;

    GM_addStyle(styles);

    // ================= 逻辑控制 =================

    function loadSettings() {
        const saved = GM_getValue('vjb_settings');
        if (saved) {
            settings = { ...DEFAULT_SETTINGS, ...saved };
        }
        applySettings();
    }

    function saveSettings() {
        GM_setValue('vjb_settings', settings);
        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--vjb-opacity', settings.opacity);
        root.style.setProperty('--vjb-font-code', settings.fontCode);
        root.style.setProperty('--vjb-font-content', settings.fontContent);
        root.style.setProperty('--vjb-theme', settings.themeColor);

        // 背景处理
        const container = document.getElementById('vjb-bg-container');
        if (!container) return;

        if (settings.bgImage) {
            container.style.display = 'block';
            if (settings.bgType === 'video') {
                let video = document.getElementById('vjb-bg-video');
                if (!video) {
                    video = document.createElement('video');
                    video.id = 'vjb-bg-video';
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    container.innerHTML = '';
                    container.appendChild(video);
                }
                video.src = settings.bgImage;
            } else {
                let img = document.getElementById('vjb-bg-image');
                if (!img) {
                    img = document.createElement('img');
                    img.id = 'vjb-bg-image';
                    container.innerHTML = '';
                    container.appendChild(img);
                }
                img.src = settings.bgImage;
            }
        } else {
            container.style.display = 'none';
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
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
        `;
        btn.onclick = toggleSettingsPanel;
        document.body.appendChild(btn);
    }

    function createSettingsPanel() {
        if (document.getElementById('vjb-settings-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'vjb-settings-panel';
        
        const makeOption = (list, selected) => {
            return list.map(f => `<option value="${f}" ${f === selected ? 'selected' : ''}>${f}</option>`).join('');
        };

        panel.innerHTML = `
            <div class="vjb-header">
                <span class="vjb-title">VJudgeBetter 设置</span>
                <span class="vjb-close" onclick="document.getElementById('vjb-settings-panel').classList.remove('active')">&times;</span>
            </div>
            
            <div class="vjb-group">
                <label class="vjb-label">代码字体 (Code Font)</label>
                <select id="vjb-set-font-code" class="vjb-select">${makeOption(FONTS.code, settings.fontCode)}</select>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">题面与其他内容字体 (Content Font)</label>
                <div style="font-size:12px; color:#888; margin-bottom:5px;">题面将自动同步为此字体</div>
                <select id="vjb-set-font-content" class="vjb-select">${makeOption(FONTS.content, settings.fontContent)}</select>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">背景透明度</label>
                <div class="vjb-range-wrap">
                    <input type="range" id="vjb-set-opacity" class="vjb-range" min="0" max="1" step="0.05" value="${settings.opacity}">
                    <span id="vjb-op-val">${Math.round(settings.opacity * 100)}%</span>
                </div>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">背景图片/视频 URL (.jpg, .png, .gif, .mp4)</label>
                <input type="text" id="vjb-set-bg" class="vjb-input" value="${settings.bgImage}" placeholder="输入图片链接...">
                <div style="margin-top:5px; display:flex; gap:10px;">
                    <label><input type="radio" name="bgType" value="image" ${settings.bgType === 'image' ? 'checked' : ''}> 图片/GIF</label>
                    <label><input type="radio" name="bgType" value="video" ${settings.bgType === 'video' ? 'checked' : ''}> 视频</label>
                    <button id="vjb-clear-bg" style="background:none; border:1px solid #666; color:#aaa; padding:2px 8px; border-radius:4px; cursor:pointer;">清除背景</button>
                </div>
            </div>
            
            <div style="text-align:right; margin-top:20px;">
                <button id="vjb-save-btn" style="background:var(--vjb-theme); color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">保存并应用</button>
            </div>
        `;

        document.body.appendChild(panel);

        // 事件绑定
        document.getElementById('vjb-set-opacity').oninput = (e) => {
            document.getElementById('vjb-op-val').innerText = Math.round(e.target.value * 100) + '%';
        };

        document.getElementById('vjb-clear-bg').onclick = () => {
            document.getElementById('vjb-set-bg').value = '';
        };

        document.getElementById('vjb-save-btn').onclick = () => {
            settings.fontCode = document.getElementById('vjb-set-font-code').value;
            settings.fontContent = document.getElementById('vjb-set-font-content').value;
            settings.opacity = parseFloat(document.getElementById('vjb-set-opacity').value);
            settings.bgImage = document.getElementById('vjb-set-bg').value.trim();
            
            const bgRadios = document.getElementsByName('bgType');
            for(let r of bgRadios) {
                if(r.checked) settings.bgType = r.value;
            }
            
            saveSettings();
            toggleSettingsPanel();
        };
    }

    function toggleSettingsPanel() {
        const panel = document.getElementById('vjb-settings-panel');
        if (!panel) createSettingsPanel();
        panel.classList.toggle('active');
        
        // 重新填充当前值以防外部修改
        if(panel.classList.contains('active')) {
            document.getElementById('vjb-set-font-code').value = settings.fontCode;
            document.getElementById('vjb-set-font-content').value = settings.fontContent;
            document.getElementById('vjb-set-opacity').value = settings.opacity;
            document.getElementById('vjb-op-val').innerText = Math.round(settings.opacity * 100) + '%';
            document.getElementById('vjb-set-bg').value = settings.bgImage;
            const radios = document.getElementsByName('bgType');
            for(let r of radios) {
                if(r.value === settings.bgType) r.checked = true;
            }
        }
    }

    // ================= 平滑滑块逻辑 =================
    function initNavSlider() {
        // 创建一个全局滑块
        let slider = document.querySelector('.vjb-nav-slider');
        if (!slider) {
            slider = document.createElement('div');
            slider.className = 'vjb-nav-slider';
            document.body.appendChild(slider);
        }

        function moveSlider(target) {
            if (!target) return;
            const rect = target.getBoundingClientRect();
            const parentRect = target.parentElement.getBoundingClientRect(); // 相对于父级
            
            // 计算相对于视口的位置，然后减去父级偏移？ 
            // 更简单的方法：直接算 absolute 相对于 document 或者 offsetParent
            // 这里我们假设 slider 是 body 的子元素，所以需要计算相对于 body 的位置
            
            const bodyRect = document.body.getBoundingClientRect();
            const left = rect.left - bodyRect.left;
            const width = rect.width;
            const top = rect.bottom - bodyRect.top; // 底部对齐

            slider.style.width = `${width}px`;
            slider.style.left = `${left}px`;
            slider.style.top = `${top - 3}px`; // 3px is slider height
        }

        function attachListeners() {
            // 选择所有可能的导航项
            const selectors = [
                '.navbar-nav > li > a', 
                '.nav-tabs > li > a', 
                '.contest-problem-menu > li > a',
                '.btn-link' 
            ];
            
            const items = document.querySelectorAll(selectors.join(', '));
            
            items.forEach(item => {
                item.addEventListener('mouseenter', () => moveSlider(item));
                item.addEventListener('click', () => {
                    // 延迟一点等待 active 类切换
                    setTimeout(() => moveSlider(item), 50);
                });
            });

            // 初始化位置：找到当前 active 的元素
            const activeItem = document.querySelector('.navbar-nav > li.active > a, .nav-tabs > li.active > a, .contest-problem-menu > li.active > a');
            if (activeItem) {
                // 稍微延迟确保布局完成
                setTimeout(() => moveSlider(activeItem), 100);
            } else if (items.length > 0) {
                // 如果没有 active，默认第一个
                setTimeout(() => moveSlider(items[0]), 100);
            }
        }

        // 监听 DOM 变化以应对 SPA 路由或动态加载
        const observer = new MutationObserver(() => {
            attachListeners();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        attachListeners();
        
        // 窗口大小改变时重算
        window.addEventListener('resize', () => {
            const activeItem = document.querySelector('.navbar-nav > li.active > a, .nav-tabs > li.active > a, .contest-problem-menu > li.active > a');
            if(activeItem) moveSlider(activeItem);
        });
    }

    // ================= 初始化 =================
    function init() {
        loadSettings();
        initBackground();
        createFloatButton();
        
        // 延迟初始化滑块以确保 DOM 就绪
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initNavSlider();
            });
        } else {
            initNavSlider();
        }

        // 快捷键 Alt+S
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                toggleSettingsPanel();
            }
        });
    }

    init();

})();
