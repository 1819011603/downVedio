const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn, exec } = require('child_process')
const fs = require('fs')
const os = require('os')

let mainWindow
let ytdlpPath = 'yt-dlp' // 默认使用系统PATH中的yt-dlp

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
  smartParseDomains: []         // 例如: ['example.com', 'video.site.com']
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
  let pageTitle = ''
  let pageThumbnail = ''
  
  // 视频流 URL 匹配模式
  const videoPatterns = [
    /\.m3u8(\?|$|#)/i,
    /\.mpd(\?|$|#)/i,
    /\.mp4(\?|$|#)/i,
    /\.flv(\?|$|#)/i,
    /\.ts(\?|$|#)/i,
    /\.m4s(\?|$|#)/i,
    /\.webm(\?|$|#)/i,
    /\.mkv(\?|$|#)/i,
    /\.avi(\?|$|#)/i,
    /\.mov(\?|$|#)/i,
    /video.*\.m3u8/i,
    /playlist.*\.m3u8/i,
    /manifest.*\.mpd/i,
    /stream.*\.(mp4|flv|m3u8)/i,
    /\/video\//i,           // URL 路径包含 /video/
    /\/play\//i,            // URL 路径包含 /play/
    /\/media\//i,           // URL 路径包含 /media/
    /\/hls\//i,             // HLS 流
    /\/dash\//i,            // DASH 流
    /videoplayback/i,       // YouTube 等
    /googlevideo\.com/i,    // Google 视频
    /\.akamaized\.net.*video/i,  // Akamai CDN 视频
    /cloudfront.*video/i,   // CloudFront CDN 视频
    /\.cdn.*\.(mp4|m3u8|ts)/i,  // 通用 CDN
  ]

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
        smartParseWindow.close()
        smartParseWindow = null
      }
    }

    // 完成解析
    const finishParse = () => {
      if (resolved) return
      resolved = true
      
      console.log('捕获到的视频 URL 数量:', capturedUrls.length)
      console.log('========== 智能解析结束 ==========')

      // 优先返回 m3u8 和 mpd
      const sortedUrls = [...new Set(capturedUrls)].sort((a, b) => {
        const aScore = a.includes('.m3u8') ? 3 : a.includes('.mpd') ? 2 : a.includes('.mp4') ? 1 : 0
        const bScore = b.includes('.m3u8') ? 3 : b.includes('.mpd') ? 2 : b.includes('.mp4') ? 1 : 0
        return bScore - aScore
      })

      cleanup()
      resolve({
        success: sortedUrls.length > 0,
        title: pageTitle || '未知标题',
        thumbnail: pageThumbnail,
        videoUrls: sortedUrls,
        bestUrl: sortedUrls[0] || null
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

    // 监听响应头（检查 Content-Type）
    session.webRequest.onHeadersReceived((details, callback) => {
      const reqUrl = details.url
      
      // 跳过已处理的 URL
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:')) {
        callback({ cancel: false })
        return
      }
      
      const contentType = details.responseHeaders?.['content-type']?.[0] || 
                          details.responseHeaders?.['Content-Type']?.[0] || ''
      
      // 通过 Content-Type 检测视频
      const isVideoContentType = 
        contentType.includes('mpegurl') ||           // m3u8
        contentType.includes('dash+xml') ||          // mpd
        contentType.includes('video/') ||            // video/*
        contentType.includes('application/octet-stream') ||  // 二进制流（可能是视频）
        contentType.includes('binary/octet-stream')
      
      if (isVideoContentType && !capturedUrls.includes(reqUrl)) {
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
          if (mainWindow) {
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

      // 尝试从页面提取视频 URL
      const extractVideoFromPage = async () => {
        try {
          const pageVideoUrls = await smartParseWindow.webContents.executeJavaScript(`
            (function() {
              const urls = [];
              
              // 1. 从 video 标签提取
              document.querySelectorAll('video').forEach(video => {
                if (video.src && !video.src.startsWith('blob:')) {
                  urls.push(video.src);
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
                      iframeDoc.querySelectorAll('video').forEach(video => {
                        if (video.src && !video.src.startsWith('blob:')) {
                          urls.push(video.src);
                        }
                      });
                    }
                  } catch(e) {}
                });
              } catch(e) {}
              
              // 3. 从页面中查找可能的视频 URL
              const scripts = document.querySelectorAll('script');
              const urlPattern = /(https?:\\/\\/[^"'\\s]+\\.(m3u8|mpd|mp4|flv)[^"'\\s]*)/gi;
              scripts.forEach(script => {
                const matches = script.textContent.match(urlPattern);
                if (matches) {
                  urls.push(...matches);
                }
              });
              
              // 4. 从 data 属性查找
              document.querySelectorAll('[data-src], [data-video], [data-url]').forEach(el => {
                const src = el.dataset.src || el.dataset.video || el.dataset.url;
                if (src && (src.includes('.m3u8') || src.includes('.mpd') || src.includes('.mp4'))) {
                  urls.push(src);
                }
              });
              
              return [...new Set(urls)];
            })()
          `)
          
          if (pageVideoUrls && pageVideoUrls.length > 0) {
            console.log('从页面提取到视频 URL:', pageVideoUrls)
            for (const vUrl of pageVideoUrls) {
              if (!capturedUrls.includes(vUrl)) {
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
    smartParseWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      if (resolved) return
      console.error('页面加载失败:', errorCode, errorDescription)
      cleanup()
      reject(new Error(`页面加载失败: ${errorDescription}`))
    })

    // 超时处理
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.log('解析超时，返回已捕获的结果')
        finishParse()
      }
    }, timeout)

    // 加载页面
    smartParseWindow.loadURL(url).catch(err => {
      if (!resolved) {
        resolved = true
        cleanup()
        reject(new Error(`无法加载页面: ${err.message}`))
      }
    })
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
      
      const result = await downloadVideo(task, onProgress)
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
