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
  proxy: '',
  cookieFile: '',
  cookiesFromBrowser: 'none',   // 从浏览器获取 Cookie: none, chrome, firefox, edge, safari
  concurrentDownloads: 1,
  autoRetry: true,
  maxRetries: 3,
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
  noPlaylist: false,            // 不下载播放列表
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

// 解析视频信息
async function parseVideoInfo(url) {
  const config = loadConfig()
  
  return new Promise((resolve, reject) => {
    // 判断是否为播放列表URL
    const isPlaylistUrl = url.includes('list=') || url.includes('/playlist') || url.includes('channel')
    
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings'
    ]
    
    // 如果是播放列表，使用 flat-playlist 只获取基本信息
    // 否则获取完整信息包括格式列表
    if (isPlaylistUrl) {
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

    // 自定义参数
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
    if (task.format) {
      if (task.format === 'bestaudio') {
        // 仅音频 - 提取并转换
        args.push('-x')
        args.push('--audio-format', config.audioFormat || 'mp3')
        args.push('--audio-quality', config.audioQuality || '0')
      } else if (task.format === 'bestvideo') {
        // 仅视频（不合并音频）
        args.push('-f', 'bestvideo')
      } else if (task.format === 'best') {
        // 最佳质量 - 选择最高质量视频+音频
        // 使用 yt-dlp 默认排序逻辑选择最佳质量
        args.push('-f', 'bestvideo+bestaudio/best')
      } else {
        // 具体的 format_id - 检查是否为纯视频格式，如果是则自动合并最佳音频
        // format_id 通常是数字，如 30080, 100026 等
        if (/^\d+$/.test(task.format)) {
          // 数字格式ID，添加最佳音频合并
          args.push('-f', `${task.format}+bestaudio/best`)
        } else {
          args.push('-f', task.format)
        }
      }
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

    // 自定义参数
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
  ipcMain.handle('video:parse', async (_, url) => {
    try {
      return await parseVideoInfo(url)
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
    try {
      await downloadVideo(task, (progress) => {
        mainWindow.webContents.send('download:progress', progress)
      })
      return { success: true }
    } catch (error) {
      // Error 对象不能通过 IPC 序列化，需要转换为普通对象
      throw new Error(error.message || String(error))
    }
  })

  // 取消下载
  ipcMain.handle('download:cancel', async (_, taskId) => {
    const cancel = activeDownloads.get(taskId)
    if (cancel) {
      cancel()
      activeDownloads.delete(taskId)
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
})

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
