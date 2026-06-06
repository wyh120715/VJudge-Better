// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  VJudge美化工具 - 支持字体切换、背景设置、提交界面美化、榜单美化
// @author       VJudgeBetter Team
// @match        https://vjudge.net/*
// @match        https://cn.vjudge.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_uploadFile
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置管理 ====================
    const CONFIG = {
        fontFamily: GM_getValue('fontFamily', 'default'),
        backgroundImage: GM_getValue('backgroundImage', ''),
        backgroundOpacity: GM_getValue('backgroundOpacity', 0.8),
        enableGif: GM_getValue('enableGif', false),
        enableVideo: GM_getValue('enableVideo', false)
    };

    // ==================== 字体检测 ====================
    function detectAvailableFonts() {
        const commonFonts = [
            'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
            'Courier New', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
            'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong',
            'STHeiti', 'STKaiti', 'STSong', 'STFangsong',
            'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC',
            'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Han Sans CN'
        ];

        const detectedFonts = ['default'];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '72px monospace';

        const baseWidth = ctx.measureText('mmmmmmmmmmlli').width;

        commonFonts.forEach(font => {
            ctx.font = `72px "${font}", monospace`;
            const width = ctx.measureText('mmmmmmmmmmlli').width;
            if (width !== baseWidth) {
                detectedFonts.push(font);
            }
        });

        return detectedFonts;
    }

    // ==================== 样式注入 ====================
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'vjudge-better-styles';

        let fontCSS = '';
        if (CONFIG.fontFamily && CONFIG.fontFamily !== 'default') {
            fontCSS = `* { font-family: "${CONFIG.fontFamily}", sans-serif !important; }`;
        }

        let bgCSS = '';
        if (CONFIG.backgroundImage) {
            const isVideo = CONFIG.backgroundImage.match(/\.(mp4|webm|ogv)$/i);
            if (isVideo && CONFIG.enableVideo) {
                // 视频背景处理
                bgCSS = `
                    body::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: -9999;
                        opacity: ${CONFIG.backgroundOpacity};
                        background: #000;
                    }
                    #vjudge-video-bg {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        min-width: 100%;
                        min-height: 100%;
                        width: auto;
                        height: auto;
                        z-index: -9998;
                        transform: translate(-50%, -50%);
                        pointer-events: none;
                    }
                `;
            } else {
                bgCSS = `
                    body::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: -9999;
                        background-image: url('${CONFIG.backgroundImage}');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        opacity: ${CONFIG.backgroundOpacity};
                        pointer-events: none;
                    }
                `;
            }
        }

        style.textContent = `
            ${fontCSS}
            ${bgCSS}

            /* ==================== 全局美化 ==================== */
            body {
                transition: all 0.3s ease;
            }

            /* ==================== 提交界面美化 ==================== */
            .problem-submit-form,
            form[name="solutionForm"],
            .submit-problem-form {
                background: rgba(255, 255, 255, 0.95) !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
                padding: 24px !important;
                backdrop-filter: blur(10px) !important;
            }

            .problem-submit-form input[type="text"],
            .problem-submit-form input[type="number"],
            .problem-submit-form select,
            .problem-submit-form textarea,
            form[name="solutionForm"] input[type="text"],
            form[name="solutionForm"] select,
            form[name="solutionForm"] textarea {
                border: 2px solid #e0e0e0 !important;
                border-radius: 8px !important;
                padding: 10px 14px !important;
                transition: all 0.3s ease !important;
                background: rgba(255, 255, 255, 0.9) !important;
            }

            .problem-submit-form input:focus,
            .problem-submit-form select:focus,
            .problem-submit-form textarea:focus,
            form[name="solutionForm"] input:focus,
            form[name="solutionForm"] select:focus,
            form[name="solutionForm"] textarea:focus {
                border-color: #4CAF50 !important;
                box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1) !important;
                outline: none !important;
            }

            .problem-submit-form button[type="submit"],
            .problem-submit-form input[type="submit"],
            form[name="solutionForm"] button[type="submit"],
            form[name="solutionForm"] input[type="submit"] {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 32px !important;
                font-weight: bold !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            }

            .problem-submit-form button[type="submit"]:hover,
            .problem-submit-form input[type="submit"]:hover,
            form[name="solutionForm"] button[type="submit"]:hover,
            form[name="solutionForm"] input[type="submit"]:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
            }

            /* ==================== 榜单界面美化 ==================== */
            .standings-table,
            table[class*="standings"],
            table[class*="contest"][class*="rank"],
            .contest-rank-table {
                border-radius: 12px !important;
                overflow: hidden !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
            }

            .standings-table thead,
            table[class*="standings"] thead,
            table[class*="contest"][class*="rank"] thead {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
            }

            .standings-table th,
            table[class*="standings"] th,
            table[class*="contest"][class*="rank"] th {
                padding: 16px 12px !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                border: none !important;
            }

            .standings-table td,
            table[class*="standings"] td,
            table[class*="contest"][class*="rank"] td {
                padding: 14px 12px !important;
                border-bottom: 1px solid #f0f0f0 !important;
                transition: all 0.2s ease !important;
            }

            .standings-table tbody tr:hover,
            table[class*="standings"] tbody tr:hover,
            table[class*="contest"][class*="rank"] tbody tr:hover {
                background: rgba(102, 126, 234, 0.08) !important;
                transform: scale(1.01) !important;
            }

            /* 奖牌颜色美化 */
            .standings-table td[class*="gold"],
            table[class*="standings"] td[class*="gold"],
            td.medal-gold {
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%) !important;
                color: white !important;
                font-weight: bold !important;
            }

            .standings-table td[class*="silver"],
            table[class*="standings"] td[class*="silver"],
            td.medal-silver {
                background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%) !important;
                color: white !important;
                font-weight: bold !important;
            }

            .standings-table td[class*="bronze"],
            table[class*="standings"] td[class*="bronze"],
            td.medal-bronze {
                background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%) !important;
                color: white !important;
                font-weight: bold !important;
            }

            /* AC 状态美化 */
            td[class*="accepted"],
            td.status-accepted,
            td[data-result="AC"] {
                background: rgba(76, 175, 80, 0.15) !important;
                color: #2E7D32 !important;
                font-weight: 600 !important;
            }

            /* WA 状态美化 */
            td[class*="wrong"],
            td.status-wrong,
            td[data-result="WA"] {
                background: rgba(244, 67, 54, 0.15) !important;
                color: #C62828 !important;
                font-weight: 600 !important;
            }

            /* 排名数字美化 */
            .standings-table td:first-child,
            table[class*="standings"] td:first-child {
                font-weight: bold !important;
                font-size: 1.1em !important;
            }

            /* ==================== 导航栏美化 ==================== */
            .navbar,
            nav[class*="nav"] {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
            }

            .navbar a,
            nav[class*="nav"] a {
                color: white !important;
                transition: all 0.3s ease !important;
            }

            .navbar a:hover,
            nav[class*="nav"] a:hover {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 6px !important;
            }

            /* ==================== 卡片美化 ==================== */
            .card,
            div[class*="panel"],
            div[class*="box"] {
                border-radius: 12px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
                border: none !important;
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
            }

            /* ==================== 按钮通用美化 ==================== */
            .btn,
            button,
            input[type="button"] {
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
            }

            .btn-primary,
            button.btn-primary,
            input.btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border: none !important;
            }

            .btn-primary:hover,
            button.btn-primary:hover,
            input.btn-primary:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
            }

            /* ==================== 表格通用美化 ==================== */
            table {
                border-collapse: separate !important;
                border-spacing: 0 !important;
            }

            /* ==================== 输入框通用美化 ==================== */
            input[type="text"],
            input[type="password"],
            input[type="email"],
            input[type="search"],
            textarea {
                border: 2px solid #e0e0e0 !important;
                border-radius: 8px !important;
                padding: 10px 14px !important;
                transition: all 0.3s ease !important;
            }

            input[type="text"]:focus,
            input[type="password"]:focus,
            input[type="email"]:focus,
            input[type="search"]:focus,
            textarea:focus {
                border-color: #667eea !important;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                outline: none !important;
            }

            /* ==================== 滚动条美化 ==================== */
            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            }
        `;

        document.head.appendChild(style);
    }

    // ==================== 视频背景创建 ====================
    function createVideoBackground(videoUrl) {
        const existingVideo = document.getElementById('vjudge-video-bg');
        if (existingVideo) {
            existingVideo.remove();
        }

        const video = document.createElement('video');
        video.id = 'vjudge-video-bg';
        video.src = videoUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;

        document.body.insertBefore(video, document.body.firstChild);
    }

    // ==================== 设置面板 ====================
    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'vjudge-better-settings';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99999;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 30px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            font-family: inherit;
        `;

        const detectedFonts = detectAvailableFonts();
        let fontOptions = '<option value="default">默认字体</option>';
        detectedFonts.forEach(font => {
            if (font !== 'default') {
                const selected = CONFIG.fontFamily === font ? 'selected' : '';
                fontOptions += `<option value="${font}" ${selected}>${font}</option>`;
            }
        });

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #667eea; font-size: 24px;">⚙️ VJudgeBetter 设置</h2>
                <button id="vjb-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">📝 字体选择</label>
                <select id="vjb-font" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: #fff;">
                    ${fontOptions}
                </select>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">🖼️ 背景图片</label>
                <div id="vjb-bg-dropzone" style="width: 100%; padding: 30px; border: 2px dashed #e0e0e0; border-radius: 8px; text-align: center; background: #fafafa; transition: all 0.3s ease; cursor: pointer;">
                    <div style="font-size: 48px; color: #ccc; margin-bottom: 10px;">📁</div>
                    <div style="color: #666;">点击或拖拽图片到此处上传</div>
                    <div style="font-size: 12px; color: #999; margin-top: 8px;">支持格式：JPG, PNG, WebP, GIF, MP4/WebM</div>
                    <input type="file" id="vjb-bg-file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm" style="display: none;"/>
                </div>
                ${CONFIG.backgroundImage ? `<div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #666;">当前已设置背景</span>
                    <button id="vjb-remove-bg" style="background: #ff4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">移除背景</button>
                </div>` : ''}
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">🌫️ 背景透明度：<span id="vjb-opacity-value">${Math.round(CONFIG.backgroundOpacity * 100)}%</span></label>
                <input type="range" id="vjb-opacity" min="0" max="1" step="0.05" value="${CONFIG.backgroundOpacity}" style="width: 100%;"/>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: flex; align-items: center; margin-bottom: 8px; font-weight: 600; color: #333;">
                    <input type="checkbox" id="vjb-enable-gif" ${CONFIG.enableGif ? 'checked' : ''} style="margin-right: 8px;"/>
                    启用 GIF 背景（可能影响性能）
                </label>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: flex; align-items: center; margin-bottom: 8px; font-weight: 600; color: #333;">
                    <input type="checkbox" id="vjb-enable-video" ${CONFIG.enableVideo ? 'checked' : ''} style="margin-right: 8px;"/>
                    启用视频背景（MP4/WebM）
                </label>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="vjb-cancel" style="padding: 12px 24px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #666;">取消</button>
                <button id="vjb-save" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">保存设置</button>
            </div>
        `;

        // 遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'vjudge-better-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99998;
            backdrop-filter: blur(4px);
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        // 事件绑定
        document.getElementById('vjb-close').addEventListener('click', closeSettings);
        document.getElementById('vjb-cancel').addEventListener('click', closeSettings);
        overlay.addEventListener('click', closeSettings);

        document.getElementById('vjb-opacity').addEventListener('input', (e) => {
            document.getElementById('vjb-opacity-value').textContent = Math.round(e.target.value * 100) + '%';
        });

        // 拖拽上传功能
        const dropzone = document.getElementById('vjb-bg-dropzone');
        const fileInput = document.getElementById('vjb-bg-file');

        // 点击触发文件选择
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择变化
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target.files[0]);
        });

        // 拖拽进入
        dropzone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#667eea';
            dropzone.style.background = '#f0f4ff';
        });

        // 拖拽离开
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#e0e0e0';
            dropzone.style.background = '#fafafa';
        });

        // 拖拽中
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        // 拖拽放下
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#e0e0e0';
            dropzone.style.background = '#fafafa';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });

        function handleFileSelect(file) {
            if (!file) return;
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
            if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
                alert('不支持的文件格式，请选择图片（JPG/PNG/WebP/GIF）或视频（MP4/WebM）文件');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                GM_setValue('backgroundImage', e.target.result);
                location.reload();
            };
            reader.readAsDataURL(file);
        }

        document.getElementById('vjb-save').addEventListener('click', saveSettings);

        if (document.getElementById('vjb-remove-bg')) {
            document.getElementById('vjb-remove-bg').addEventListener('click', () => {
                GM_setValue('backgroundImage', '');
                CONFIG.backgroundImage = '';
                closeSettings();
                location.reload();
            });
        }

        function closeSettings() {
            panel.remove();
            overlay.remove();
        }

        function saveSettings() {
            const newFont = document.getElementById('vjb-font').value;
            const newOpacity = parseFloat(document.getElementById('vjb-opacity').value);
            const newEnableGif = document.getElementById('vjb-enable-gif').checked;
            const newEnableVideo = document.getElementById('vjb-enable-video').checked;

            GM_setValue('fontFamily', newFont);
            GM_setValue('backgroundOpacity', newOpacity);
            GM_setValue('enableGif', newEnableGif);
            GM_setValue('enableVideo', newEnableVideo);

            location.reload();
        }
    }

    // ==================== 初始化 ====================
    function init() {
        // 等待 DOM 加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }

        function start() {
            injectStyles();

            // 如果是视频背景，创建视频元素
            if (CONFIG.backgroundImage && CONFIG.backgroundImage.match(/\.(mp4|webm|ogv)$/i) && CONFIG.enableVideo) {
                createVideoBackground(CONFIG.backgroundImage);
            }

            // 注册菜单命令
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand('⚙️ VJudgeBetter 设置', createSettingsPanel);
            }

            // 添加快捷键支持 (Alt + S)
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 's') {
                    e.preventDefault();
                    createSettingsPanel();
                }
            });

            console.log('🎨 VJudgeBetter 已加载！按 Alt+S 打开设置面板');
        }
    }

    // 启动
    init();
})();
