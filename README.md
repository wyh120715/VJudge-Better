# VJudgeBetter 🚀

一个为 Virtual Judge (VJudge) 定制的现代化、美化与性能增强油猴脚本。

## 核心功能

- **全站动态换色**: 将全站主要按钮、提交按钮、激活单选框、面包屑、状态小徽章等残存的原生蓝色无死角替换为你自定义的个性主题色。
- **自定义字体**：你可以在控制面板上自定义您的代码字体和阅读字体。
- **比赛顶栏重塑**：比赛时间进度条美化。
- **背景设置**：你可以设置 VJudge 的背景，支持 .jpg,png,webp,**gif,mp3,mp4**。也可一键重置不使用背景。
- **自动更新（Working……）**：自动检测VJudgeBetter的版本并更新。

## 使用说明

### 打开设置面板

点击浏览器 Tampermonkey 插件图标 → 找到并点击右下角 `⚙️ VJudgeBetter 设置`，打开即可。

### 设置项指引

| 设置项 | 说明 |
| :--: | :--- |
| **个性全局主题色** | 点击原生的颜色选择器，任意挑选你喜欢的专属色彩。 |
| **代码字体** | 自定义你喜爱的等宽编程字体，支持 `JetBrains Mono`, `Fira Code`, `Consolas` 等（但你先要在本地安装这些字体），可以在下方的自定义输入框中输入你电脑本地安装的小众字体。 |
| **阅读字体** | 全站正文内容、表格及题面（排除数学公式）将统一切换为此阅读字体，支持在下方输入框中手动指定系统内装的特殊字体。 |
| **背景多媒体托管** | 点击或拖拽文件到虚线框内（支持最大 5MB 图片/GIF，或最大 20MB 的 MP4 视频），视频背景将自动开启静音、硬件加速与无限循环播放。 |
| **背景透明度** | 自由拖动百分比滑块（0% - 100%）。 |

## 安装方法

### 安装正式版

1. 确保你的浏览器已经安装了 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 扩展。
2. 前往[Github Release](https://github.com/wyh120715/VJudge-Better/releases)。你也可以在[GreasyFork](https://greasyfork.org/zh-CN/scripts/583544-vjudgebetter)上直接安装，如果是这样你就不用做第三步。
3. 打开油猴面板，点击 “添加新脚本”，清空原有模板并将复制的代码粘贴进去，保存（`Ctrl + S`）即可。
4. 重新刷新 VJudge 网页即可。

### 安装 Beta 版

复制本仓库中 **默认分支** 的 `app.js` 完整源码，其它步骤与安装正式版的步骤相同。

## 开源许可证

本项目基于 **MIT License** 协议开源。

## 欢迎提交 Issue 和 PR！

欢迎随时提交 **Issue** 和 **PR**！

---

# VJudgeBetter 🚀

A modern Tampermonkey script designed to enhance the aesthetics and performance of Virtual Judge (VJudge).

## Key Features

- **Dynamic Global Color Customization**: Replaces the site's default blue accents—including primary buttons, submit buttons, active radio buttons, breadcrumbs, and status badges—with a custom theme color of your choice.
- **Custom Fonts**: Customize your preferred fonts for code blocks and general reading text via the control panel.
- **Contest Header Redesign**: Enhanced styling for the contest time progress bar.
- **Background Settings**: Set a custom background for VJudge; supports `.jpg`, `.png`, `.webp`, `.gif`, `.mp3`, and `.mp4` formats. Includes a one-click reset option to disable the background.
- **Auto-Update (In Progress...)**: Automatically checks for and installs VJudgeBetter updates.

## Usage Instructions

### Opening the Settings Panel

Click the Tampermonkey browser extension icon → locate and click `⚙️ VJudgeBetter Settings` in the bottom-right corner to open the panel.

### Settings Guide

| Setting | Description |
| :--: | :--- |
| **Custom Global Theme Color** | Click the color picker to select your own unique theme color. |
| **Code Font** | Customize your monospaced coding font (e.g., `JetBrains Mono`, `Fira Code`, `Consolas`). Note: You must have these fonts installed locally on your computer. You can also enter the name of any niche font installed on your system in the input box below. |
| **Reading Font** | Switches the font for body text, tables, and problem descriptions (excluding mathematical formulas) across the site. You can manually specify a custom system font in the input box below. |
| **Background Media Upload** | Click or drag files into the dashed-line box (supports images/GIFs up to 5MB or MP4 videos up to 20MB). Video backgrounds automatically enable mute, hardware acceleration, and infinite looping. |
| **Background Opacity** | Adjust the opacity using the percentage slider (0% - 100%). | |

## Installation

### Installing the Release Version

1. Ensure you have the [Tampermonkey](https://www.tampermonkey.net/) extension installed in your browser.
2. Go to the [GitHub Releases](https://github.com/wyh120715/VJudge-Better/releases) page. Alternatively, you can install it directly from [GreasyFork](https://greasyfork.org/zh-CN/scripts/583544-vjudgebetter); if you choose this method, you can skip step 3.
3. Open the Tampermonkey dashboard, click "Add new script," clear the default template, paste the copied code, and save it (`Ctrl + S`).
4. Refresh the VJudge webpage.

### Installing the Beta Version

Copy the full source code of `app.js` from the repository's **default branch**. The remaining steps are the same as those for installing the release version.

## Open Source License

This project is open-sourced under the **MIT License**.

## Issues and PRs are welcome!
Feel free to submit **Issues** and **PRs**!
