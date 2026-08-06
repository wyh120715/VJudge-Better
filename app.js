// ==UserScript==
// @name         VJudgeBetter
// @namespace    http://tampermonkey.net/
// @version      1.3
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
        lang: 'auto',
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

    // ================= 多语言 i18n 适配系统 =================
    const TRANSLATIONS = {
        'zh-CN': {
            settingsTitle: "VJudgeBetter 设置",
            langLabel: "界面语言 (Language)",
            autoDetect: "跟随系统 / 网站",
            themeColorLabel: "个性全局主题色 (Theme Color)",
            resetTheme: "恢复默认蓝",
            codeFontLabel: "代码字体 (Code Font)",
            noReplace: "不替换",
            customCodeFontPlaceholder: "或输入系统自定义代码字体名(有内容时优先)",
            contentFontLabel: "内容字体 (Content Font)",
            customContentFontPlaceholder: "或输入系统自定义内容字体名(有内容时优先)",
            bgOpacityLabel: "背景透明度",
            uploadBgLabel: "上传背景图片/视频",
            dropText: "点击或拖拽 (.jpg, .png, .gif, .mp4 最大20MB)",
            bgTypeImage: "图片/GIF",
            bgTypeVideo: "视频",
            clearBg: "清除背景",
            saveBtn: "保存并应用",
            exportBtn: "导出配置",
            importBtn: "导入配置",
            fileTooLargeAlert: "文件过大！大小不能超过 {maxSize}MB",
            fileSelectedTemp: "✓ 已临时选中文件：{name}",
            localBgHosted: "✓ 已托管本地大文件背景",
            externalBgConnected: "✓ 已连接外部背景",
            announcementTitle: "公告",
            emptyDescPlaceholder: "这里什么都没有……"
        },
        'zh-TW': {
            settingsTitle: "VJudgeBetter 設定",
            langLabel: "介面語言 (Language)",
            autoDetect: "跟隨系統 / 網站",
            themeColorLabel: "個性全域主題色 (Theme Color)",
            resetTheme: "恢復預設藍",
            codeFontLabel: "程式碼字型 (Code Font)",
            noReplace: "不替換",
            customCodeFontPlaceholder: "或輸入系統自訂程式碼字型名(有內容時優先)",
            contentFontLabel: "內容字型 (Content Font)",
            customContentFontPlaceholder: "或輸入系統自訂內容字型名(有內容時優先)",
            bgOpacityLabel: "背景透明度",
            uploadBgLabel: "上傳背景圖片/影片",
            dropText: "點擊或拖曳 (.jpg, .png, .gif, .mp4 最大20MB)",
            bgTypeImage: "圖片/GIF",
            bgTypeVideo: "影片",
            clearBg: "清除背景",
            saveBtn: "儲存並套用",
            fileTooLargeAlert: "檔案過大！大小不能超過 {maxSize}MB",
            fileSelectedTemp: "✓ 已臨時選取檔案：{name}",
            localBgHosted: "✓ 已託管本地大檔案背景",
            externalBgConnected: "✓ 已連接外部背景",
            announcementTitle: "公告",
            emptyDescPlaceholder: "這裡什麼都沒有……"
        },
        'en': {
            settingsTitle: "VJudgeBetter Settings",
            langLabel: "Language",
            autoDetect: "Auto (System / Site)",
            themeColorLabel: "Theme Color",
            resetTheme: "Reset to Default Blue",
            codeFontLabel: "Code Font",
            noReplace: "Do not replace",
            customCodeFontPlaceholder: "Or enter custom code font name (takes priority)",
            contentFontLabel: "Content Font",
            customContentFontPlaceholder: "Or enter custom content font name (takes priority)",
            bgOpacityLabel: "Background Opacity",
            uploadBgLabel: "Upload Background Image/Video",
            dropText: "Click or drop file (.jpg, .png, .gif, .mp4 max 20MB)",
            bgTypeImage: "Image/GIF",
            bgTypeVideo: "Video",
            clearBg: "Clear Background",
            saveBtn: "Save & Apply",
            exportBtn: "Export Settings",
            importBtn: "Import Settings",
            fileTooLargeAlert: "File too large! Size cannot exceed {maxSize}MB",
            fileSelectedTemp: "✓ Selected file: {name}",
            localBgHosted: "✓ Local background loaded",
            externalBgConnected: "✓ External background connected",
            announcementTitle: "Announcement",
            emptyDescPlaceholder: "Nothing here..."
        },
        'ja': {
            settingsTitle: "VJudgeBetter 設定",
            langLabel: "表示言語 (Language)",
            autoDetect: "自動 (システム / サイト)",
            themeColorLabel: "テーマカラー (Theme Color)",
            resetTheme: "デフォルトブルーに戻す",
            codeFontLabel: "コードフォント (Code Font)",
            noReplace: "変更しない",
            customCodeFontPlaceholder: "またはカスタムコードフォント名を入力 (優先)",
            contentFontLabel: "コンテンツフォント (Content Font)",
            customContentFontPlaceholder: "またはカスタムコンテンツフォント名を入力 (優先)",
            bgOpacityLabel: "背景の不透明度",
            uploadBgLabel: "背景画像/動画をアップロード",
            dropText: "クリックまたはドロップ (.jpg, .png, .gif, .mp4 最大20MB)",
            bgTypeImage: "画像/GIF",
            bgTypeVideo: "動画",
            clearBg: "背景をクリア",
            saveBtn: "保存して適用",
            fileTooLargeAlert: "ファイルが大きすぎます！ {maxSize}MBを超過できません",
            fileSelectedTemp: "✓ 選択されたファイル：{name}",
            localBgHosted: "✓ ローカル背景がロードされました",
            externalBgConnected: "✓ 外部背景が接続されました",
            announcementTitle: "お知らせ",
            emptyDescPlaceholder: "ここには何もありません..."
        },
        'ko': {
            settingsTitle: "VJudgeBetter 설정",
            langLabel: "언어 (Language)",
            autoDetect: "자동 (시스템 / 사이트)",
            themeColorLabel: "테마 색상 (Theme Color)",
            resetTheme: "기본 파란색으로 복원",
            codeFontLabel: "코드 폰트 (Code Font)",
            noReplace: "변경 안 함",
            customCodeFontPlaceholder: "또는 사용자 지정 코드 폰트명 입력 (우선 적용)",
            contentFontLabel: "본문 폰트 (Content Font)",
            customContentFontPlaceholder: "또는 사용자 지정 본문 폰트명 입력 (우선 적용)",
            bgOpacityLabel: "배경 투명도",
            uploadBgLabel: "배경 이미지/동영상 업로드",
            dropText: "클릭 또는 드래그 (.jpg, .png, .gif, .mp4 최대 20MB)",
            bgTypeImage: "이미지/GIF",
            bgTypeVideo: "동영상",
            clearBg: "배경 지우기",
            saveBtn: "저장 및 적용",
            fileTooLargeAlert: "파일이 너무 큽니다! {maxSize}MB를 초과할 수 없습니다",
            fileSelectedTemp: "✓ 선택된 파일: {name}",
            localBgHosted: "✓ 로컬 배경 로드됨",
            externalBgConnected: "✓ 외부 배경 연결됨",
            announcementTitle: "공지사항",
            emptyDescPlaceholder: "여기에 아무것도 없습니다..."
        },
        'ar': {
            settingsTitle: "إعدادات VJudgeBetter",
            langLabel: "اللغة (Language)",
            autoDetect: "تلقائي (النظام / الموقع)",
            themeColorLabel: "لون المظهر (Theme Color)",
            resetTheme: "استعادة الأزرق الافتراضي",
            codeFontLabel: "خط البرمجة (Code Font)",
            noReplace: "عدم الاستبدال",
            customCodeFontPlaceholder: "أو أدخل اسم خط البرمجة المخصص (له الأولوية)",
            contentFontLabel: "خط المحتوى (Content Font)",
            customContentFontPlaceholder: "أو أدخل اسم خط المحتوى المخصص (له الأولوية)",
            bgOpacityLabel: "شفافية الخلفية",
            uploadBgLabel: "تحميل صورة/فيديو الخلفية",
            dropText: "انقر أو اسحب الملف (.jpg, .png, .gif, .mp4 بحد أقصى 20 ميجابايت)",
            bgTypeImage: "صورة/GIF",
            bgTypeVideo: "فيديو",
            clearBg: "مسح الخلفية",
            saveBtn: "حفظ وتطبيق",
            fileTooLargeAlert: "الملف كبير جداً! لا يمكن أن يتجاوز الحجم {maxSize} ميجابايت",
            fileSelectedTemp: "✓ تم تحديد الملف: {name}",
            localBgHosted: "✓ تم تحميل الخلفية المحلية",
            externalBgConnected: "✓ تم توصيل الخلفية الخارجية",
            announcementTitle: "إعلان",
            emptyDescPlaceholder: "لا يوجد شيء هنا..."
        },
        'bn': {
            settingsTitle: "VJudgeBetter সেটিংস",
            langLabel: "ভাষা (Language)",
            autoDetect: "স্বয়ংক্রিয় (সিস্টেম / সাইট)",
            themeColorLabel: "থিম কালার (Theme Color)",
            resetTheme: "ডিফল্ট নীল রঙে ফেরত যান",
            codeFontLabel: "কোড ফন্ট (Code Font)",
            noReplace: "পরিবর্তন করবেন না",
            customCodeFontPlaceholder: "অথবা কাস্টম কোড ফন্ট নাম লিখুন (অগ্রাধিকার পাবে)",
            contentFontLabel: "কনটেন্ট ফন্ট (Content Font)",
            customContentFontPlaceholder: "অথবা কাস্টম কনটেন্ট ফন্ট নাম লিখুন (অগ্রাধিকার পাবে)",
            bgOpacityLabel: "ব্যাকগ্রাউন্ড অস্বচ্ছতা",
            uploadBgLabel: "ব্যাকগ্রাউন্ড ছবি/ভিডিও আপলোড করুন",
            dropText: "ক্লিক করুন বা ড্রপ করুন (.jpg, .png, .gif, .mp4 সর্বোচ্চ 20MB)",
            bgTypeImage: "ছবি/GIF",
            bgTypeVideo: "ভিডিও",
            clearBg: "ব্যাকগ্রাউন্ড মুছুন",
            saveBtn: "সংরক্ষণ করুন এবং প্রয়োগ করুন",
            fileTooLargeAlert: "ফাইলটি খুব বড়! ফাইলের আকার {maxSize}MB এর বেশি হতে পারবে না",
            fileSelectedTemp: "✓ নির্বাচিত ফাইল: {name}",
            localBgHosted: "✓ স্থানীয় ব্যাকগ্রাউন্ড লোড হয়েছে",
            externalBgConnected: "✓ বাহ্যিক ব্যাকগ্রাউন্ড সংযুক্ত",
            announcementTitle: "ঘোষণা",
            emptyDescPlaceholder: "এখানে কিছু নেই..."
        },
        'hi': {
            settingsTitle: "VJudgeBetter सेटिंग्स",
            langLabel: "भाषा (Language)",
            autoDetect: "स्वचालित (सिस्टम / साइट)",
            themeColorLabel: "थीम रंग (Theme Color)",
            resetTheme: "डिफ़ॉल्ट नीला रीसेट करें",
            codeFontLabel: "कोड फ़ॉन्ट (Code Font)",
            noReplace: "बदलें नहीं",
            customCodeFontPlaceholder: "या कस्टम कोड फ़ॉन्ट नाम दर्ज करें (प्राथमिकता)",
            contentFontLabel: "सामग्री फ़ॉन्ट (Content Font)",
            customContentFontPlaceholder: "या कस्टम सामग्री फ़ॉन्ट नाम दर्ज करें (प्राथमिकता)",
            bgOpacityLabel: "पृष्ठभूमि की अपारदर्शिता",
            uploadBgLabel: "पृष्ठभूमि छवि/वीडियो अपलोड करें",
            dropText: "क्लिक करें या खींचें (.jpg, .png, .gif, .mp4 अधिकतम 20MB)",
            bgTypeImage: "इमेज/GIF",
            bgTypeVideo: "वीडियो",
            clearBg: "पृष्ठभूमि हटाएं",
            saveBtn: "सहेजें और लागू करें",
            fileTooLargeAlert: "फ़ाइल बहुत बड़ी है! आकार {maxSize}MB से अधिक नहीं हो सकता",
            fileSelectedTemp: "✓ चयनित फ़ाइल: {name}",
            localBgHosted: "✓ स्थानीय पृष्ठभूमि लोड की गई",
            externalBgConnected: "✓ बाहरी पृष्ठभूमि कनेक्ट की गई",
            announcementTitle: "घोषणा",
            emptyDescPlaceholder: "यहाँ कुछ नहीं है..."
        },
        'vi': {
            settingsTitle: "Cài đặt VJudgeBetter",
            langLabel: "Ngôn ngữ (Language)",
            autoDetect: "Tự động (Hệ thống / Trang web)",
            themeColorLabel: "Màu giao diện (Theme Color)",
            resetTheme: "Khôi phục màu xanh mặc định",
            codeFontLabel: "Phông chữ mã (Code Font)",
            noReplace: "Không thay thế",
            customCodeFontPlaceholder: "Hoặc nhập tên phông chữ mã tùy chỉnh (ưu tiên)",
            contentFontLabel: "Phông chữ nội dung (Content Font)",
            customContentFontPlaceholder: "Hoặc nhập tên phông chữ nội dung tùy chỉnh (ưu tiên)",
            bgOpacityLabel: "Độ đục nền",
            uploadBgLabel: "Tải lên hình ảnh/video nền",
            dropText: "Nhấp hoặc kéo thả (.jpg, .png, .gif, .mp4 tối đa 20MB)",
            bgTypeImage: "Hình ảnh/GIF",
            bgTypeVideo: "Video",
            clearBg: "Xóa nền",
            saveBtn: "Lưu & Áp dụng",
            fileTooLargeAlert: "Tệp quá lớn! Kích thước không thể vượt quá {maxSize}MB",
            fileSelectedTemp: "✓ Đã chọn tệp: {name}",
            localBgHosted: "✓ Đã tải nền địa phương",
            externalBgConnected: "✓ Đã kết nối nền bên ngoài",
            announcementTitle: "Thông báo",
            emptyDescPlaceholder: "Không có gì ở đây..."
        },
        'es': {
            settingsTitle: "Configuración de VJudgeBetter",
            langLabel: "Idioma (Language)",
            autoDetect: "Automático (Sistema / Sitio)",
            themeColorLabel: "Color del tema (Theme Color)",
            resetTheme: "Restablecer a azul predeterminado",
            codeFontLabel: "Fuente de código (Code Font)",
            noReplace: "No reemplazar",
            customCodeFontPlaceholder: "O ingrese nombre de fuente de código personalizada (prioridad)",
            contentFontLabel: "Fuente de contenido (Content Font)",
            customContentFontPlaceholder: "O ingrese nombre de fuente de contenido personalizada (prioridad)",
            bgOpacityLabel: "Opacidad de fondo",
            uploadBgLabel: "Subir imagen/video de fondo",
            dropText: "Haga clic o arrastre (.jpg, .png, .gif, .mp4 máx. 20 MB)",
            bgTypeImage: "Imagen/GIF",
            bgTypeVideo: "Video",
            clearBg: "Borrar fondo",
            saveBtn: "Guardar y aplicar",
            fileTooLargeAlert: "¡Archivo demasiado grande! El tamaño no puede exceder {maxSize}MB",
            fileSelectedTemp: "✓ Archivo seleccionado: {name}",
            localBgHosted: "✓ Fondo local cargado",
            externalBgConnected: "✓ Fondo externo conectado",
            announcementTitle: "Anuncio",
            emptyDescPlaceholder: "No hay nada aquí..."
        },
        'pt': {
            settingsTitle: "Configurações do VJudgeBetter",
            langLabel: "Idioma (Language)",
            autoDetect: "Automático (Sistema / Site)",
            themeColorLabel: "Cor do Tema (Theme Color)",
            resetTheme: "Restaurar azul padrão",
            codeFontLabel: "Fonte do Código (Code Font)",
            noReplace: "Não substituir",
            customCodeFontPlaceholder: "Ou digite o nome da fonte de código personalizada (prioridade)",
            contentFontLabel: "Fonte do Conteúdo (Content Font)",
            customContentFontPlaceholder: "Ou digite o nome da fonte de conteúdo personalizada (prioridade)",
            bgOpacityLabel: "Opacidade do Fundo",
            uploadBgLabel: "Enviar Imagem/Vídeo de Fundo",
            dropText: "Clique ou arraste (.jpg, .png, .gif, .mp4 máx 20MB)",
            bgTypeImage: "Imagem/GIF",
            bgTypeVideo: "Vídeo",
            clearBg: "Limpar Fundo",
            saveBtn: "Salvar e Aplicar",
            fileTooLargeAlert: "Arquivo muito grande! O tamanho não pode exceder {maxSize}MB",
            fileSelectedTemp: "✓ Arquivo selecionado: {name}",
            localBgHosted: "✓ Fundo local carregado",
            externalBgConnected: "✓ Fundo externo conectado",
            announcementTitle: "Anúncio",
            emptyDescPlaceholder: "Nada aqui..."
        },
        'ru': {
            settingsTitle: "Настройки VJudgeBetter",
            langLabel: "Язык (Language)",
            autoDetect: "Авто (Система / Сайт)",
            themeColorLabel: "Цвет темы (Theme Color)",
            resetTheme: "Сбросить на синий по умолчанию",
            codeFontLabel: "Шрифт кода (Code Font)",
            noReplace: "Не заменять",
            customCodeFontPlaceholder: "Или введите имя пользовательского шрифта кода (приоритет)",
            contentFontLabel: "Шрифт контента (Content Font)",
            customContentFontPlaceholder: "Или введите имя пользовательского шрифта контента (приоритет)",
            bgOpacityLabel: "Прозрачность фона",
            uploadBgLabel: "Загрузить фото/видео фона",
            dropText: "Нажмите или перетащите (.jpg, .png, .gif, .mp4 до 20 МБ)",
            bgTypeImage: "Изображение/GIF",
            bgTypeVideo: "Видео",
            clearBg: "Очистить фон",
            saveBtn: "Сохранить и применить",
            fileTooLargeAlert: "Файл слишком большой! Размер не может превышать {maxSize} МБ",
            fileSelectedTemp: "✓ Выбран файл: {name}",
            localBgHosted: "✓ Локальный фон загружен",
            externalBgConnected: "✓ Внешний фон подключен",
            announcementTitle: "Объявление",
            emptyDescPlaceholder: "Здесь ничего нет..."
        },
        'kk': {
            settingsTitle: "VJudgeBetter баптаулары",
            langLabel: "Тіл (Language)",
            autoDetect: "Авто (Жүйе / Сайт)",
            themeColorLabel: "Тармақ түсі (Theme Color)",
            resetTheme: "Әдепкі көк түске қайтару",
            codeFontLabel: "Код шрифті (Code Font)",
            noReplace: "Ауыстырмау",
            customCodeFontPlaceholder: "Немесе арнайы код шрифтінің атын енгізіңіз (басымдық)",
            contentFontLabel: "Мазмұн шрифті (Content Font)",
            customContentFontPlaceholder: "Немесе арнайы мазмұн шрифтінің атын енгізіңіз (басымдық)",
            bgOpacityLabel: "Фон мөлдірлігі",
            uploadBgLabel: "Фондық сурет/бейнені жүктеу",
            dropText: "Басыңыз немесе тастаңыз (.jpg, .png, .gif, .mp4 макс 20МБ)",
            bgTypeImage: "Сурет/GIF",
            bgTypeVideo: "Бейне",
            clearBg: "Фонды тазалау",
            saveBtn: "Сақтау және қолдану",
            fileTooLargeAlert: "Файл тым үлкен! Өлшемі {maxSize} МБ аспауы керек",
            fileSelectedTemp: "✓ Тандалған файл: {name}",
            localBgHosted: "✓ Жергілікті фон жүктелді",
            externalBgConnected: "✓ Сыртқы фон қосылды",
            announcementTitle: "Хабарландыру",
            emptyDescPlaceholder: "Мұнда ештеңе жоқ..."
        }
    };

    const LANG_NAMES = {
        'auto': "Follow System/Site / 跟随系统",
        'zh-CN': "中文 (简体)",
        'zh-TW': "繁體中文",
        'en': "English",
        'ja': "日本語",
        'ko': "한국어",
        'ar': "اَلْعَرَبِيَّةُ",
        'bn': "বাংলা",
        'hi': "हिन्दी",
        'vi': "Tiếng Việt",
        'es': "Español",
        'pt': "Português",
        'ru': "Русский язык",
        'kk': "Қазақ тілі"
    };

    function detectLanguage() {
        const sysLang = (navigator.language || navigator.userLanguage || document.documentElement.lang || 'zh-CN').toLowerCase();
        if (sysLang.startsWith('zh')) {
            if (sysLang.includes('tw') || sysLang.includes('hk') || sysLang.includes('hant')) return 'zh-TW';
            return 'zh-CN';
        }
        if (sysLang.startsWith('ja')) return 'ja';
        if (sysLang.startsWith('ko')) return 'ko';
        if (sysLang.startsWith('ar')) return 'ar';
        if (sysLang.startsWith('bn')) return 'bn';
        if (sysLang.startsWith('hi')) return 'hi';
        if (sysLang.startsWith('vi')) return 'vi';
        if (sysLang.startsWith('es')) return 'es';
        if (sysLang.startsWith('pt')) return 'pt';
        if (sysLang.startsWith('ru')) return 'ru';
        if (sysLang.startsWith('kk')) return 'kk';
        if (sysLang.startsWith('en')) return 'en';
        return 'zh-CN';
    }

    function getActiveLang() {
        if (!settings.lang || settings.lang === 'auto') {
            return detectLanguage();
        }
        return settings.lang;
    }

    function t(key, params = {}) {
        const lang = getActiveLang();
        const langDict = TRANSLATIONS[lang] || TRANSLATIONS['zh-CN'];
        let str = langDict[key] || TRANSLATIONS['zh-CN'][key] || key;
        for (const [pKey, pVal] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
        }
        return str;
    }

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
        #vjb-bg-container, #vjb-bg-image, #vjb-bg-video, .vjb-nav-slider, img, svg, i, [class*="icon"], [class*="fa"], [class*="glyphicon"], table, tr, td, th, .CodeMirror, .CodeMirror * { transition: none !important; }
        #contest-rank-table *, #listStatus * { transition: none !important; }

        #vjb-bg-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -9999; pointer-events: none; overflow: hidden; background: var(--vjb-fallback-bg); }
        #vjb-bg-image, #vjb-bg-video { width: 100%; height: 100%; object-fit: cover; opacity: var(--vjb-opacity, 0.85); transition: opacity 0.5s ease; }

        /* 全局基础组件圆滑矩形化 */
        #problem-submit, .btn-primary, .btn-check:checked + .btn, .btn-check:checked + .btn-primary, .btn-check:checked + .btn-outline-primary, .btn-group > .btn.active, .btn-group > .btn:active, .nav-pills .nav-link.active, .nav-pills > li.active > a {
            background-color: var(--vjb-theme, #4a90e2) !important; border-color: var(--vjb-theme, #4a90e2) !important; background-image: none !important; color: #ffffff !important; border-radius: 6px !important;
        }
        #problem-submit.btn-outline-primary, .btn-outline-primary { color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; border-color: var(--vjb-theme, #4a90e2) !important; background-color: transparent !important; border-radius: 6px !important; }
        #problem-submit.btn-outline-primary:hover, .btn-outline-primary:hover { background-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; }
        .pagination .active .page-link, .pagination .page-item.active .page-link, .page-link.active { background-color: var(--vjb-theme, #4a90e2) !important; border-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; }
        .pagination .page-item .page-link { border-radius: 6px !important; margin: 0 2px; }

        .badge { border-radius: 4px !important; }
        .form-select, .search_text, input[type="text"] { border-radius: 6px !important; border: 1px solid var(--vjb-card-border) !important; }
        .badge.text-bg-primary, .badge.bg-primary { background-color: var(--vjb-theme, #4a90e2) !important; color: #ffffff !important; border: none !important; }
        .badge.border-primary, .badge.text-primary, .statement-badge-lang { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; background-color: transparent !important; }
        .problem-description-item.active .statement-badge { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; }

        .text-primary { color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; }
        .bg-primary { background-color: var(--vjb-theme, #4a90e2) !important; }
        .border-primary { border-color: var(--vjb-theme, #4a90e2) !important; }

        /* 仅在比赛概览卡片处映射主色调，使其跟随主题色，避免污染全局倒计时/时间等组件 */
        .contest-meta-section, .contest-meta-section-title {
            --color-primary: var(--vjb-theme) !important;
            --bs-primary: var(--vjb-theme) !important;
        }

        /* ========== 比赛公告与信息卡片等高与美化 ========== */
        .contest-overview-layout {
            display: flex !important;
            flex-wrap: wrap !important;
        }
        .contest-overview-layout > aside,
        .contest-overview-layout > main {
            display: flex !important;
            flex-direction: column !important;
        }
        .contest-overview-layout .contest-overview-panel {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
        }
        .contest-overview-description-panel {
            position: relative !important;
        }
        .vjb-contest-overview-title {
            margin-top: 0 !important;
            margin-bottom: 20px !important;
            font-size: 1.5rem !important;
            font-weight: 500 !important;
            line-height: 1.2 !important;
        }
        .vjb-empty-description-placeholder {
            display: none;
        }
        .is-empty-description .vjb-empty-description-placeholder {
            display: flex !important;
            flex: 1 1 auto !important;
            align-items: center !important;
            justify-content: center !important;
            color: var(--vjb-text-muted) !important;
            font-size: 16px !important;
            min-height: 200px !important;
            font-weight: 500;
        }

        .navbar-nav .nav-link, .nav-tabs .nav-link, .contest-problem-menu .nav-link, .btn-link { position: relative; overflow: hidden; color: var(--vjb-text-muted) !important; transition: color 0.3s cubic-bezier(0.22, 1, 0.36, 1) !important; }
        .navbar-nav .nav-link:hover, .nav-tabs .nav-link:hover, .contest-problem-menu .nav-link:hover { color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; }
        .navbar-nav .active > .nav-link, .navbar-nav .nav-link.active, .nav-tabs .nav-link.active, .contest-problem-menu .nav-link.active { border-bottom: none !important; background: transparent !important; color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; font-weight: bold !important; }

        .nav-pills .nav-link:not(.active), #problem-nav .nav-link:not(.active) { color: var(--vjb-text-muted) !important; background: transparent !important; font-weight: 500 !important; }
        .nav-pills .nav-link:not(.active):hover, #problem-nav .nav-link:not(.active):hover { color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; background-color: var(--vjb-hover-bg) !important; }

        #prob-operation .btn-secondary, #buttonContainer .btn-secondary, #right-panel .btn-secondary { background-color: var(--vjb-btn-sec-bg) !important; border: 1px solid var(--vjb-card-border) !important; color: var(--vjb-text-muted) !important; box-shadow: none !important; border-radius: 6px !important; }
        #prob-operation .btn-secondary:hover, #buttonContainer .btn-secondary:hover, #right-panel .btn-secondary:hover { border-color: var(--vjb-theme, #4a90e2) !important; color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; background-color: var(--vjb-hover-bg) !important; box-shadow: 0 0 8px var(--vjb-theme, #4a90e2) !important; }
        .list-group-item.active { background-color: var(--vjb-hover-bg) !important; border: 1px solid var(--vjb-card-border) !important; border-left: 4px solid var(--vjb-theme, #4a90e2) !important; color: var(--vjb-text-main) !important; box-shadow: none !important; }
        .list-group-item.active .statement-author-row a, .list-group-item.active .statement-author-row span { color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; font-weight: bold !important; }

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
        #contest-rank-table td.prob.failed, #contest-rank-table tr:hover td.prob.failed { background-color: color-mix(in srgb, #e74c3c 15%, var(--vjb-cell-bg)) !important; }

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
            color: var(--vjb-theme-text, var(--vjb-theme)) !important;
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
        .comment-post .info .author { font-weight: 800 !important; color: var(--vjb-theme-text, var(--vjb-theme, #4a90e2)) !important; }
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

        /* Fix CodeMirror line number / text alignment */
        .CodeMirror,
        .CodeMirror-gutters,
        .CodeMirror-gutter-wrapper,
        .CodeMirror-linenumber,
        .CodeMirror-line,
        .CodeMirror pre,
        .CodeMirror-code,
        .CodeMirror-sizer {
            line-height: 1.5 !important;
        }
    `;
    GM_addStyle(styles);

    // ================= 💡 全息状态流自适应多维分色计算引擎 =================
    let isProcessingStatus = false;
    function processStatusTextElements() {
        if (isProcessingStatus) return;
        isProcessingStatus = true;

        try {
            const selectors = '#listStatus tbody td.status .view-solution, #listStatus tbody td.status > span, #listStatus tbody td.status > a, td.status .view-solution, td.status > span';
            const elements = document.querySelectorAll(selectors);

            elements.forEach(el => {
                if (el.dataset.vjbStatusDone) return;
                if (el.closest('thead') || el.closest('th')) return;
                if (el.closest('.language') || el.classList.contains('language')) return;
                if (el.closest('.runtime') || el.closest('.memory') || el.closest('.length')) return;

                let txt = el.textContent ? el.textContent.trim() : "";
                if (!txt) return;
                let lowerTxt = txt.toLowerCase();

                const isGreen = lowerTxt.includes("accepted");
                const isRed = lowerTxt.includes("wrong answer") || lowerTxt.includes("hacked");
                const isOrange = lowerTxt.includes("presentation error");
                const isPurple = lowerTxt.includes("runtime error");
                const isBrightYellow = lowerTxt.includes("compilation error") || lowerTxt.includes("compile error") || lowerTxt.includes("compilations error");
                const isDarkYellow = lowerTxt.includes("time limit exceeded") || lowerTxt.includes("memory limit exceeded") || lowerTxt.includes("output limit exceeded") || lowerTxt.includes("idleness limit exceeded");

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

                if (isGreen || isRed || isOrange || isPurple || isBrightYellow || isDarkYellow || isGrey) {
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
                    el.dataset.vjbStatusDone = 'true';
                }
            });
        } finally {
            isProcessingStatus = false;
        }
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
        const checkAndInject = () => {
            const iframes = document.querySelectorAll('#frame-description-container iframe, iframe');
            iframes.forEach(iframe => {
                try {
                    injectIframeStyles(iframe);
                    if (!iframe.dataset.vjbLoaded) {
                        iframe.dataset.vjbLoaded = 'true';
                        iframe.addEventListener('load', () => injectIframeStyles(iframe), { once: true });
                    }
                } catch (e) { }
            });
        };

        checkAndInject();

        const observer = new MutationObserver(() => checkAndInject());
        observer.observe(document.body, { childList: true, subtree: true });
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

    /* 计算相对亮度，用于判断主题色是否太亮 */
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        const n = parseInt(hex, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function relativeLuminance([r, g, b]) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c /= 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    function darkenHex(hex, factor) {
        const [r, g, b] = hexToRgb(hex);
        const clamp = v => Math.max(0, Math.min(255, Math.round(v * factor)));
        return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    }
    function getThemeTextColor(hex) {
        const rgb = hexToRgb(hex);
        const lum = relativeLuminance(rgb);
        /* 亮度阈值 0.4：高于此值的颜色在浅色背景上对比度不足 */
        if (lum > 0.4) {
            /* 根据亮度程度逐步加深，最多压暗到 35% */
            const factor = Math.max(0.35, 1 - (lum - 0.4) * 1.2);
            return darkenHex(hex, factor);
        }
        return hex;
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--vjb-opacity', settings.opacity);
        const themeColor = settings.themeColor || '#4a90e2';
        root.style.setProperty('--vjb-theme', themeColor);
        /* 为文字场景生成对比度安全的主题色 */
        const themeTextColor = getThemeTextColor(themeColor);
        root.style.setProperty('--vjb-theme-text', themeTextColor);

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
                #submit-solution, textarea[name="source"], .modal-body textarea,
                .CodeMirror, .CodeMirror-linenumber, .CodeMirror-gutters,
                .CodeMirror-gutter-wrapper, .CodeMirror-gutter-elt,
                .CodeMirror-line, .CodeMirror-code, .CodeMirror pre {
                    font-family: ${useCode}, monospace !important;
                }
                pre *, code *, .ace_editor *, .source-code * { font-family: inherit !important; }
            `;
        }
        fontCss += `
            var {
                font-family: "Times New Roman", "Cambria", "MathJax_Math", serif !important;
                font-style: italic !important;
            }
            .katex var, [class*="katex"] var, [class*="MathJax"] var {
                font-family: inherit !important;
                font-style: inherit !important;
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
            <div class="vjb-header"><span class="vjb-title">${t('settingsTitle')}</span><span class="vjb-close">&times;</span></div>

            <div class="vjb-group">
                <label class="vjb-label">${t('langLabel')}</label>
                <select id="vjb-set-lang" class="vjb-select">
                    ${Object.entries(LANG_NAMES).map(([code, name]) => `<option value="${code}" ${settings.lang === code ? 'selected' : ''}>${name}</option>`).join('')}
                </select>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">${t('themeColorLabel')}</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="color" id="vjb-set-theme" value="${settings.themeColor}" style="width: 50px; height: 35px; padding: 0; border: none; background: transparent; cursor: pointer;">
                    <button id="vjb-reset-theme" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #ccc; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 13px; transition: all 0.2s;">${t('resetTheme')}</button>
                </div>
            </div>

            <div class="vjb-group">
                <label class="vjb-label">${t('codeFontLabel')}</label>
                <select id="vjb-set-font-code" class="vjb-select" style="font-family: inherit;">
                    <option value="none" style="font-family: inherit;" ${settings.fontCode === 'none' ? 'selected' : ''}>${t('noReplace')}</option>
                    ${makeOption(FONTS.code, settings.fontCode)}
                </select>
                <input type="text" id="vjb-set-custom-code" class="vjb-input" style="margin-top:6px;" placeholder="${t('customCodeFontPlaceholder')}" value="${settings.customFontCode || ''}">
            </div>

            <div class="vjb-group">
                <label class="vjb-label">${t('contentFontLabel')}</label>
                <select id="vjb-set-font-content" class="vjb-select" style="font-family: inherit;">
                    <option value="none" style="font-family: inherit;" ${settings.fontContent === 'none' ? 'selected' : ''}>${t('noReplace')}</option>
                    ${makeOption(FONTS.content, settings.fontContent)}
                </select>
                <input type="text" id="vjb-set-custom-content" class="vjb-input" style="margin-top:6px;" placeholder="${t('customContentFontPlaceholder')}" value="${settings.customFontContent || ''}">
            </div>

            <div class="vjb-group"><label class="vjb-label">${t('bgOpacityLabel')}</label><div class="vjb-range-wrap"><input type="range" id="vjb-set-opacity" class="vjb-range" min="0" max="1" step="0.05" value="${settings.opacity}"><span id="vjb-op-val">${Math.round(settings.opacity * 100)}%</span></div></div>
            <div class="vjb-group"><label class="vjb-label">${t('uploadBgLabel')}</label>
                <div id="vjb-drop-zone" style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease;">
                    <div id="vjb-drop-text">${t('dropText')}</div>
                    <input type="file" id="vjb-file-input" accept="image/*,video/mp4" style="display: none;">
                    <div id="vjb-file-info" style="color: var(--vjb-theme, #4a90e2); display: none; font-weight: bold;"></div>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <label><input type="radio" name="bgType" value="image" ${settings.bgType === 'image' ? 'checked' : ''}> ${t('bgTypeImage')}</label>
                    <label><input type="radio" name="bgType" value="video" ${settings.bgType === 'video' ? 'checked' : ''}> ${t('bgTypeVideo')}</label>
                    <button id="vjb-clear-bg" style="background:none; border:1px solid #666; color:#aaa; padding:2px 8px; border-radius:4px; cursor:pointer;">${t('clearBg')}</button>
                </div>
            </div>
            <div style="text-align:right; margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
                <button id="vjb-export-btn" style="background:none; border:1px solid var(--vjb-theme, #4a90e2); color:var(--vjb-theme-text, var(--vjb-theme, #4a90e2)); padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">${t('exportBtn')}</button>
                <button id="vjb-import-btn" style="background:none; border:1px solid var(--vjb-theme, #4a90e2); color:var(--vjb-theme-text, var(--vjb-theme, #4a90e2)); padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">${t('importBtn')}</button>
                <input type="file" id="vjb-import-input" accept=".json" style="display:none;">
                <button id="vjb-save-btn" style="background:var(--vjb-theme, #4a90e2); color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">${t('saveBtn')}</button>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('.vjb-close').onclick = toggleSettingsPanel;

        document.getElementById('vjb-set-lang').onchange = (e) => {
            settings.lang = e.target.value;
            panel.remove();
            createSettingsPanel();
            toggleSettingsPanel();
        };

        document.getElementById('vjb-reset-theme').onclick = () => {
            document.getElementById('vjb-set-theme').value = '#4a90e2';
        };

        const dropZone = document.getElementById('vjb-drop-zone');
        const fileInput = document.getElementById('vjb-file-input');

        function handleFileSelect(file) {
            if (!file) return;
            const maxSize = file.type.startsWith('video/') ? 20 : 5;
            if (file.size > maxSize * 1024 * 1024) return alert(t('fileTooLargeAlert', { maxSize }));

            selectedFileData = file;
            document.getElementById('vjb-drop-text').style.display = 'none';
            const fi = document.getElementById('vjb-file-info');
            fi.style.display = 'block'; fi.innerHTML = t('fileSelectedTemp', { name: file.name });
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
            settings.lang = document.getElementById('vjb-set-lang').value;
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

        document.getElementById('vjb-export-btn').onclick = async () => {
            const dataToExport = { settings: settings, bgData: null };
            const downloadJSON = (data) => {
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'VJudgeBetter_Settings.json';
                a.click();
                URL.revokeObjectURL(url);
            };
            try {
                const bg = await localDB.get('vjb_bgData');
                if (bg) {
                    if (bg instanceof Blob) {
                        const reader = new FileReader();
                        reader.onloadend = () => { dataToExport.bgData = reader.result; downloadJSON(dataToExport); };
                        reader.readAsDataURL(bg);
                        return;
                    } else { dataToExport.bgData = bg; }
                }
                downloadJSON(dataToExport);
            } catch (e) { console.error("Export error", e); downloadJSON(dataToExport); }
        };

        document.getElementById('vjb-import-btn').onclick = () => document.getElementById('vjb-import-input').click();
        document.getElementById('vjb-import-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.settings) {
                        Object.assign(settings, data.settings);
                        GM_setValue('vjb_settings', settings);
                    }
                    if (data.bgData) {
                        if (typeof data.bgData === 'string' && data.bgData.startsWith('data:')) {
                            const fetchRes = await fetch(data.bgData);
                            const blob = await fetchRes.blob();
                            await localDB.set('vjb_bgData', blob);
                        } else { await localDB.set('vjb_bgData', data.bgData); }
                    } else {
                        const db = await localDB.init();
                        const tx = db.transaction('bgStore', 'readwrite');
                        tx.objectStore('bgStore').delete('vjb_bgData');
                    }
                    alert("Import successful! Reloading page...");
                    location.reload();
                } catch (err) { alert("Import failed: " + err); }
            };
            reader.readAsText(file);
        };
    }

    function toggleSettingsPanel() {
        const panel = document.getElementById('vjb-settings-panel');
        if (!panel) createSettingsPanel();
        panel.classList.toggle('active');

        if (panel.classList.contains('active')) {
            selectedFileData = currentBgData;
            document.getElementById('vjb-set-lang').value = settings.lang || 'auto';
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
                infoEl.innerHTML = currentBgData instanceof Blob ? t('localBgHosted') : t('externalBgConnected');
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

    // ================= 比赛概览面板优化 =================
    function initContestOverview() {
        const descPanel = document.querySelector('.contest-overview-description-panel');
        if (!descPanel) return;

        // 1. 添加公告标题
        let titleEl = descPanel.querySelector('.vjb-contest-overview-title');
        if (!titleEl) {
            titleEl = document.createElement('h4');
            titleEl.className = 'vjb-contest-overview-title';
            descPanel.prepend(titleEl);
        }
        titleEl.textContent = t('announcementTitle');

        // 2. 添加空白占位符
        let placeholderEl = descPanel.querySelector('.vjb-empty-description-placeholder');
        if (!placeholderEl) {
            placeholderEl = document.createElement('div');
            placeholderEl.className = 'vjb-empty-description-placeholder';
            const adEl = document.getElementById('contest-description-ad');
            if (adEl) {
                descPanel.insertBefore(placeholderEl, adEl);
            } else {
                descPanel.appendChild(placeholderEl);
            }
        }
        placeholderEl.textContent = t('emptyDescPlaceholder');
    }

    // ================= 初始化入口 =================
    function init() {
        loadSettings();
        createFloatButton();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initNavSlider();
                initIframeObserver();
                initContestOverview();
            });
        } else {
            initNavSlider();
            initIframeObserver();
            initContestOverview();
        }
        document.addEventListener('load', (e) => {
            if (e.target && e.target.tagName === 'IFRAME') injectIframeStyles(e.target);
        }, true);
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); toggleSettingsPanel(); }
        });

        let statusDebounceTimer = null;
        const statusObserver = new MutationObserver(() => {
            if (statusDebounceTimer) clearTimeout(statusDebounceTimer);
            statusDebounceTimer = setTimeout(() => {
                processStatusTextElements();
                initContestOverview();
            }, 100);
        });
        statusObserver.observe(document.body, { childList: true, subtree: true });
        processStatusTextElements();
        initContestOverview();
    }

    init();
})();
