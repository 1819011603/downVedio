const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn, exec } = require('child_process')
const fs = require('fs')
const os = require('os')

let mainWindow
let ytdlpPath = 'yt-dlp' // 默认使用系统PATH中的yt-dlp
let n_m3u8dlPath = '' // N_m3u8DL-RE 路径

// 智能解析窗口
let smartParseWindow = null

// 配置文件路径
const userDataPath = app.getPath('userData')
const configPath = path.join(userDataPath, 'config.json')
const historyPath = path.join(userDataPath, 'history.json')
const customRulesPath = path.join(userDataPath, 'custom-rules.json')

// 默认配置
const defaultConfig = {
  downloadPath: path.join(os.homedir(), 'Downloads', 'VideoDownloader'),
  namingTemplate: '{title}',
  defaultFormat: 'best',
  enablePlaylist: true,         // 支持播放列表，默认开启
  proxy: '',
  cookieFile: '',
  cookiesFromBrowser: 'none',   // 从浏览器获取 Cookie: none, chrome, firefox, edge, safari
  concurrentDownloads: 1,
  autoRetry: true,
  maxRetries: 3,
  downloadRetries: 3,           // 失败重试次数
  // 新增下载参数
  downloadThreads: 4,           // 下载线程数
  rateLimit: '',                // 限速，例如 '1M'
  downloadSubtitles: false,     // 下载字幕
  subtitleLang: 'zh,en',        // 字幕语言
  embedSubtitles: false,        // 嵌入字幕
  embedThumbnail: false,        // 嵌入封面
  extractAudio: false,          // 提取音频
  audioFormat: 'mp3',           // 音频格式
  audioQuality: '0',            // 音频质量 0-9
  writeDescription: false,      // 保存描述
  writeThumbnail: false,        // 保存封面
  customArgs: '',               // 自定义参数
  // 智能解析域名白名单 - 这些域名直接使用智能解析，不用 yt-dlp
  smartParseDomains: [],        // 例如: ['example.com', 'video.site.com']
  // 智能解析视频格式过滤
  smartParseFormats: ['m3u8']   // 默认只收集 m3u8，可选: m3u8, mpd, mp4, flv, ts, webm
}

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      const mergedConfig = { ...defaultConfig, ...fileConfig }
      console.log('加载配置 - customArgs:', mergedConfig.customArgs || '(空)')
      console.log('加载配置 - cookiesFromBrowser:', mergedConfig.cookiesFromBrowser || '(空)')
      return mergedConfig
    }
  } catch (e) {
    console.error('Load config error:', e)
  }
  return defaultConfig
}

// 保存配置
function saveConfig(config) {
  try {
    console.log('保存配置 - customArgs:', config.customArgs || '(空)')
    console.log('保存配置 - cookiesFromBrowser:', config.cookiesFromBrowser || '(空)')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return true
  } catch (e) {
    console.error('Save config error:', e)
    return false
  }
}

// 加载历史记录
function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    }
  } catch (e) {
    console.error('Load history error:', e)
  }
  return []
}

// 保存历史记录
function saveHistory(history) {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
    return true
  } catch (e) {
    console.error('Save history error:', e)
    return false
  }
}

// 加载自定义解析规则
function loadCustomRules() {
  try {
    if (fs.existsSync(customRulesPath)) {
      return JSON.parse(fs.readFileSync(customRulesPath, 'utf8'))
    }
  } catch (e) {
    console.error('Load custom rules error:', e)
  }
  return []
}

// 保存自定义解析规则
function saveCustomRules(rules) {
  try {
    fs.writeFileSync(customRulesPath, JSON.stringify(rules, null, 2))
    return true
  } catch (e) {
    console.error('Save custom rules error:', e)
    return false
  }
}

async function createWindow() {
  // 初始化 N_m3u8DL-RE 路径
  const resourcesPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../resources')
  
  if (process.platform === 'win32') {
    n_m3u8dlPath = path.join(resourcesPath, 'N_m3u8DL-RE.exe')
  } else if (process.platform === 'darwin') {
    n_m3u8dlPath = path.join(resourcesPath, 'N_m3u8DL-RE')
  } else {
    n_m3u8dlPath = path.join(resourcesPath, 'N_m3u8DL-RE')
  }
  
  console.log('N_m3u8DL-RE 路径:', n_m3u8dlPath)
  console.log('N_m3u8DL-RE 存在:', fs.existsSync(n_m3u8dlPath))

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0f0f0f'
  })

  // 检测是否为开发模式：检查 dist 目录是否存在
  const distPath = path.join(__dirname, '../dist/index.html')
  const isDev = !fs.existsSync(distPath)
  
  if (isDev) {
    // 开发模式：尝试连接到 Vite 开发服务器
    const devPorts = [5173, 5174, 5175, 5176]
    let loaded = false
    
    for (const port of devPorts) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`)
        console.log(`Loaded dev server at port ${port}`)
        loaded = true
        mainWindow.webContents.openDevTools()
        break
      } catch (e) {
        console.log(`Port ${port} not available, trying next...`)
      }
    }
    
    if (!loaded) {
      console.error('Could not connect to Vite dev server')
    }
  } else {
    // 生产模式
    mainWindow.loadFile(distPath)
  }

  // 确保下载目录存在
  const config = loadConfig()
  if (!fs.existsSync(config.downloadPath)) {
    fs.mkdirSync(config.downloadPath, { recursive: true })
  }

  // 拦截图片请求，添加必要的请求头（解决跨域和防盗链问题）
  const { session } = require('electron')
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.hdslb.com/*', '*://*.bilivideo.com/*', '*://*.youtube.com/*', '*://*.ytimg.com/*', '*://*.ixigua.com/*', '*://*.douyinpic.com/*', '*://*.pstatp.com/*'] },
    (details, callback) => {
      // 添加常用请求头
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      
      // 根据域名设置 Referer
      try {
        const url = new URL(details.url)
        if (url.hostname.includes('hdslb.com') || url.hostname.includes('bilivideo.com')) {
          details.requestHeaders['Referer'] = 'https://www.bilibili.com/'
        } else if (url.hostname.includes('ytimg.com')) {
          details.requestHeaders['Referer'] = 'https://www.youtube.com/'
        } else if (url.hostname.includes('ixigua.com') || url.hostname.includes('pstatp.com')) {
          details.requestHeaders['Referer'] = 'https://www.ixigua.com/'
        } else if (url.hostname.includes('douyinpic.com')) {
          details.requestHeaders['Referer'] = 'https://www.douyin.com/'
        }
      } catch (e) {
        // 忽略 URL 解析错误
      }
      
      callback({ requestHeaders: details.requestHeaders })
    }
  )
}

// 检查 yt-dlp 是否安装
async function checkYtdlp() {
  return new Promise((resolve) => {
    exec(`${ytdlpPath} --version`, (error, stdout) => {
      if (error) {
        resolve({ installed: false, version: null })
      } else {
        resolve({ installed: true, version: stdout.trim() })
      }
    })
  })
}

// 检查 URL 是否匹配智能解析域名白名单
function shouldUseSmartParse(url) {
  const config = loadConfig()
  const domains = config.smartParseDomains || []
  
  if (!domains || domains.length === 0) {
    return false
  }
  
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    for (const domain of domains) {
      const domainLower = domain.toLowerCase().trim()
      if (!domainLower) continue
      
      // 支持精确匹配和子域名匹配
      if (hostname === domainLower || hostname.endsWith('.' + domainLower)) {
        console.log(`URL ${url} 匹配智能解析域名: ${domain}`)
        return true
      }
    }
  } catch (e) {
    console.error('URL 解析错误:', e)
  }
  
  return false
}

// 根据 URL 查找匹配的自定义规则
function findMatchingRule(url) {
  const rules = loadCustomRules()
  console.log('加载的自定义规则数量:', rules.length)
  if (rules.length > 0) {
    console.log('规则列表:', rules.map(r => ({ name: r.name, enabled: r.enabled, urlPattern: r.urlPattern, ytdlpArgs: r.ytdlpArgs })))
  }
  for (const rule of rules) {
    if (!rule.enabled) {
      console.log(`规则 "${rule.name}" 已禁用，跳过`)
      continue
    }
    try {
      // 尝试匹配 URL 模式
      if (rule.urlPattern) {
        const regex = new RegExp(rule.urlPattern, 'i')
        const matched = regex.test(url)
        console.log(`规则 "${rule.name}" URL模式匹配: ${matched}`)
        if (matched) {
          console.log(`匹配成功！规则: ${rule.name}, ytdlpArgs: ${rule.ytdlpArgs}`)
          return rule
        }
      }
      // 尝试匹配域名
      if (rule.domain && rule.domain !== '*') {
        if (url.toLowerCase().includes(rule.domain.toLowerCase())) {
          return rule
        }
      }
    } catch (e) {
      console.error('规则匹配错误:', e)
    }
  }
  return null
}

// 智能解析 - 使用 Electron 内置浏览器拦截网络请求
async function smartParse(url, options = {}) {
  const config = loadConfig()
  const timeout = options.timeout || 30000
  const userWaitTime = options.userWaitTime || 0  // 用户操作等待时间（毫秒）
  const showBrowser = options.show || false  // 是否显示浏览器窗口
  const capturedUrls = []
  const capturedHeaders = {}  // 保存每个URL的请求头
  let pageTitle = ''
  let pageThumbnail = ''
  
  // 从配置获取要收集的视频格式
  const allowedFormats = config.smartParseFormats || ['m3u8']
  console.log('允许的视频格式:', allowedFormats)
  
  // 根据配置动态生成视频匹配模式
  const videoPatterns = []
  
  // 基于配置的格式添加匹配模式
  if (allowedFormats.includes('m3u8')) {
    videoPatterns.push(/\.m3u8(\?|$|#)/i)
    videoPatterns.push(/video.*\.m3u8/i)
    videoPatterns.push(/playlist.*\.m3u8/i)
    videoPatterns.push(/\/hls\//i)
  }
  if (allowedFormats.includes('mpd')) {
    videoPatterns.push(/\.mpd(\?|$|#)/i)
    videoPatterns.push(/manifest.*\.mpd/i)
    videoPatterns.push(/\/dash\//i)
  }
  if (allowedFormats.includes('mp4')) {
    videoPatterns.push(/\.mp4(\?|$|#)/i)
    videoPatterns.push(/\.f\d+\.mp4/i)           // 腾讯视频格式如 .f10218.mp4
    videoPatterns.push(/stream.*\.mp4/i)
    videoPatterns.push(/videoplayback/i)
    videoPatterns.push(/googlevideo\.com/i)
    videoPatterns.push(/tc\.qq\.com/i)           // 腾讯视频 CDN
    videoPatterns.push(/[?&]type=mp4/i)          // URL 参数包含 type=mp4
    videoPatterns.push(/v\.qq\.com.*\.mp4/i)     // QQ 视频
    videoPatterns.push(/qqvideo/i)               // QQ 视频
  }
  if (allowedFormats.includes('flv')) {
    videoPatterns.push(/\.flv(\?|$|#)/i)
    videoPatterns.push(/stream.*\.flv/i)
  }
  if (allowedFormats.includes('ts')) {
    videoPatterns.push(/\.ts(\?|$|#)/i)
    videoPatterns.push(/\.m4s(\?|$|#)/i)
  }
  if (allowedFormats.includes('webm')) {
    videoPatterns.push(/\.webm(\?|$|#)/i)
  }
  
  // 如果配置了收集所有格式，添加通用模式
  if (allowedFormats.includes('all')) {
    videoPatterns.push(/\.m3u8(\?|$|#)/i)
    videoPatterns.push(/\.mpd(\?|$|#)/i)
    videoPatterns.push(/\.mp4(\?|$|#)/i)
    videoPatterns.push(/\.flv(\?|$|#)/i)
    videoPatterns.push(/\.ts(\?|$|#)/i)
    videoPatterns.push(/\.m4s(\?|$|#)/i)
    videoPatterns.push(/\.webm(\?|$|#)/i)
    videoPatterns.push(/\.mkv(\?|$|#)/i)
    videoPatterns.push(/video.*\.m3u8/i)
    videoPatterns.push(/playlist.*\.m3u8/i)
    videoPatterns.push(/manifest.*\.mpd/i)
    videoPatterns.push(/stream.*\.(mp4|flv|m3u8)/i)
    videoPatterns.push(/\/video\//i)
    videoPatterns.push(/\/play\//i)
    videoPatterns.push(/\/media\//i)
    videoPatterns.push(/\/hls\//i)
    videoPatterns.push(/\/dash\//i)
    videoPatterns.push(/videoplayback/i)
    videoPatterns.push(/googlevideo\.com/i)
    videoPatterns.push(/\.akamaized\.net.*video/i)
    videoPatterns.push(/cloudfront.*video/i)
    videoPatterns.push(/\.cdn.*\.(mp4|m3u8|ts)/i)
  }

  // 需要排除的 URL 模式
  const excludePatterns = [
    /\.css(\?|$)/i,
    /\.js(\?|$)/i,
    /\.jpg(\?|$)/i,
    /\.jpeg(\?|$)/i,
    /\.png(\?|$)/i,
    /\.gif(\?|$)/i,
    /\.svg(\?|$)/i,
    /\.ico(\?|$)/i,
    /\.webp(\?|$)/i,
    /\.woff/i,
    /\.ttf/i,
    /\.eot/i,
    /google.*analytics/i,
    /facebook.*pixel/i,
    /doubleclick/i,
    /\.vtt(\?|$)/i,  // 字幕文件
    /\.srt(\?|$)/i,  // 字幕文件
    /\.json(\?|$)/i, // JSON 数据
    /\.xml(\?|$)/i,  // XML 数据（除了 mpd）
    /fonts\./i,      // 字体
    /tracking/i,     // 追踪
    /analytics/i,    // 分析
    /beacon/i,       // 信标
    /telemetry/i,    // 遥测
    // 缩略图和预览图网站
    /videothumbs\./i,      // 视频缩略图
    /thumbnail/i,          // 缩略图
    /preview\.webp/i,      // 预览图
    /easyvidplay\.art/i,   // 预览图站点
    /poster\./i,           // 海报图
    /cover\./i,            // 封面图
    /thumb\./i,            // 缩略图
    /\/thumbs?\//i,        // 缩略图目录
    /\/previews?\//i,      // 预览目录
  ]

  console.log('========== 智能解析开始 ==========')
  console.log('目标 URL:', url)
  console.log('显示浏览器:', showBrowser)
  console.log('用户操作等待时间:', userWaitTime, 'ms')

  // 关闭之前的窗口
  if (smartParseWindow && !smartParseWindow.isDestroyed()) {
    smartParseWindow.close()
  }

  // 创建浏览器窗口
  smartParseWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: showBrowser,
    title: showBrowser ? '智能解析 - 请登录或操作后等待解析完成' : '智能解析',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    }
  })
  
  if (showBrowser) {
    smartParseWindow.setTitle('智能解析 - 请登录或操作，完成后请等待')
  }

  return new Promise((resolve, reject) => {

    const session = smartParseWindow.webContents.session
    let timeoutId = null
    let resolved = false

    // 清理函数
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (smartParseWindow && !smartParseWindow.isDestroyed()) {
        // 移除所有监听器，防止重复触发
        smartParseWindow.removeAllListeners('closed')
        smartParseWindow.removeAllListeners('did-fail-load')
        smartParseWindow.webContents.removeAllListeners('did-finish-load')
        smartParseWindow.close()
        smartParseWindow = null
      }
    }
    
    // 全局错误捕获
    const handleError = (error) => {
      if (resolved) return
      resolved = true
      console.error('智能解析发生错误:', error)
      cleanup()
      reject(error)
    }
    
    // 捕获未处理的错误
    try {

    // 最终排除列表（缩略图等无效 URL）
    const finalExcludePatterns = [
      /videothumbs\./i,
      /thumbnail/i,
      /preview\.webp/i,
      /easyvidplay\.art/i,
      /poster\./i,
      /\/thumbs?\//i,
      /\/previews?\//i,
      /\.webp(\?|$)/i,
      /\.jpg(\?|$)/i,
      /\.png(\?|$)/i,
      /\.gif(\?|$)/i,
      /asset\./i,           // 静态资源
      /static\./i,          // 静态资源
    ]

    // 完成解析
    const finishParse = () => {
      if (resolved) return
      resolved = true
      
      console.log('原始捕获的视频 URL 数量:', capturedUrls.length)
      
      // 最终过滤：排除缩略图等无效 URL
      const filteredUrls = capturedUrls.filter(url => {
        const shouldExclude = finalExcludePatterns.some(p => p.test(url))
        if (shouldExclude) {
          console.log('❌ 排除无效 URL:', url.substring(0, 80))
        }
        return !shouldExclude
      })
      
      console.log('过滤后的视频 URL 数量:', filteredUrls.length)
      console.log('========== 智能解析结束 ==========')

      // 优先返回 m3u8 和 mpd，其次是大型 CDN 的 mp4
      const sortedUrls = [...new Set(filteredUrls)].sort((a, b) => {
        const getScore = (url) => {
          if (url.includes('.m3u8')) return 100
          if (url.includes('.mpd')) return 90
          // 优先大型 CDN
          if (/tc\.qq\.com/i.test(url)) return 85
          if (/googlevideo/i.test(url)) return 85
          if (/\.f\d+\.mp4/i.test(url)) return 80  // 腾讯视频格式
          if (url.includes('.mp4')) return 50
          if (url.includes('.flv')) return 40
          return 0
        }
        return getScore(b) - getScore(a)
      })
      
      if (sortedUrls.length > 0) {
        console.log('最佳视频 URL:', sortedUrls[0].substring(0, 100))
      }

      // 构建带请求头的视频信息
      const videoUrlsWithHeaders = sortedUrls.map(videoUrl => ({
        url: videoUrl,
        headers: capturedHeaders[videoUrl] || {}
      }))
      
      cleanup()
      resolve({
        success: sortedUrls.length > 0,
        title: pageTitle || '未知标题',
        thumbnail: pageThumbnail,
        videoUrls: sortedUrls,
        videoUrlsWithHeaders: videoUrlsWithHeaders,  // 带请求头的视频列表
        bestUrl: sortedUrls[0] || null,
        bestUrlHeaders: capturedHeaders[sortedUrls[0]] || {}  // 最佳URL的请求头
      })
    }

    // 监听网络请求（使用 Electron 的 webRequest API）
    session.webRequest.onBeforeRequest((details, callback) => {
      const reqUrl = details.url
      
      // 跳过 data: 和 blob: URL
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:')) {
        callback({ cancel: false })
        return
      }
      
      // 检查是否是视频流
      const isVideo = videoPatterns.some(pattern => pattern.test(reqUrl))
      const isExcluded = excludePatterns.some(pattern => pattern.test(reqUrl))
      
      if (isVideo && !isExcluded) {
        console.log('✅ 捕获视频请求:', reqUrl.substring(0, 200))
        if (!capturedUrls.includes(reqUrl)) {
          capturedUrls.push(reqUrl)
          
          // 发送进度更新
          if (mainWindow) {
            mainWindow.webContents.send('smart-parse:progress', {
              status: 'found',
              message: `已捕获 ${capturedUrls.length} 个视频地址`
            })
          }
        }
      }
      
      callback({ cancel: false })
    })
    
    // 监听请求头（捕获每个视频请求的完整请求头）
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      const reqUrl = details.url
      
      // 只处理已捕获的视频 URL
      if (capturedUrls.includes(reqUrl) && !capturedHeaders[reqUrl]) {
        // 保存重要的请求头
        const headers = {}
        const importantHeaders = [
          'referer', 'Referer',
          'origin', 'Origin', 
          'cookie', 'Cookie',
          'user-agent', 'User-Agent',
          'accept', 'Accept',
          'accept-language', 'Accept-Language',
          'authorization', 'Authorization',
          'x-requested-with', 'X-Requested-With'
        ]
        
        if (details.requestHeaders) {
          for (const [key, value] of Object.entries(details.requestHeaders)) {
            // 保存所有重要的请求头
            if (importantHeaders.some(h => h.toLowerCase() === key.toLowerCase())) {
              headers[key] = value
            }
          }
        }
        
        // 如果没有 Referer，使用页面 URL
        if (!headers['Referer'] && !headers['referer']) {
          headers['Referer'] = url
        }
        
        capturedHeaders[reqUrl] = headers
        console.log('📋 捕获请求头:', reqUrl.substring(0, 80), '- Headers:', Object.keys(headers).join(', '))
      }
      
      callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

    // 监听响应头（检查 Content-Type）- 也要遵循格式过滤
    session.webRequest.onHeadersReceived((details, callback) => {
      const reqUrl = details.url
      
      // 跳过已处理的 URL
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:')) {
        callback({ cancel: false })
        return
      }
      
      const contentType = details.responseHeaders?.['content-type']?.[0] || 
                          details.responseHeaders?.['Content-Type']?.[0] || ''
      
      // 根据配置的格式，检测 Content-Type
      let isAllowedContentType = false
      
      if (allowedFormats.includes('all')) {
        // 全部格式时，接受所有视频类型
        isAllowedContentType = 
          contentType.includes('mpegurl') ||
          contentType.includes('dash+xml') ||
          contentType.includes('video/')
      } else {
        // 按配置的格式过滤
        if (allowedFormats.includes('m3u8') && contentType.includes('mpegurl')) {
          isAllowedContentType = true
        }
        if (allowedFormats.includes('mpd') && contentType.includes('dash+xml')) {
          isAllowedContentType = true
        }
        if (allowedFormats.includes('mp4') && contentType.includes('video/mp4')) {
          isAllowedContentType = true
        }
        if (allowedFormats.includes('webm') && contentType.includes('video/webm')) {
          isAllowedContentType = true
        }
        if (allowedFormats.includes('flv') && contentType.includes('video/x-flv')) {
          isAllowedContentType = true
        }
        if (allowedFormats.includes('ts') && (contentType.includes('video/mp2t') || contentType.includes('video/MP2T'))) {
          isAllowedContentType = true
        }
      }
      
      if (isAllowedContentType && !capturedUrls.includes(reqUrl)) {
        // 排除明显不是视频的
        const isExcluded = excludePatterns.some(pattern => pattern.test(reqUrl))
        if (!isExcluded) {
          console.log('✅ 捕获视频响应:', reqUrl.substring(0, 200), '类型:', contentType)
          capturedUrls.push(reqUrl)
          
          if (mainWindow) {
            mainWindow.webContents.send('smart-parse:progress', {
              status: 'found',
              message: `已捕获 ${capturedUrls.length} 个视频地址`
            })
          }
        }
      }
      
      callback({ cancel: false })
    })

    // 发送进度更新
    if (mainWindow) {
      mainWindow.webContents.send('smart-parse:progress', {
        status: 'loading',
        message: '正在加载页面...'
      })
    }

    // 页面加载完成
    smartParseWindow.webContents.on('did-finish-load', async () => {
      console.log('页面加载完成')
      
      // 获取页面标题
      pageTitle = smartParseWindow.webContents.getTitle()
      
      // 尝试获取缩略图
      try {
        pageThumbnail = await smartParseWindow.webContents.executeJavaScript(`
          (function() {
            const og = document.querySelector('meta[property="og:image"]');
            if (og) return og.content;
            const twitter = document.querySelector('meta[name="twitter:image"]');
            if (twitter) return twitter.content;
            return '';
          })()
        `)
      } catch (e) {}

      // 如果设置了用户操作等待时间，给用户时间进行操作
      if (userWaitTime > 0 && showBrowser) {
        const waitSeconds = Math.ceil(userWaitTime / 1000)
        console.log(`等待用户操作 ${waitSeconds} 秒...`)
        
        // 倒计时提示
        for (let i = waitSeconds; i > 0; i--) {
          // 检查窗口是否还存在
          if (resolved || !smartParseWindow || smartParseWindow.isDestroyed()) {
            console.log('窗口已关闭，停止等待')
            return
          }
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('smart-parse:progress', {
              status: 'user-wait',
              message: `请在浏览器中操作（登录/点击播放等），剩余 ${i} 秒...`
            })
          }
          smartParseWindow.setTitle(`智能解析 - 请操作，剩余 ${i} 秒`)
          await new Promise(r => setTimeout(r, 1000))
        }
        
        console.log('用户操作等待时间结束')
      }

      // 发送进度更新
      if (mainWindow) {
        mainWindow.webContents.send('smart-parse:progress', {
          status: 'waiting',
          message: '等待视频加载...'
        })
      }

      // 检查窗口是否还存在
      if (resolved || !smartParseWindow || smartParseWindow.isDestroyed()) {
        console.log('窗口已关闭，停止解析')
        return
      }
      
      // 检查 URL 是否应该被排除（缩略图等）
      const shouldExcludeUrl = (url) => {
        const excludeList = [
          /videothumbs\./i,
          /thumbnail/i,
          /preview\.webp/i,
          /easyvidplay\.art/i,
          /poster\./i,
          /\/thumbs?\//i,
          /\/previews?\//i,
          /\.webp(\?|$)/i,
          /\.jpg(\?|$)/i,
          /\.png(\?|$)/i,
          /\.gif(\?|$)/i,
        ]
        return excludeList.some(p => p.test(url))
      }

      // 检查 URL 是否符合配置的格式
      const isUrlAllowed = (url) => {
        // 先检查排除列表
        if (shouldExcludeUrl(url)) return false
        
        if (allowedFormats.includes('all')) return true
        
        const urlLower = url.toLowerCase()
        if (allowedFormats.includes('m3u8') && urlLower.includes('.m3u8')) return true
        if (allowedFormats.includes('mpd') && urlLower.includes('.mpd')) return true
        if (allowedFormats.includes('mp4')) {
          // 扩展 mp4 检测：包括腾讯视频 CDN 等
          if (urlLower.includes('.mp4')) return true
          if (/\.f\d+\.mp4/i.test(url)) return true
          if (/tc\.qq\.com/i.test(url)) return true
          if (/[?&]type=mp4/i.test(url)) return true
        }
        if (allowedFormats.includes('flv') && urlLower.includes('.flv')) return true
        if (allowedFormats.includes('ts') && (urlLower.includes('.ts') || urlLower.includes('.m4s'))) return true
        if (allowedFormats.includes('webm') && urlLower.includes('.webm')) return true
        
        return false
      }

      // 尝试从页面提取视频 URL（包括嗅探脚本捕获的）
      const extractVideoFromPage = async () => {
        // 检查窗口是否还存在
        if (!smartParseWindow || smartParseWindow.isDestroyed()) {
          console.log('窗口已关闭，无法提取视频')
          return
        }
        
        try {
          const pageVideoUrls = await smartParseWindow.webContents.executeJavaScript(`
            (function() {
              const urls = [];
              
              // 0. 首先获取嗅探脚本捕获的 URL
              if (window.__capturedVideoUrls__ && window.__capturedVideoUrls__.length > 0) {
                console.log('[提取] 嗅探脚本捕获到', window.__capturedVideoUrls__.length, '个 URL');
                urls.push(...window.__capturedVideoUrls__);
              }
              
              // 1. 从 video 标签提取
              document.querySelectorAll('video').forEach(video => {
                if (video.src && !video.src.startsWith('blob:')) {
                  urls.push(video.src);
                }
                // 检查 currentSrc（实际播放的源）
                if (video.currentSrc && !video.currentSrc.startsWith('blob:')) {
                  urls.push(video.currentSrc);
                }
                // 检查 source 子元素
                video.querySelectorAll('source').forEach(source => {
                  if (source.src && !source.src.startsWith('blob:')) {
                    urls.push(source.src);
                  }
                });
              });
              
              // 2. 从 iframe 中的 video 标签（同源）
              try {
                document.querySelectorAll('iframe').forEach(iframe => {
                  try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                      // 检查 iframe 中的嗅探结果
                      if (iframeDoc.defaultView?.__capturedVideoUrls__) {
                        urls.push(...iframeDoc.defaultView.__capturedVideoUrls__);
                      }
                      iframeDoc.querySelectorAll('video').forEach(video => {
                        if (video.src && !video.src.startsWith('blob:')) {
                          urls.push(video.src);
                        }
                        if (video.currentSrc && !video.currentSrc.startsWith('blob:')) {
                          urls.push(video.currentSrc);
                        }
                      });
                    }
                  } catch(e) {}
                });
              } catch(e) {}
              
              // 3. 从页面中查找可能的视频 URL（提取所有可能的视频格式）
              const scripts = document.querySelectorAll('script');
              const urlPattern = /(https?:\\/\\/[^"'\\s<>]+\\.(m3u8|mpd|mp4|flv|ts|m4s|webm)[^"'\\s<>]*)/gi;
              scripts.forEach(script => {
                const matches = script.textContent.match(urlPattern);
                if (matches) {
                  urls.push(...matches);
                }
              });
              
              // 4. 从 data 属性查找
              document.querySelectorAll('[data-src], [data-video], [data-url], [data-stream]').forEach(el => {
                const src = el.dataset.src || el.dataset.video || el.dataset.url || el.dataset.stream;
                if (src && (src.includes('.m3u8') || src.includes('.mpd') || src.includes('.mp4') || src.includes('.flv') || src.includes('.ts') || src.includes('.webm'))) {
                  urls.push(src);
                }
              });
              
              // 5. 从页面 HTML 中提取（更广泛的搜索）
              const htmlContent = document.documentElement.innerHTML;
              const broadUrlPattern = /(https?:\\/\\/[^"'\\s<>]+\\.(m3u8|mpd)[^"'\\s<>]*)/gi;
              const broadMatches = htmlContent.match(broadUrlPattern);
              if (broadMatches) {
                urls.push(...broadMatches);
              }
              
              // 去重并返回
              const uniqueUrls = [...new Set(urls)].filter(u => u && !u.startsWith('blob:') && !u.startsWith('data:'));
              console.log('[提取] 总共找到', uniqueUrls.length, '个视频 URL');
              return uniqueUrls;
            })()
          `)
          
          if (pageVideoUrls && pageVideoUrls.length > 0) {
            console.log('从页面提取到视频 URL:', pageVideoUrls)
            for (const vUrl of pageVideoUrls) {
              // 根据配置的格式进行过滤
              if (!capturedUrls.includes(vUrl) && isUrlAllowed(vUrl)) {
                console.log('✅ 符合格式过滤:', vUrl.substring(0, 100))
                capturedUrls.push(vUrl)
              }
            }
          }
        } catch (e) {
          console.log('提取页面视频 URL 失败:', e.message)
        }
      }

      // 等待 3 秒让视频请求发出
      setTimeout(async () => {
        // 先尝试从页面提取视频 URL
        await extractVideoFromPage()
        
        // 如果还没捕获到视频，尝试点击播放按钮
        if (capturedUrls.length === 0) {
          console.log('尝试点击播放按钮...')
          
          if (mainWindow) {
            mainWindow.webContents.send('smart-parse:progress', {
              status: 'clicking',
              message: '尝试触发视频播放...'
            })
          }

          try {
            // 检查窗口是否还存在
            if (!smartParseWindow || smartParseWindow.isDestroyed()) {
              return
            }
            
            await smartParseWindow.webContents.executeJavaScript(`
              (function() {
                // 常见的播放按钮选择器
                const selectors = [
                  'button[class*="play"]',
                  'div[class*="play"]',
                  '.play-button',
                  '.video-play',
                  '.btn-play',
                  '[aria-label*="play" i]',
                  '[aria-label*="播放"]',
                  '.vjs-big-play-button',
                  '.dplayer-play-icon',
                  'video'
                ];
                
                for (const selector of selectors) {
                  const el = document.querySelector(selector);
                  if (el) {
                    el.click();
                    console.log('点击了:', selector);
                    break;
                  }
                }
              })()
            `)
          } catch (e) {
            console.log('点击播放按钮失败:', e.message)
          }

          // 再等待 3 秒后再次尝试提取
          setTimeout(async () => {
            await extractVideoFromPage()
            finishParse()
          }, 3000)
        } else {
          // 已经捕获到视频，再等 1 秒确保捕获完整
          setTimeout(finishParse, 1000)
        }
      }, 3000)
    })

    // 加载错误处理
    // 注意：某些错误码不应该立即失败，比如 Cloudflare 验证会导致 -3 (ERR_ABORTED)
    smartParseWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (resolved) return
      
      // 只处理主框架的错误
      if (!isMainFrame) {
        console.log('子框架加载失败，忽略:', errorCode, errorDescription)
        return
      }
      
      console.error('页面加载失败:', errorCode, errorDescription)
      
      // 错误码说明：
      // -3: ERR_ABORTED - 请求被中止（Cloudflare 重定向、验证等）
      // -2: ERR_FAILED - 通用失败
      // -6: ERR_FILE_NOT_FOUND - 文件未找到
      // -7: ERR_TIMED_OUT - 超时
      // -105: ERR_NAME_NOT_RESOLVED - DNS 解析失败
      // -106: ERR_INTERNET_DISCONNECTED - 无网络连接
      
      // 对于 ERR_ABORTED (-3)，可能是 Cloudflare 验证导致的重定向，不要立即失败
      // 继续等待用户完成验证
      if (errorCode === -3) {
        console.log('检测到请求中止（可能是 Cloudflare 验证），继续等待...')
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('smart-parse:progress', {
            status: 'cloudflare',
            message: '检测到安全验证，请在浏览器中完成验证...'
          })
        }
        
        // 如果浏览器窗口是显示的，给用户时间完成验证
        if (showBrowser && smartParseWindow && !smartParseWindow.isDestroyed()) {
          smartParseWindow.setTitle('智能解析 - 请完成安全验证')
        }
        
        // 不要关闭窗口，让用户有机会完成验证
        return
      }
      
      // 对于其他严重错误，才关闭窗口
      cleanup()
      reject(new Error(`页面加载失败: ${errorDescription}`))
    })

    // 窗口关闭处理（用户手动关闭或意外关闭）
    smartParseWindow.on('closed', () => {
      if (resolved) return
      resolved = true
      console.log('智能解析窗口被关闭')
      
      if (timeoutId) clearTimeout(timeoutId)
      smartParseWindow = null
      
      // 通知主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('smart-parse:progress', {
          status: 'closed',
          message: '解析窗口已关闭'
        })
      }
      
      // 返回已捕获的结果（如果有）
      if (capturedUrls.length > 0) {
        console.log('窗口关闭，返回已捕获的', capturedUrls.length, '个视频地址')
        
        // 过滤无效 URL
        const filteredUrls = capturedUrls.filter(url => {
          const shouldExclude = finalExcludePatterns.some(p => p.test(url))
          return !shouldExclude
        })
        
        const sortedUrls = [...new Set(filteredUrls)].sort((a, b) => {
          const getScore = (url) => {
            if (url.includes('.m3u8')) return 100
            if (url.includes('.mpd')) return 90
            if (/tc\.qq\.com/i.test(url)) return 85
            if (/googlevideo/i.test(url)) return 85
            if (/\.f\d+\.mp4/i.test(url)) return 80
            if (url.includes('.mp4')) return 50
            if (url.includes('.flv')) return 40
            return 0
          }
          return getScore(b) - getScore(a)
        })
        
        if (sortedUrls.length > 0) {
          console.log('窗口关闭但已捕获到视频，返回结果')
          
          // 构建带请求头的视频信息
          const videoUrlsWithHeaders = sortedUrls.map(videoUrl => ({
            url: videoUrl,
            headers: capturedHeaders[videoUrl] || {}
          }))
          
          resolve({
            success: true,
            title: pageTitle || '未知标题',
            thumbnail: pageThumbnail,
            videoUrls: sortedUrls,
            videoUrlsWithHeaders: videoUrlsWithHeaders,
            bestUrl: sortedUrls[0],
            bestUrlHeaders: capturedHeaders[sortedUrls[0]] || {},
            warning: '解析窗口被提前关闭，但已捕获到视频地址'
          })
        } else {
          console.log('窗口关闭且过滤后无有效视频')
          reject(new Error('解析窗口被关闭，未找到有效的视频地址'))
        }
      } else {
        // 没有捕获到任何视频
        console.log('窗口关闭且未捕获到任何视频')
        reject(new Error('解析窗口被关闭，未捕获到视频地址。请尝试：\n1. 延长等待时间\n2. 在浏览器中手动播放视频\n3. 检查网站是否需要登录'))
      }
    })

    // 超时处理
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.log(`解析超时 (${timeout}ms)，返回已捕获的结果`)
        
        // 通知主窗口
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('smart-parse:progress', {
            status: 'timeout',
            message: `解析超时，已捕获 ${capturedUrls.length} 个视频地址`
          })
        }
        
        finishParse()
      }
    }, timeout)

    // 注入视频嗅探脚本（类似嗅探猫的技术）
    const injectSnifferScript = async () => {
      // 检查窗口是否还存在
      if (!smartParseWindow || smartParseWindow.isDestroyed()) {
        return
      }
      
      try {
        await smartParseWindow.webContents.executeJavaScript(`
          (function() {
            // 避免重复注入
            if (window.__videoSnifferInjected__) return;
            window.__videoSnifferInjected__ = true;
            window.__capturedVideoUrls__ = window.__capturedVideoUrls__ || [];
            
            // 视频 URL 匹配模式（增强版）
            const videoPatterns = [
              /\\.m3u8(\\?|$|#)/i,
              /\\.mpd(\\?|$|#)/i,
              /\\.mp4(\\?|$|#)/i,
              /\\.f\\d+\\.mp4/i,          // 腾讯视频格式
              /\\.flv(\\?|$|#)/i,
              /\\.ts(\\?|$|#)/i,
              /\\.m4s(\\?|$|#)/i,
              /\\.webm(\\?|$|#)/i,
              /videoplayback/i,
              /googlevideo\\.com/i,
              /tc\\.qq\\.com/i,           // 腾讯视频 CDN
              /[?&]type=mp4/i,            // URL 参数 type=mp4
              /v\\.qq\\.com.*\\.mp4/i,
              /qqvideo/i,
              /\\/hls\\//i,
              /\\/dash\\//i,
            ];
            
            // 排除模式（缩略图等）
            const excludePatterns = [
              /videothumbs\\./i,
              /thumbnail/i,
              /preview\\.webp/i,
              /easyvidplay\\.art/i,
              /poster\\./i,
              /\\/thumbs?\\//i,
              /\\/previews?\\//i,
              /\\.webp(\\?|$)/i,
              /\\.jpg(\\?|$)/i,
              /\\.png(\\?|$)/i,
            ];
            
            const isVideoUrl = (url) => {
              if (!url || typeof url !== 'string') return false;
              if (url.startsWith('blob:') || url.startsWith('data:')) return false;
              // 检查是否匹配排除模式
              if (excludePatterns.some(p => p.test(url))) return false;
              return videoPatterns.some(p => p.test(url));
            };
            
            const addCapturedUrl = (url, source) => {
              if (isVideoUrl(url) && !window.__capturedVideoUrls__.includes(url)) {
                console.log('[视频嗅探] 捕获 (' + source + '):', url.substring(0, 100));
                window.__capturedVideoUrls__.push(url);
              }
            };
            
            // 1. Hook fetch API
            const originalFetch = window.fetch;
            window.fetch = function(input, init) {
              const url = typeof input === 'string' ? input : input?.url;
              if (url) addCapturedUrl(url, 'fetch');
              return originalFetch.apply(this, arguments);
            };
            
            // 2. Hook XMLHttpRequest
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              if (url) addCapturedUrl(url, 'xhr');
              return originalXHROpen.apply(this, arguments);
            };
            
            // 3. Hook URL.createObjectURL - 捕获 blob 的原始来源
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(obj) {
              const blobUrl = originalCreateObjectURL.apply(this, arguments);
              // 尝试获取 blob 的类型
              if (obj && obj.type && obj.type.includes('video')) {
                console.log('[视频嗅探] Blob URL 创建:', obj.type);
              }
              return blobUrl;
            };
            
            // 4. Hook MediaSource - 捕获 MSE 视频
            if (window.MediaSource) {
              const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
              MediaSource.prototype.addSourceBuffer = function(mimeType) {
                console.log('[视频嗅探] MediaSource addSourceBuffer:', mimeType);
                return originalAddSourceBuffer.apply(this, arguments);
              };
            }
            
            // 5. Hook video.src 设置
            const videoProto = HTMLVideoElement.prototype;
            const originalSrcDescriptor = Object.getOwnPropertyDescriptor(videoProto, 'src') ||
                                          Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
            if (originalSrcDescriptor && originalSrcDescriptor.set) {
              Object.defineProperty(videoProto, 'src', {
                get: originalSrcDescriptor.get,
                set: function(value) {
                  if (value) addCapturedUrl(value, 'video.src');
                  return originalSrcDescriptor.set.call(this, value);
                },
                configurable: true
              });
            }
            
            // 6. Hook source 元素的 src 属性
            const sourceProto = HTMLSourceElement.prototype;
            const originalSourceSrcDescriptor = Object.getOwnPropertyDescriptor(sourceProto, 'src');
            if (originalSourceSrcDescriptor && originalSourceSrcDescriptor.set) {
              Object.defineProperty(sourceProto, 'src', {
                get: originalSourceSrcDescriptor.get,
                set: function(value) {
                  if (value) addCapturedUrl(value, 'source.src');
                  return originalSourceSrcDescriptor.set.call(this, value);
                },
                configurable: true
              });
            }
            
            // 7. 监听 DOM 变化，捕获动态添加的 video/source
            const observer = new MutationObserver((mutations) => {
              mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeName === 'VIDEO' && node.src) {
                    addCapturedUrl(node.src, 'dom-video');
                  }
                  if (node.nodeName === 'SOURCE' && node.src) {
                    addCapturedUrl(node.src, 'dom-source');
                  }
                  if (node.querySelectorAll) {
                    node.querySelectorAll('video[src], source[src]').forEach(el => {
                      if (el.src) addCapturedUrl(el.src, 'dom-query');
                    });
                  }
                });
              });
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            
            console.log('[视频嗅探] 脚本已注入');
          })();
        `)
      } catch (e) {
        console.log('注入嗅探脚本失败:', e.message)
      }
    }

    // 在页面开始加载时注入脚本
    smartParseWindow.webContents.on('did-start-navigation', async (event, navUrl, isInPlace, isMainFrame) => {
      if (isMainFrame) {
        // 页面导航开始，准备注入
        console.log('页面导航开始:', navUrl)
      }
    })

    // DOM 准备好后注入脚本
    smartParseWindow.webContents.on('dom-ready', async () => {
      console.log('DOM 准备完成，注入嗅探脚本')
      await injectSnifferScript()
    })

    // 加载页面
    smartParseWindow.loadURL(url).catch(err => {
      if (!resolved) {
        resolved = true
        cleanup()
        reject(new Error(`无法加载页面: ${err.message}`))
      }
    })
    
    } catch (error) {
      // 捕获同步错误
      handleError(error)
    }
  })
}

// 解析视频信息
async function parseVideoInfo(url, enablePlaylist = true) {
  const config = loadConfig()
  const matchedRule = findMatchingRule(url)
  
  return new Promise((resolve, reject) => {
    // 判断是否为播放列表URL
    const isPlaylistUrl = url.includes('list=') || url.includes('/playlist') || url.includes('channel')
    
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings'
    ]
    
    // YouTube 需要 js-runtimes 来解密签名获取完整格式列表
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
    if (isYouTube) {
      args.push('--js-runtimes', 'node')
    }
    
    // 根据参数决定是否支持播放列表
    if (!enablePlaylist) {
      // 关闭播放列表支持，只解析单个视频
      args.push('--no-playlist')
    } else if (isPlaylistUrl) {
      // 如果是播放列表，使用 flat-playlist 只获取基本信息
      args.push('--flat-playlist')
    }

    // Bilibili 特殊处理
    const isBilibili = url.includes('bilibili.com') || url.includes('b23.tv')
    if (isBilibili) {
      args.push('--no-check-certificate')
    }

    // 添加代理
    if (config.proxy) {
      args.push('--proxy', config.proxy)
    }

    // 添加 cookie - 优先使用浏览器 cookie
    if (config.cookiesFromBrowser && config.cookiesFromBrowser !== 'none') {
      args.push('--cookies-from-browser', config.cookiesFromBrowser)
    } else if (config.cookieFile && fs.existsSync(config.cookieFile)) {
      args.push('--cookies', config.cookieFile)
    }

    // 应用匹配规则中的自定义 yt-dlp 参数
    console.log('========== 规则匹配 ==========')
    console.log('URL:', url)
    console.log('匹配到的规则:', matchedRule ? JSON.stringify({ name: matchedRule.name, ytdlpArgs: matchedRule.ytdlpArgs }) : '无')
    if (matchedRule && matchedRule.ytdlpArgs) {
      const ruleArgsArray = matchedRule.ytdlpArgs.split(/\s+/).filter(arg => arg.trim())
      // 避免重复添加已存在的参数
      ruleArgsArray.forEach(arg => {
        if (!args.includes(arg)) {
          args.push(arg)
        }
      })
      console.log('应用规则参数:', ruleArgsArray)
    }

    // 全局自定义参数
    console.log('全局自定义参数:', config.customArgs || '(空)')
    if (config.customArgs) {
      const customArgsArray = config.customArgs.split(/\s+/).filter(arg => arg.trim())
      // 避免重复添加已存在的参数
      customArgsArray.forEach(arg => {
        if (!args.includes(arg)) {
          args.push(arg)
        }
      })
      console.log('应用全局参数:', customArgsArray)
    }

    args.push(url)

    console.log('========== 最终解析命令 ==========')
    console.log('yt-dlp', args.join(' '))
    console.log('===================================')

    const parseProcess = spawn(ytdlpPath, args)
    let stdout = ''
    let stderr = ''

    parseProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    parseProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      console.log('Parse stderr:', data.toString())
    })

    parseProcess.on('close', (code) => {
      console.log('Parse process closed with code:', code)
      console.log('stderr:', stderr)
      
      if (code === 0 && stdout.trim()) {
        try {
          // 处理可能的多行 JSON（播放列表）
          const lines = stdout.trim().split('\n').filter(line => {
            const trimmed = line.trim()
            return trimmed && trimmed.startsWith('{')
          })
          
          if (lines.length === 0) {
            reject(new Error('未能获取视频信息'))
            return
          }
          
          const results = lines.map(line => JSON.parse(line))
          
          if (results.length === 1) {
            resolve({ type: 'single', data: results[0] })
          } else {
            resolve({ type: 'playlist', data: results })
          }
        } catch (e) {
          console.error('JSON parse error:', e, 'stdout:', stdout)
          reject(new Error('解析视频信息失败: ' + e.message))
        }
      } else {
        // 解析错误信息，给出更友好的提示
        let errorMsg = stderr || '解析失败'
        
        if (errorMsg.includes('Sign in')) {
          errorMsg = '此视频需要登录。请在设置中导入 Cookie 文件，或启用"从浏览器获取Cookie"'
        } else if (errorMsg.includes('Private video')) {
          errorMsg = '这是一个私密视频，无法下载'
        } else if (errorMsg.includes('Video unavailable')) {
          errorMsg = '视频不可用或已被删除'
        } else if (errorMsg.includes('geo')) {
          errorMsg = '此视频有地区限制，请尝试使用代理'
        } else if (errorMsg.includes('copyright')) {
          errorMsg = '此视频因版权原因无法下载'
        } else if (errorMsg.includes('cookies')) {
          errorMsg = 'Cookie 无效或已过期，请重新导入'
        } else if (errorMsg.includes('Requested format is not available')) {
          errorMsg = 'YouTube 视频需要登录访问。请前往"设置"页面，在"从浏览器获取 Cookie"中选择 Firefox 或 Chrome，然后在浏览器中登录 YouTube 后重试'
        } else if (errorMsg.includes('HTTP Error 403') || errorMsg.includes('Forbidden')) {
          errorMsg = 'YouTube 拒绝访问（403 Forbidden）。请在"设置"中启用"从浏览器获取 Cookie"功能，选择 Firefox 或 Chrome，确保浏览器已登录 YouTube'
        } else if (errorMsg.includes('HTTP Error 400')) {
          errorMsg = 'YouTube 请求无效（400 Bad Request）。请更新 yt-dlp 到最新版本，并在设置中配置浏览器 Cookie'
        }
        
        reject(new Error(errorMsg))
      }
    })

    parseProcess.on('error', (err) => {
      console.error('Parse process error:', err)
      reject(new Error('启动解析进程失败: ' + err.message))
    })
  })
}

// 获取详细格式信息
async function getFormats(url) {
  const config = loadConfig()
  
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-download',
      url
    ]

    if (config.proxy) {
      args.unshift('--proxy', config.proxy)
    }

    if (config.cookieFile && fs.existsSync(config.cookieFile)) {
      args.unshift('--cookies', config.cookieFile)
    }

    const process = spawn(ytdlpPath, args)
    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout)
          resolve(info)
        } catch (e) {
          reject(new Error('解析格式信息失败'))
        }
      } else {
        reject(new Error(stderr || '获取格式失败'))
      }
    })
  })
}

// 使用 N_m3u8DL-RE 下载 m3u8 视频
function downloadM3u8(task, onProgress) {
  const config = loadConfig()
  
  return new Promise((resolve, reject) => {
    // 检查 N_m3u8DL-RE 是否存在
    if (!fs.existsSync(n_m3u8dlPath)) {
      console.error('N_m3u8DL-RE 不存在:', n_m3u8dlPath)
      reject(new Error('N_m3u8DL-RE 未找到，请检查 resources 目录'))
      return
    }
    
    // 生成文件名
    let filename = config.namingTemplate
      .replace('{title}', task.title || 'video')
      .replace('{id}', task.id || '')
      .replace('{index}', String(task.index || 1).padStart(2, '0'))
      .replace('{uploader}', task.uploader || '')
      .replace('{date}', new Date().toISOString().split('T')[0])
      .replace('{ext}', '')
      .replace(/%(ext)s/g, '')
    
    // 清理非法字符
    filename = filename.replace(/[<>:"/\\|?*]/g, '_').trim()
    if (!filename) filename = 'video_' + Date.now()
    
    // 确保下载目录存在
    const downloadDir = config.downloadPath
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }
    
    console.log('下载目录:', downloadDir)
    console.log('文件名:', filename)
    
    // N_m3u8DL-RE 参数
    const args = [
      task.url,
      '--save-dir', downloadDir,
      '--save-name', filename,
      '--auto-select',           // 自动选择最佳流
      '--no-log',                // 不生成日志文件
      '--tmp-dir', path.join(downloadDir, '.download_cache'),  // 指定临时目录
      '--del-after-done',        // 完成后删除临时文件（合并后才删除）
      '--check-segments-count:false',  // 禁用分片数量检查（避免因计数问题导致合并失败）
      '--download-retry-count', '10',  // 每个分片失败时重试10次（默认3次太少）
      '--http-request-timeout', '30',  // HTTP超时30秒（默认100秒太长）
    ]
    
    // 添加线程数（按照配置来）
    if (config.downloadThreads && config.downloadThreads > 0) {
      args.push('--thread-count', String(config.downloadThreads))
    }
    
    // 添加代理
    if (config.proxy) {
      args.push('--custom-proxy', config.proxy)
    }
    
    // 添加请求头（智能解析时捕获的请求头）
    if (task.headers && Object.keys(task.headers).length > 0) {
      console.log('使用捕获的请求头:', task.headers)
      
      // N_m3u8DL-RE 使用 -H 参数添加请求头
      for (const [key, value] of Object.entries(task.headers)) {
        if (value) {
          args.push('-H', `${key}: ${value}`)
        }
      }
    }
    
    console.log('N_m3u8DL-RE 命令:', n_m3u8dlPath)
    console.log('N_m3u8DL-RE args:', args.join(' '))
    
    // 使用 spawn，设置工作目录为下载目录
    const downloadProcess = spawn(n_m3u8dlPath, args, {
      cwd: downloadDir  // 设置工作目录
    })
    let lastProgress = 0
    let errorOutput = ''
    
    // 解析 N_m3u8DL-RE 的进度输出
    // 格式: Vid Kbps ━━━━━━━━━━ 635/976 65.06% 1.39GB/2.13GB 2.73MBps 00:08:48
    const parseM3u8Progress = (output) => {
      const info = { progress: null, speed: '', eta: '', size: '' }
      
      // 解析进度百分比 例如: 65.06%
      const progressMatch = output.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        info.progress = parseFloat(progressMatch[1])
      }
      
      // 解析已下载/总大小 例如: 1.39GB/2.13GB
      const sizeMatch = output.match(/([\d.]+\s*[KMGT]?i?B)\/([\d.]+\s*[KMGT]?i?B)/i)
      if (sizeMatch) {
        info.size = `${sizeMatch[1]} / ${sizeMatch[2]}`
      }
      
      // 解析速度 例如: 2.73MBps 或 2.73MB/s
      const speedMatch = output.match(/([\d.]+\s*[KMGT]?i?B)(?:ps|\/s)/i)
      if (speedMatch) {
        info.speed = speedMatch[1] + '/s'
      }
      
      // 解析 ETA 例如: 00:08:48
      const etaMatch = output.match(/(\d{2}:\d{2}:\d{2})\s*$/)
      if (etaMatch) {
        info.eta = etaMatch[1]
      }
      
      // 解析分片进度 例如: 635/976
      const segmentMatch = output.match(/(\d+)\/(\d+)\s+[\d.]+%/)
      if (segmentMatch) {
        info.segments = `${segmentMatch[1]}/${segmentMatch[2]}`
      }
      
      return info
    }
    
    const handleOutput = (data) => {
      const output = data.toString()
      console.log('m3u8dl output:', output)
      
      // 检查是否在合并阶段
      if (output.includes('Merging') || output.includes('合并') || output.includes('Muxing')) {
        onProgress({
          taskId: task.id,
          progress: 99.5,
          speed: '',
          eta: '',
          size: '',
          status: 'merging',
          output: '正在合并视频片段...'
        })
        return
      }
      
      const info = parseM3u8Progress(output)
      if (info.progress !== null) {
        // 只有进度变化超过 0.1% 才更新，避免频繁更新
        if (Math.abs(info.progress - lastProgress) >= 0.1 || info.progress >= 100) {
          lastProgress = info.progress
          onProgress({
            taskId: task.id,
            progress: info.progress,
            speed: info.speed,
            eta: info.eta,
            size: info.size,
            segments: info.segments,  // 分片进度
            status: 'downloading',
            output: output.trim()
          })
        }
      }
    }
    
    downloadProcess.stdout.on('data', handleOutput)
    downloadProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.log('m3u8dl stderr:', output)
      errorOutput += output
      handleOutput(data)
    })
    
    downloadProcess.on('close', async (code) => {
      console.log('N_m3u8DL-RE process closed with code:', code)
      
      // 检查是否有分片校验失败的错误
      const hasSegmentCheckError = errorOutput.includes('分片数量校验不通过') || 
                                   errorOutput.includes('Segments check failed')
      
      // 检查输出文件是否存在（即使有错误，如果文件已生成就算成功）
      const possibleExtensions = ['mp4', 'mkv', 'ts', 'flv', 'webm']
      let outputFileExists = false
      let outputFilePath = null
      
      for (const ext of possibleExtensions) {
        const testPath = path.join(downloadDir, `${filename}.${ext}`)
        if (fs.existsSync(testPath)) {
          outputFileExists = true
          outputFilePath = testPath
          console.log('找到输出文件:', testPath)
          break
        }
      }
      
      // 如果有分片校验错误但返回码为0且没有输出文件，说明合并失败，尝试用 ffmpeg 合并
      if (hasSegmentCheckError && code === 0 && !outputFileExists) {
        console.log('检测到分片校验失败且未生成视频文件，尝试使用 ffmpeg 合并...')
        
        // 通知用户正在合并
        onProgress({
          taskId: task.id,
          progress: 99,
          speed: '',
          eta: '',
          size: '',
          status: 'merging',
          output: '分片下载完成，正在使用 FFmpeg 合并...'
        })
        
        // 查找临时文件夹
        const tmpDir = path.join(downloadDir, '.download_cache')
        if (fs.existsSync(tmpDir)) {
          try {
            const folders = fs.readdirSync(tmpDir)
            let targetFolder = null
            let segmentsFolder = null
            
            // 查找匹配的临时文件夹
            for (const folder of folders) {
              if (folder.includes(filename) || folder.includes(task.title?.replace(/[<>:"/\\|?*]/g, '_'))) {
                targetFolder = path.join(tmpDir, folder)
                // 查找分片文件夹
                const subItems = fs.readdirSync(targetFolder)
                for (const sub of subItems) {
                  const subPath = path.join(targetFolder, sub)
                  if (fs.statSync(subPath).isDirectory() && sub.match(/^\d/)) {
                    segmentsFolder = subPath
                    break
                  }
                }
                if (segmentsFolder) break
              }
            }
            
            if (targetFolder && segmentsFolder && fs.existsSync(segmentsFolder)) {
              console.log('找到临时文件夹:', targetFolder)
              console.log('分片文件夹:', segmentsFolder)
              
              // 获取所有 .ts 或 .m4s 文件并排序
              const allFiles = fs.readdirSync(segmentsFolder)
              const tsFiles = allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.m4s'))
                .sort((a, b) => {
                  const numA = parseInt(a.replace(/\.(ts|m4s)$/, ''))
                  const numB = parseInt(b.replace(/\.(ts|m4s)$/, ''))
                  return numA - numB
                })
              
              if (tsFiles.length > 0) {
                console.log(`找到 ${tsFiles.length} 个分片文件，开始用 ffmpeg 合并`)
                
                // 创建 concat 列表
                const concatListPath = path.join(segmentsFolder, 'concat_list.txt')
                const concatContent = tsFiles.map(f => `file '${f}'`).join('\n')
                fs.writeFileSync(concatListPath, concatContent, 'ascii')
                
                // 输出文件路径
                const tempOutputName = `merged_${Date.now()}.mp4`
                const tempOutputPath = path.join(downloadDir, tempOutputName)
                const finalOutputPath = path.join(downloadDir, `${filename}.mp4`)
                
                // 使用 ffmpeg 合并
                const ffmpegArgs = [
                  '-f', 'concat',
                  '-safe', '0',
                  '-i', concatListPath,
                  '-c', 'copy',
                  '-y',
                  tempOutputPath
                ]
                
                console.log('ffmpeg 命令:', 'ffmpeg', ffmpegArgs.join(' '))
                
                const mergeProcess = spawn('ffmpeg', ffmpegArgs, { cwd: segmentsFolder })
                let mergeError = ''
                
                mergeProcess.stderr.on('data', (data) => {
                  console.log('ffmpeg:', data.toString())
                  mergeError += data.toString()
                })
                
                mergeProcess.on('close', (mergeCode) => {
                  console.log('ffmpeg 进程结束，返回码:', mergeCode)
                  
                  // 删除 concat 列表
                  try { fs.unlinkSync(concatListPath) } catch (e) {}
                  
                  if (mergeCode === 0 && fs.existsSync(tempOutputPath)) {
                    // 重命名为最终文件名
                    try {
                      if (fs.existsSync(finalOutputPath)) {
                        fs.unlinkSync(finalOutputPath)
                      }
                      fs.renameSync(tempOutputPath, finalOutputPath)
                      console.log('文件已重命名为:', finalOutputPath)
                    } catch (renameErr) {
                      console.error('重命名失败:', renameErr)
                    }
                    
                    // 删除临时文件夹
                    try {
                      fs.rmSync(targetFolder, { recursive: true, force: true })
                      console.log('已删除临时文件夹:', targetFolder)
                    } catch (e) {
                      console.error('删除临时文件夹失败:', e)
                    }
                    
                    // 添加到历史记录
                    const history = loadHistory()
                    history.unshift({
                      ...task,
                      downloadedAt: new Date().toISOString(),
                      outputPath: config.downloadPath
                    })
                    saveHistory(history.slice(0, 100))
                    
                    resolve({ success: true, taskId: task.id })
                  } else {
                    reject(new Error('FFmpeg 合并失败，请点击"手动合并"按钮重试'))
                  }
                })
                
                mergeProcess.on('error', (err) => {
                  console.error('ffmpeg 进程错误:', err)
                  reject(new Error('FFmpeg 未安装或无法运行: ' + err.message))
                })
                
                return // 等待合并完成
              }
            }
          } catch (e) {
            console.error('自动合并失败:', e)
          }
        }
        
        // 如果自动合并失败，提示用户使用手动合并按钮
        reject(new Error('分片下载完成但自动合并失败，请点击"手动合并"按钮'))
        return
      }
      
      // 如果返回码为 0 或者输出文件已存在，都视为成功
      if (code === 0 || outputFileExists) {
        // 添加到历史记录
        const history = loadHistory()
        history.unshift({
          ...task,
          downloadedAt: new Date().toISOString(),
          outputPath: config.downloadPath
        })
        saveHistory(history.slice(0, 100))
        
        // 如果有错误但文件存在，给出警告
        if (code !== 0 && outputFileExists) {
          console.log('下载过程有错误但视频文件已生成，视为成功')
        }
        
        resolve({ success: true, taskId: task.id })
      } else {
        reject(new Error(errorOutput || 'N_m3u8DL-RE 下载失败，错误码: ' + code))
      }
    })
    
    downloadProcess.on('error', (err) => {
      console.error('N_m3u8DL-RE process error:', err)
      reject(new Error(err.message || String(err)))
    })
    
    // 存储进程以便取消
    activeDownloads.set(task.id, () => {
      downloadProcess.kill('SIGTERM')
    })
  })
}

// 检查是否是 m3u8 URL
function isM3u8Url(url) {
  if (!url) return false
  const urlLower = url.toLowerCase()
  return urlLower.includes('.m3u8') || urlLower.includes('m3u8')
}

// 下载视频
function downloadVideo(task, onProgress) {
  const config = loadConfig()
  const matchedRule = findMatchingRule(task.url)
  
  return new Promise((resolve, reject) => {
    // 生成文件名
    let filename = config.namingTemplate
      .replace('{title}', task.title || 'video')
      .replace('{id}', task.id || '')
      .replace('{index}', String(task.index || 1).padStart(2, '0'))
      .replace('{uploader}', task.uploader || '')
      .replace('{date}', new Date().toISOString().split('T')[0])
      .replace('{ext}', '%(ext)s')
    
    // 清理非法字符
    filename = filename.replace(/[<>:"/\\|?*]/g, '_')
    
    const outputPath = path.join(config.downloadPath, filename)
    
    const args = [
      '-o', outputPath.includes('%(ext)s') ? outputPath : outputPath + '.%(ext)s',
      '--newline',
      '--progress',
      '--no-colors'
    ]

    // YouTube 需要 js-runtimes 来解密签名
    const isYouTube = task.url.includes('youtube.com') || task.url.includes('youtu.be')
    if (isYouTube) {
      args.push('--js-runtimes', 'node')
    }

    // 下载线程数
    if (config.downloadThreads && config.downloadThreads > 1) {
      args.push('-N', String(config.downloadThreads))
    }

    // 限速
    if (config.rateLimit) {
      args.push('-r', config.rateLimit)
    }

    // 格式选择
    const formatId = task.formatId
    const formatType = task.formatType || 'video'  // video, video-only, audio
    
    if (task.format === 'bestaudio' || formatType === 'audio') {
      // 仅音频 - 提取并转换
      args.push('-x')
      args.push('--audio-format', config.audioFormat || 'mp3')
      args.push('--audio-quality', config.audioQuality || '0')
    } else if (task.format && task.format.includes('[height<=')) {
      // 分辨率限制格式（来自播放列表）- 直接使用格式字符串
      args.push('-f', task.format)
    } else if (task.format === 'bestvideo' || formatType === 'video-only') {
      // 仅视频（不合并音频）
      if (formatId && /^\d+$/.test(formatId)) {
        // 使用具体的纯视频格式ID
        args.push('-f', formatId)
      } else {
        args.push('-f', 'bestvideo')
      }
    } else if (task.format === 'best' || formatType === 'video') {
      // 视频+音频 - 合并最佳视频和音频
      if (formatId && /^\d+$/.test(formatId)) {
        // 使用具体的格式ID + 最佳音频
        args.push('-f', `${formatId}+bestaudio/best`)
      } else if (task.format && task.format.includes('+')) {
        // 已经是组合格式字符串
        args.push('-f', task.format)
      } else {
        args.push('-f', 'bestvideo+bestaudio/best')
      }
    } else if (formatId) {
      // 其他情况：具体的 format_id
      if (/^\d+$/.test(formatId)) {
        args.push('-f', `${formatId}+bestaudio/best`)
      } else {
        args.push('-f', formatId)
      }
    } else {
      // 默认：最佳质量
      args.push('-f', 'bestvideo+bestaudio/best')
    }

    // 字幕
    if (config.downloadSubtitles) {
      args.push('--write-subs')
      args.push('--sub-lang', config.subtitleLang || 'zh,en')
      if (config.embedSubtitles) {
        args.push('--embed-subs')
      }
    }

    // 嵌入封面
    if (config.embedThumbnail) {
      args.push('--embed-thumbnail')
    }

    // 保存封面
    if (config.writeThumbnail) {
      args.push('--write-thumbnail')
    }

    // 保存描述
    if (config.writeDescription) {
      args.push('--write-description')
    }

    // 代理
    if (config.proxy) {
      args.push('--proxy', config.proxy)
    }

    // Cookie
    if (config.cookieFile && fs.existsSync(config.cookieFile)) {
      args.push('--cookies', config.cookieFile)
    } else if (config.cookiesFromBrowser && config.cookiesFromBrowser !== 'none') {
      args.push('--cookies-from-browser', config.cookiesFromBrowser)
    }

    // Bilibili 特殊处理
    const isBilibili = task.url.includes('bilibili.com') || task.url.includes('b23.tv')
    if (isBilibili) {
      args.push('--no-check-certificate')
    }

    // 应用匹配规则中的请求头
    if (matchedRule && matchedRule.headers) {
      try {
        const headers = JSON.parse(matchedRule.headers)
        Object.entries(headers).forEach(([key, value]) => {
          args.push('--add-header', `${key}:${value}`)
        })
        console.log('下载应用规则请求头:', matchedRule.name, '->', headers)
      } catch (e) {
        console.error('解析规则请求头失败:', e)
      }
    }

    // 应用匹配规则中的自定义 yt-dlp 参数
    if (matchedRule && matchedRule.ytdlpArgs) {
      const ruleArgsArray = matchedRule.ytdlpArgs.split(/\s+/).filter(arg => arg.trim())
      args.push(...ruleArgsArray)
      console.log('下载应用规则参数:', matchedRule.name, '->', matchedRule.ytdlpArgs)
    }

    // 全局自定义参数
    if (config.customArgs) {
      const customArgsArray = config.customArgs.split(/\s+/).filter(arg => arg.trim())
      args.push(...customArgsArray)
    }

    args.push(task.url)

    console.log('yt-dlp args:', args.join(' '))

    const downloadProcess = spawn(ytdlpPath, args)
    let lastProgress = 0
    let errorOutput = ''

    // 解析下载信息（进度、速度、ETA）
    const parseDownloadInfo = (output) => {
      const info = { progress: null, speed: '', eta: '', size: '' }
      
      // 解析进度 [download]  45.2% of 21.53MiB at 5.50MiB/s ETA 00:02
      const progressMatch = output.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        info.progress = parseFloat(progressMatch[1])
      }
      
      // 解析速度
      const speedMatch = output.match(/at\s+([\d.]+\s*[KMGT]?i?B\/s)/i)
      if (speedMatch) {
        info.speed = speedMatch[1]
      }
      
      // 解析ETA
      const etaMatch = output.match(/ETA\s+([\d:]+|Unknown)/i)
      if (etaMatch) {
        info.eta = etaMatch[1]
      }
      
      // 解析文件大小
      const sizeMatch = output.match(/of\s+([\d.]+\s*[KMGT]?i?B)/i)
      if (sizeMatch) {
        info.size = sizeMatch[1]
      }
      
      return info
    }

    downloadProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('stdout:', output)
      
      const info = parseDownloadInfo(output)
      if (info.progress !== null && info.progress !== lastProgress) {
        lastProgress = info.progress
        onProgress({
          taskId: task.id,
          progress: info.progress,
          speed: info.speed,
          eta: info.eta,
          size: info.size,
          status: 'downloading',
          output: output.trim()
        })
      }
    })

    downloadProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.log('stderr:', output)
      errorOutput += output
      
      const info = parseDownloadInfo(output)
      if (info.progress !== null && info.progress !== lastProgress) {
        lastProgress = info.progress
        onProgress({
          taskId: task.id,
          progress: info.progress,
          speed: info.speed,
          eta: info.eta,
          size: info.size,
          status: 'downloading',
          output: output.trim()
        })
      }
    })

    downloadProcess.on('close', (code) => {
      console.log('Download process closed with code:', code)
      if (code === 0) {
        // 添加到历史记录
        const history = loadHistory()
        history.unshift({
          ...task,
          downloadedAt: new Date().toISOString(),
          outputPath: config.downloadPath
        })
        // 只保留最近100条
        saveHistory(history.slice(0, 100))
        
        resolve({ success: true, taskId: task.id })
      } else {
        reject(new Error(errorOutput || '下载失败，错误码: ' + code))
      }
    })

    downloadProcess.on('error', (err) => {
      console.error('Download process error:', err)
      reject(new Error(err.message || String(err)))
    })

    // 存储进程以便取消
    activeDownloads.set(task.id, () => {
      downloadProcess.kill('SIGTERM')
    })
  })
}

// 活动下载任务
const activeDownloads = new Map()

// 判断是否为可重试的错误
function isRetryableError(errorMessage) {
  const retryablePatterns = [
    /timed?\s*out/i,
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /network/i,
    /connection/i,
    /Unable to download/i,
    /HTTP Error 5\d{2}/i,  // 5xx 服务器错误
    /HTTP Error 429/i,     // Too Many Requests
    /read operation/i,
    /TransportError/i,
    /IncompleteRead/i,
    /RemoteDisconnected/i,
    /ConnectionError/i
  ]
  return retryablePatterns.some(pattern => pattern.test(errorMessage))
}

// 带重试的下载函数
async function downloadWithRetry(task, onProgress, maxRetries = 3, retryDelay = 3000) {
  let lastError = null
  
  // 检测是否是智能解析的 m3u8 URL，如果是则使用 N_m3u8DL-RE
  const useM3u8Downloader = task.isSmartParse && isM3u8Url(task.url)
  
  if (useM3u8Downloader) {
    console.log('检测到智能解析的 m3u8 URL，使用 N_m3u8DL-RE 下载')
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 如果不是第一次尝试，通知前端正在重试
      if (attempt > 1) {
        onProgress({
          taskId: task.id,
          status: 'retrying',
          retryCount: attempt,
          maxRetries: maxRetries,
          output: `重试中 (${attempt}/${maxRetries})...`
        })
        console.log(`重试下载 (${attempt}/${maxRetries}): ${task.title}`)
      }
      
      // 根据类型选择下载器
      const result = useM3u8Downloader 
        ? await downloadM3u8(task, onProgress)
        : await downloadVideo(task, onProgress)
      return result
    } catch (error) {
      lastError = error
      console.error(`下载失败 (尝试 ${attempt}/${maxRetries}):`, error.message)
      
      // 检查是否为可重试的错误
      if (!isRetryableError(error.message)) {
        console.log('非可重试错误，直接失败')
        throw error
      }
      
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries) {
        // 递增延迟：3s, 6s, 9s...
        const delay = retryDelay * attempt
        onProgress({
          taskId: task.id,
          status: 'waiting_retry',
          retryCount: attempt,
          maxRetries: maxRetries,
          output: `等待 ${delay / 1000} 秒后重试 (${attempt}/${maxRetries})...`
        })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // 所有重试都失败了
  throw lastError
}

// IPC 处理
app.whenReady().then(() => {
  createWindow()

  // 窗口控制
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow.close())

  // 检查 yt-dlp
  ipcMain.handle('ytdlp:check', checkYtdlp)

  // 解析视频
  ipcMain.handle('video:parse', async (_, url, enablePlaylist = true) => {
    try {
      return await parseVideoInfo(url, enablePlaylist)
    } catch (error) {
      // Error 对象不能通过 IPC 序列化，需要转换为普通对象
      throw new Error(error.message || String(error))
    }
  })

  // 智能解析（使用 Playwright 拦截网络请求）
  ipcMain.handle('video:smartParse', async (_, url, options = {}) => {
    try {
      return await smartParse(url, options)
    } catch (error) {
      throw new Error(error.message || String(error))
    }
  })

  // 检查 URL 是否应该使用智能解析（匹配域名白名单）
  ipcMain.handle('video:shouldUseSmartParse', async (_, url) => {
    return shouldUseSmartParse(url)
  })

  // 获取格式
  ipcMain.handle('video:formats', async (_, url) => {
    try {
      return await getFormats(url)
    } catch (error) {
      // Error 对象不能通过 IPC 序列化，需要转换为普通对象
      throw new Error(error.message || String(error))
    }
  })

  // 开始下载
  ipcMain.handle('download:start', async (event, task) => {
    const config = loadConfig()
    const maxRetries = config.downloadRetries || 3  // 从配置读取重试次数，默认3次
    const retryDelay = config.retryDelay || 3000    // 重试延迟，默认3秒
    
    try {
      await downloadWithRetry(task, (progress) => {
        mainWindow.webContents.send('download:progress', progress)
      }, maxRetries, retryDelay)
      return { success: true }
    } catch (error) {
      // Error 对象不能通过 IPC 序列化，需要转换为普通对象
      throw new Error(error.message || String(error))
    }
  })

  // 取消下载
  ipcMain.handle('download:cancel', async (_, taskId, taskTitle) => {
    const downloadInfo = activeDownloads.get(taskId)
    if (downloadInfo) {
      // 终止下载进程
      if (typeof downloadInfo === 'function') {
        downloadInfo()
      } else if (downloadInfo.kill) {
        downloadInfo.kill()
      }
      activeDownloads.delete(taskId)
      
      // 尝试删除临时文件（包括分片文件）
      if (taskTitle) {
        try {
          const config = loadConfig()
          const cleanTitle = taskTitle.replace(/[<>:"/\\|?*]/g, '_')
          const downloadPath = config.downloadPath
          const files = fs.readdirSync(downloadPath)
          
          // 匹配各种临时文件格式：
          // - .part (未完成的下载)
          // - .part-Frag1, .part-Frag2 等 (多线程分片)
          // - .ytdl (yt-dlp 临时文件)
          // - .temp (临时文件)
          // - .f*.mp4.part 等 (格式特定的临时文件)
          const tempFilePattern = /\.(part|part-Frag\d+|ytdl|temp)$/i
          
          let deletedCount = 0
          for (const file of files) {
            if (file.includes(cleanTitle) && tempFilePattern.test(file)) {
              const fullPath = path.join(downloadPath, file)
              try {
                fs.unlinkSync(fullPath)
                console.log('已删除临时文件:', fullPath)
                deletedCount++
              } catch (e) {
                console.error('删除临时文件失败:', fullPath, e)
              }
            }
          }
          console.log(`共删除 ${deletedCount} 个临时文件`)
        } catch (e) {
          console.error('清理临时文件失败:', e)
        }
      }
    }
    return { success: true }
  })

  // 配置相关
  ipcMain.handle('config:get', () => loadConfig())
  ipcMain.handle('config:save', (_, config) => saveConfig(config))

  // 历史记录
  ipcMain.handle('history:get', () => loadHistory())
  ipcMain.handle('history:save', (_, history) => saveHistory(history))
  ipcMain.handle('history:clear', () => saveHistory([]))

  // 自定义规则
  ipcMain.handle('rules:get', () => loadCustomRules())
  ipcMain.handle('rules:save', (_, rules) => saveCustomRules(rules))

  // 选择目录
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 选择文件
  ipcMain.handle('dialog:selectFile', async (_, filters) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 打开目录
  ipcMain.handle('shell:openPath', (_, path) => {
    shell.openPath(path)
  })

  // 打开外部链接
  ipcMain.handle('shell:openExternal', (_, url) => {
    shell.openExternal(url)
  })

  // 检查文件是否存在
  ipcMain.handle('file:checkExists', async (_, task) => {
    const config = loadConfig()
    
    // 生成文件名（与 downloadVideo 相同逻辑）
    let filename = config.namingTemplate
      .replace('{title}', task.title || 'video')
      .replace('{id}', task.id || '')
      .replace('{index}', String(task.index || 1).padStart(2, '0'))
      .replace('{uploader}', task.uploader || '')
      .replace('{date}', new Date().toISOString().split('T')[0])
    
    // 清理非法字符
    filename = filename.replace(/[<>:"/\\|?*]/g, '_')
    
    // 检查常见扩展名
    const extensions = ['mp4', 'mkv', 'webm', 'mp3', 'm4a', 'flv', 'avi']
    const downloadPath = config.downloadPath
    
    for (const ext of extensions) {
      const fullPath = path.join(downloadPath, `${filename}.${ext}`)
      if (fs.existsSync(fullPath)) {
        return {
          exists: true,
          filename: `${filename}.${ext}`,
          fullPath: fullPath
        }
      }
    }
    
    return { exists: false, filename }
  })

  // 删除文件（用于覆盖下载）
  ipcMain.handle('file:delete', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 获取下载文件的完整路径
  ipcMain.handle('file:getDownloadedPath', async (_, task) => {
    const config = loadConfig()
    
    let filename = config.namingTemplate
      .replace('{title}', task.title || 'video')
      .replace('{id}', task.id || '')
      .replace('{index}', String(task.index || 1).padStart(2, '0'))
      .replace('{uploader}', task.uploader || '')
      .replace('{date}', new Date().toISOString().split('T')[0])
    
    filename = filename.replace(/[<>:"/\\|?*]/g, '_')
    
    const extensions = ['mp4', 'mkv', 'webm', 'mp3', 'm4a', 'flv', 'avi', 'mov']
    const downloadPath = config.downloadPath
    
    // 首先尝试精确匹配
    for (const ext of extensions) {
      const fullPath = path.join(downloadPath, `${filename}.${ext}`)
      if (fs.existsSync(fullPath)) {
        return { found: true, path: fullPath }
      }
    }
    
    // 如果精确匹配失败，尝试模糊匹配（文件名可能包含时间戳后缀）
    try {
      const files = fs.readdirSync(downloadPath)
      // 按修改时间排序，最新的在前
      const sortedFiles = files
        .map(f => ({
          name: f,
          path: path.join(downloadPath, f),
          mtime: fs.statSync(path.join(downloadPath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime)
      
      // 查找包含标题的文件
      const titleBase = (task.title || 'video').replace(/[<>:"/\\|?*]/g, '_')
      for (const file of sortedFiles) {
        if (file.name.includes(titleBase) && extensions.some(ext => file.name.endsWith(`.${ext}`))) {
          return { found: true, path: file.path }
        }
      }
      
      // 如果标题匹配失败，返回最近下载的视频文件
      for (const file of sortedFiles) {
        if (extensions.some(ext => file.name.endsWith(`.${ext}`))) {
          return { found: true, path: file.path }
        }
      }
    } catch (e) {
      console.error('搜索下载文件失败:', e)
    }
    
    return { found: false, path: downloadPath }
  })

  // 使用默认应用打开文件
  ipcMain.handle('shell:openFile', async (_, filePath) => {
    console.log('尝试打开文件:', filePath)
    try {
      if (!fs.existsSync(filePath)) {
        console.error('文件不存在:', filePath)
        return { success: false, error: '文件不存在: ' + filePath }
      }
      const result = await shell.openPath(filePath)
      if (result) {
        // shell.openPath 返回错误字符串时表示失败
        console.error('打开文件失败:', result)
        return { success: false, error: result }
      }
      console.log('文件打开成功')
      return { success: true }
    } catch (error) {
      console.error('打开文件异常:', error)
      return { success: false, error: error.message }
    }
  })

  // 按标题精确匹配删除下载目录中的视频文件和临时文件
  ipcMain.handle('file:deleteByTitle', async (_, title) => {
    const config = loadConfig()
    const downloadPath = config.downloadPath
    const deletedFiles = []
    
    if (!title) {
      return { deleted: false, deletedFiles: [], error: '标题为空' }
    }
    
    // 清理标题中的非法字符（与下载时的处理保持一致）
    const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '_')
    
    // 支持的视频/音频扩展名
    const extensions = ['mp4', 'mkv', 'webm', 'mp3', 'm4a', 'flv', 'avi', 'mov', 'opus', 'aac', 'wav', 'flac']
    
    // 临时文件模式
    const tempFilePattern = /\.(part|part-Frag\d+|ytdl|temp)$/i
    
    try {
      if (!fs.existsSync(downloadPath)) {
        return { deleted: false, deletedFiles: [], error: '下载目录不存在' }
      }
      
      const files = fs.readdirSync(downloadPath)
      
      for (const file of files) {
        // 检查文件名是否包含标题
        if (!file.includes(cleanTitle)) continue
        
        const fullPath = path.join(downloadPath, file)
        
        // 检查是否是临时文件
        if (tempFilePattern.test(file)) {
          try {
            fs.unlinkSync(fullPath)
            deletedFiles.push(file)
            console.log('已删除临时文件:', fullPath)
          } catch (e) {
            console.error('删除临时文件失败:', fullPath, e)
          }
          continue
        }
        
        // 检查是否是视频/音频文件
        const ext = path.extname(file).toLowerCase().slice(1)
        const basename = path.basename(file, path.extname(file))
        
        // 检查扩展名是否是支持的类型
        if (!extensions.includes(ext)) continue
        
        // 精确匹配文件名（包括可能的时间戳后缀）
        // 匹配规则：完全匹配标题，或者 标题_时间戳 格式
        if (basename === cleanTitle || basename.match(new RegExp(`^${escapeRegExp(cleanTitle)}_\\d+$`))) {
          try {
            fs.unlinkSync(fullPath)
            deletedFiles.push(file)
            console.log('已删除文件:', fullPath)
          } catch (e) {
            console.error('删除文件失败:', fullPath, e)
          }
        }
      }
      
      return { 
        deleted: deletedFiles.length > 0, 
        deletedFiles 
      }
    } catch (error) {
      console.error('删除文件异常:', error)
      return { deleted: false, deletedFiles: [], error: error.message }
    }
  })

  // 手动合并 m3u8 下载的临时文件（使用 ffmpeg）
  ipcMain.handle('m3u8:merge', async (_, taskTitle, saveName) => {
    const config = loadConfig()
    const downloadPath = config.downloadPath
    
    if (!taskTitle) {
      return { success: false, error: '任务标题为空' }
    }
    
    // 清理标题中的非法字符
    const cleanTitle = taskTitle.replace(/[<>:"/\\|?*]/g, '_').trim()
    // 保存文件名（如果提供的话）
    const finalName = saveName ? saveName.replace(/[<>:"/\\|?*]/g, '_').trim() : cleanTitle
    
    // 临时文件目录
    const tmpDir = path.join(downloadPath, '.download_cache')
    
    console.log('尝试合并视频:', cleanTitle)
    console.log('保存文件名:', finalName)
    console.log('临时目录:', tmpDir)
    
    if (!fs.existsSync(tmpDir)) {
      return { success: false, error: '临时文件目录不存在，可能已被清理' }
    }
    
    // 查找匹配的临时文件夹
    let targetFolder = null
    let segmentsFolder = null
    
    try {
      const folders = fs.readdirSync(tmpDir)
      for (const folder of folders) {
        // 模糊匹配文件夹名
        if (folder.includes(cleanTitle) || cleanTitle.includes(folder.substring(0, 20))) {
          targetFolder = path.join(tmpDir, folder)
          // 分片文件夹通常是 0____ 这样的命名
          const subItems = fs.readdirSync(targetFolder)
          for (const sub of subItems) {
            const subPath = path.join(targetFolder, sub)
            if (fs.statSync(subPath).isDirectory() && sub.match(/^\d/)) {
              segmentsFolder = subPath
              break
            }
          }
          if (segmentsFolder) break
        }
      }
      
      if (!targetFolder) {
        // 尝试列出所有可用的文件夹
        const availableFolders = folders.join(', ')
        return { success: false, error: `未找到匹配的临时文件夹。可用文件夹: ${availableFolders}` }
      }
      
      if (!segmentsFolder) {
        return { success: false, error: '未找到分片文件夹' }
      }
      
      console.log('找到临时文件夹:', targetFolder)
      console.log('分片文件夹:', segmentsFolder)
      
      // 获取所有 .ts 或 .m4s 文件并按数字排序
      const allFiles = fs.readdirSync(segmentsFolder)
      const tsFiles = allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.m4s'))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\.(ts|m4s)$/, ''))
          const numB = parseInt(b.replace(/\.(ts|m4s)$/, ''))
          return numA - numB
        })
      
      if (tsFiles.length === 0) {
        return { success: false, error: '未找到 .ts 或 .m4s 分片文件' }
      }
      
      console.log(`找到 ${tsFiles.length} 个分片文件`)
      
      // 在分片目录中创建 concat 列表（避免路径编码问题）
      const concatListPath = path.join(segmentsFolder, 'concat_list.txt')
      // 使用相对文件名
      const concatContent = tsFiles.map(f => `file '${f}'`).join('\n')
      fs.writeFileSync(concatListPath, concatContent, 'ascii')
      
      console.log('创建 concat 列表:', concatListPath)
      
      // 输出文件路径 - 使用临时英文名避免编码问题
      const tempOutputName = `merged_${Date.now()}.mp4`
      const tempOutputPath = path.join(downloadPath, tempOutputName)
      const finalOutputPath = path.join(downloadPath, `${finalName}.mp4`)
      
      // 使用 ffmpeg 合并
      return new Promise((resolve) => {
        const ffmpegArgs = [
          '-f', 'concat',
          '-safe', '0',
          '-i', concatListPath,
          '-c', 'copy',
          '-y',  // 覆盖已存在的文件
          tempOutputPath
        ]
        
        console.log('ffmpeg 命令:', 'ffmpeg', ffmpegArgs.join(' '))
        
        const mergeProcess = spawn('ffmpeg', ffmpegArgs, { cwd: segmentsFolder })
        let mergeOutput = ''
        let mergeError = ''
        
        mergeProcess.stdout.on('data', (data) => {
          const output = data.toString()
          console.log('ffmpeg stdout:', output)
          mergeOutput += output
        })
        
        mergeProcess.stderr.on('data', (data) => {
          const output = data.toString()
          console.log('ffmpeg stderr:', output)
          mergeError += output
        })
        
        mergeProcess.on('close', (code) => {
          console.log('ffmpeg 进程结束，返回码:', code)
          
          // 删除临时的 concat 列表文件
          try {
            fs.unlinkSync(concatListPath)
          } catch (e) {}
          
          if (code === 0 && fs.existsSync(tempOutputPath)) {
            // 重命名为最终文件名
            try {
              // 如果目标文件已存在，先删除
              if (fs.existsSync(finalOutputPath)) {
                fs.unlinkSync(finalOutputPath)
              }
              fs.renameSync(tempOutputPath, finalOutputPath)
              console.log('文件已重命名为:', finalOutputPath)
            } catch (renameErr) {
              console.error('重命名失败，保留临时文件名:', renameErr)
              // 如果重命名失败，使用临时文件名
              resolve({ 
                success: true, 
                message: `合并成功！共合并 ${tsFiles.length} 个分片（文件名使用临时名称）`,
                outputPath: tempOutputPath
              })
              return
            }
            
            // 删除临时文件夹
            try {
              fs.rmSync(targetFolder, { recursive: true, force: true })
              console.log('已删除临时文件夹:', targetFolder)
            } catch (e) {
              console.error('删除临时文件夹失败:', e)
            }
            
            resolve({ 
              success: true, 
              message: `合并成功！共合并 ${tsFiles.length} 个分片，临时文件已清理`,
              outputPath: finalOutputPath
            })
          } else {
            resolve({ 
              success: false, 
              error: '合并失败: ' + (mergeError || mergeOutput || '未知错误')
            })
          }
        })
        
        mergeProcess.on('error', (err) => {
          console.error('ffmpeg 进程错误:', err)
          resolve({ success: false, error: 'ffmpeg 未安装或无法运行: ' + err.message })
        })
      })
      
    } catch (error) {
      console.error('合并失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 列出可以重试/续传的任务
  ipcMain.handle('m3u8:listResumable', async () => {
    const config = loadConfig()
    const downloadPath = config.downloadPath
    const tmpDir = path.join(downloadPath, '.download_cache')
    
    if (!fs.existsSync(tmpDir)) {
      return []
    }
    
    try {
      const folders = fs.readdirSync(tmpDir)
      const resumable = []
      
      for (const folder of folders) {
        const folderPath = path.join(tmpDir, folder)
        const stat = fs.statSync(folderPath)
        
        if (stat.isDirectory()) {
          // 检查文件夹中是否有 .ts 或 .m4s 片段文件
          const files = fs.readdirSync(folderPath)
          const hasSegments = files.some(f => f.endsWith('.ts') || f.endsWith('.m4s') || f.endsWith('.mp4'))
          
          if (hasSegments) {
            resumable.push({
              name: folder,
              path: folderPath,
              modifiedAt: stat.mtime,
              fileCount: files.length
            })
          }
        }
      }
      
      return resumable.sort((a, b) => b.modifiedAt - a.modifiedAt)
    } catch (error) {
      console.error('列出可续传任务失败:', error)
      return []
    }
  })
})

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
