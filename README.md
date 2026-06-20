# VJudgeBetter 🚀

一个专为 Virtual Judge (VJudge) 定制的现代化、美化与性能增强油猴脚本。

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

复制本仓库中 **默认分支** 的 `app.js` 完整源码。其它步骤与安装正式版的步骤相同。

## 📄 开源许可证

本项目基于 **MIT License** 协议开源。

## 欢迎提交 Issues 和 PRs!

# VJudgeBetter 🚀

A modern, beautified, and performance-enhanced Tampermonkey script customized for Virtual Judge (VJudge).

## Core Features

* **Global Dynamic Theme Color**: Replace all remaining native blue elements—including primary buttons, submit buttons, active radio boxes, breadcrumbs, and status badges—with a personalized theme color of your choice.
* **Custom Fonts**: Customize your preferred code font and reading font directly via the control panel.
* **Contest Top Bar Reshaping**: Beautified contest progress bar.
* **Background Settings**: Customize the VJudge background. Supports `.jpg`, `.png`, `.webp`, **`.gif`**, **`.mp3`**, and **`.mp4`**. Can be reset to default with one click.
* **Auto-Update (In Progress...)**: Automatically detect and update the VJudgeBetter version.

## Usage Guide

### Open the Settings Panel

Click the Tampermonkey browser extension icon → find and click `⚙️ VJudgeBetter Settings` in the bottom right corner to open it.

### Settings Guide

| Setting Item | Description |
| --- | --- |
| **Personalized Global Theme Color** | Click the native color picker to select any custom color you like. |
| **Code Font** | Customize your favorite monospaced programming font. Supports `JetBrains Mono`, `Fira Code`, `Consolas`, etc. (requires the font to be installed locally). You can also enter specific custom fonts installed on your computer in the input box below. |
| **Reading Font** | Sets the font for all body text, tables, and problem descriptions (excluding mathematical formulas). You can manually specify a special font installed on your system in the input box below. |
| **Background Media Hosting** | Click or drag files into the dashed box (supports images/GIFs up to 5MB, or MP4 videos up to 20MB). Video backgrounds will automatically enable mute, hardware acceleration, and infinite looping. |
| **Background Opacity** | Freely drag the percentage slider (0% - 100%). |

## Installation

### Install Stable Version

1. Ensure you have installed the [Tampermonkey](https://www.tampermonkey.net/) extension in your browser.
2. Go to the [GitHub Release](https://github.com/wyh120715/VJudge-Better/releases). Alternatively, you can install it directly from [GreasyFork](https://www.google.com/search?q=https://greasyfork.org/zh-CN/scripts/583544-vjudgebetter); if you choose this method, you can skip step 3.
3. Open the Tampermonkey dashboard, click "Create a new script," clear the existing template, paste the copied code, and save (`Ctrl + S`).
4. Refresh the VJudge webpage to apply the changes.

### Install Beta Version

Copy the full source code of `app.js` from the **default branch** of this repository. The remaining steps are the same as installing the stable version.

---

## 📄 Open Source License

This project is open-sourced under the **MIT License**.

## Contributions Welcome!

Feel free to submit **Issues** and **PRs**!
