# 视频下载器 (Video Downloader)

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的智能视频下载器，支持 1000+ 网站，提供友好的图形界面。

![界面预览](docs/preview.png)

## ✨ 功能特性

### 核心功能
- **🔗 URL 解析** - 粘贴链接自动解析视频信息（标题、封面、时长、分辨率）
- **📋 批量下载** - 支持播放列表、多集视频自动识别和批量选择下载
- **📥 下载队列** - 顺序下载、支持暂停/继续/取消操作
- **📝 智能命名** - 自定义命名模板，支持 `{title}`、`{index}`、`{date}` 等变量
- **🎬 格式选择** - 视频/音频格式、质量自由选择

### 高级功能
- **🔧 自定义解析规则** - 当 yt-dlp 无法识别时，可添加 CSS 选择器规则
- **🍪 Cookie 支持** - 导入浏览器 Cookie 访问需要登录的内容
- **🌐 代理设置** - 支持 HTTP/SOCKS 代理
- **📜 下载历史** - 记录并管理历史下载

### 支持的网站
- YouTube、Bilibili、抖音、西瓜视频
- 优酷、爱奇艺、腾讯视频
- Twitter、TikTok、Instagram
- 以及 1000+ 其他网站...

## 🚀 快速开始

### 前置要求

1. **Node.js** (v18+)
2. **yt-dlp** - 视频下载核心

#### 安装 yt-dlp

**Windows (推荐使用 winget):**
```bash
winget install yt-dlp
```

**或手动下载:**
1. 从 [yt-dlp Releases](https://github.com/yt-dlp/yt-dlp/releases) 下载 `yt-dlp.exe`
2. 放入系统 PATH 目录或项目 `resources` 目录

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run electron:dev
```

### 构建应用

```bash
npm run electron:build
```

构建完成后，安装包在 `dist-electron` 目录。

## 📖 使用指南

### 基本使用

1. 复制视频链接
2. 粘贴到输入框（支持 Ctrl+V 自动解析）
3. 选择视频格式和质量
4. 点击"下载"按钮

### 批量下载

1. 粘贴播放列表或合集链接
2. 自动识别所有视频
3. 勾选需要下载的视频
4. 点击"下载选中"

### 命名模板

支持以下变量：
- `{title}` - 视频标题
- `{id}` - 视频 ID
- `{index}` - 序号（两位数，如 01）
- `{uploader}` - 上传者
- `{date}` - 下载日期

示例：`{index} - {title}` → `01 - 视频标题.mp4`

### 自定义解析规则

当遇到 yt-dlp 无法解析的网站时：

1. 进入"规则"页面
2. 点击"添加规则"
3. 填写域名匹配和 CSS 选择器
4. 保存并启用规则

#### 规则示例

```
域名: example.com
URL 匹配: /video/\d+
标题选择器: h1.video-title
视频源选择器: video source[src]
封面选择器: meta[property="og:image"]
```

### Cookie 导入

访问需要登录的内容：

1. 安装浏览器扩展 "Get cookies.txt LOCALLY"
2. 登录目标网站
3. 导出 cookies.txt
4. 在设置中选择 Cookie 文件

## 🛠️ 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Pinia** - 状态管理
- **yt-dlp** - 视频下载核心

## 📁 项目结构

```
video-downloader/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── preload.js       # 预加载脚本
├── src/
│   ├── components/      # Vue 组件
│   ├── views/           # 页面视图
│   ├── stores/          # Pinia 状态管理
│   ├── router/          # 路由配置
│   ├── styles/          # 全局样式
│   └── main.js          # Vue 入口
├── public/              # 静态资源
└── package.json
```

## ❓ 常见问题

### yt-dlp 未找到

确保 yt-dlp 已安装并在系统 PATH 中：
```bash
yt-dlp --version
```

### 下载速度慢

1. 检查网络连接
2. 尝试设置代理
3. 部分网站可能有限速

### 某些视频无法下载

1. 检查是否需要登录（导入 Cookie）
2. 尝试更新 yt-dlp: `yt-dlp -U`
3. 添加自定义解析规则

## 📜 许可证

MIT License

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
