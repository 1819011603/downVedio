const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn, exec } = require('child_process')
const fs = require('fs')
const os = require('os')

let mainWindow
let ytdlpPath = 'yt-dlp' // 默认使用系统PATH中的yt-dlp

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
  customArgs: ''                // 自定义参数
}

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    }
  } catch (e) {
    console.error('Load config error:', e)
  }
  return defaultConfig
}

// 保存配置
function saveConfig(config) {
  try {
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

// 根据 URL 查找匹配的自定义规则
function findMatchingRule(url) {
  const rules = loadCustomRules()
  for (const rule of rules) {
    if (!rule.enabled) continue
    try {
      // 尝试匹配 URL 模式
      if (rule.urlPattern) {
        const regex = new RegExp(rule.urlPattern, 'i')
        if (regex.test(url)) {
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

    // 添加 cookie
    if (config.cookieFile && fs.existsSync(config.cookieFile)) {
      args.push('--cookies', config.cookieFile)
    } else if (config.cookiesFromBrowser && config.cookiesFromBrowser !== 'none') {
      args.push('--cookies-from-browser', config.cookiesFromBrowser)
    }

    // 应用匹配规则中的自定义 yt-dlp 参数
    if (matchedRule && matchedRule.ytdlpArgs) {
      const ruleArgsArray = matchedRule.ytdlpArgs.split(/\s+/).filter(arg => arg.trim())
      args.push(...ruleArgsArray)
      console.log('应用规则参数:', matchedRule.name, '->', matchedRule.ytdlpArgs)
    }

    // 全局自定义参数
    if (config.customArgs) {
      const customArgsArray = config.customArgs.split(/\s+/).filter(arg => arg.trim())
      args.push(...customArgsArray)
    }

    args.push(url)

    console.log('Parse args:', args.join(' '))

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
      
      // 尝试删除 .part 临时文件
      if (taskTitle) {
        try {
          const config = loadConfig()
          const cleanTitle = taskTitle.replace(/[<>:"/\\|?*]/g, '_')
          const downloadPath = config.downloadPath
          const files = fs.readdirSync(downloadPath)
          
          for (const file of files) {
            // 匹配 .part 文件和相关临时文件
            if (file.includes(cleanTitle) && (file.endsWith('.part') || file.endsWith('.ytdl') || file.endsWith('.temp'))) {
              const fullPath = path.join(downloadPath, file)
              try {
                fs.unlinkSync(fullPath)
                console.log('已删除临时文件:', fullPath)
              } catch (e) {
                console.error('删除临时文件失败:', fullPath, e)
              }
            }
          }
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

  // 按标题精确匹配删除下载目录中的视频文件
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
    
    try {
      if (!fs.existsSync(downloadPath)) {
        return { deleted: false, deletedFiles: [], error: '下载目录不存在' }
      }
      
      const files = fs.readdirSync(downloadPath)
      
      for (const file of files) {
        // 获取文件名（不含扩展名）
        const ext = path.extname(file).toLowerCase().slice(1)
        const basename = path.basename(file, path.extname(file))
        
        // 检查扩展名是否是支持的类型
        if (!extensions.includes(ext)) continue
        
        // 精确匹配文件名（包括可能的时间戳后缀）
        // 匹配规则：完全匹配标题，或者 标题_时间戳 格式
        if (basename === cleanTitle || basename.match(new RegExp(`^${escapeRegExp(cleanTitle)}_\\d+$`))) {
          const fullPath = path.join(downloadPath, file)
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
