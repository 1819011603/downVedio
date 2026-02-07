import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

// 检查是否在 Electron 环境中
const isElectron = () => {
  return window.electronAPI !== undefined
}

// 安全调用 Electron API
const api = {
  checkYtdlp: () => isElectron() ? window.electronAPI.checkYtdlp() : Promise.resolve({ installed: false, version: null }),
  parseVideo: (url, enablePlaylist = true) => isElectron() ? window.electronAPI.parseVideo(url, enablePlaylist) : Promise.reject(new Error('请通过 Electron 启动应用')),
  smartParse: (url, options) => isElectron() ? window.electronAPI.smartParse(url, options) : Promise.reject(new Error('请通过 Electron 启动应用')),
  onSmartParseProgress: (callback) => isElectron() ? window.electronAPI.onSmartParseProgress(callback) : null,
  shouldUseSmartParse: (url) => isElectron() ? window.electronAPI.shouldUseSmartParse(url) : Promise.resolve(false),
  getFormats: (url) => isElectron() ? window.electronAPI.getFormats(url) : Promise.reject(new Error('请通过 Electron 启动应用')),
  startDownload: (task) => isElectron() ? window.electronAPI.startDownload(task) : Promise.reject(new Error('请通过 Electron 启动应用')),
  cancelDownload: (taskId, taskTitle) => isElectron() ? window.electronAPI.cancelDownload(taskId, taskTitle) : Promise.resolve(),
  getConfig: () => isElectron() ? window.electronAPI.getConfig() : Promise.resolve({
    downloadPath: '',
    namingTemplate: '{title}',
    defaultFormat: 'best',
    proxy: '',
    cookieFile: '',
    concurrentDownloads: 1,
    autoRetry: true,
    maxRetries: 3
  }),
  saveConfig: (config) => isElectron() ? window.electronAPI.saveConfig(config) : Promise.resolve(true),
  getHistory: () => isElectron() ? window.electronAPI.getHistory() : Promise.resolve([]),
  saveHistory: (history) => isElectron() ? window.electronAPI.saveHistory(history) : Promise.resolve(true),
  clearHistory: () => isElectron() ? window.electronAPI.clearHistory() : Promise.resolve(),
  getRules: () => isElectron() ? window.electronAPI.getRules() : Promise.resolve([]),
  saveRules: (rules) => isElectron() ? window.electronAPI.saveRules(rules) : Promise.resolve(true),
  selectFolder: () => isElectron() ? window.electronAPI.selectFolder() : Promise.resolve(null),
  selectFile: (filters) => isElectron() ? window.electronAPI.selectFile(filters) : Promise.resolve(null),
  openPath: (path) => isElectron() ? window.electronAPI.openPath(path) : null,
  openExternal: (url) => isElectron() ? window.electronAPI.openExternal(url) : window.open(url, '_blank'),
  onDownloadProgress: (callback) => isElectron() ? window.electronAPI.onDownloadProgress(callback) : null,
  checkFileExists: (task) => isElectron() ? window.electronAPI.checkFileExists(task) : Promise.resolve({ exists: false }),
  deleteFile: (filePath) => isElectron() ? window.electronAPI.deleteFile(filePath) : Promise.resolve({ success: true }),
  getDownloadedPath: (task) => isElectron() ? window.electronAPI.getDownloadedPath(task) : Promise.resolve({ found: false }),
  openFile: (filePath) => isElectron() ? window.electronAPI.openFile(filePath) : Promise.resolve({ success: false }),
  deleteVideoByTitle: (title) => isElectron() ? window.electronAPI.deleteVideoByTitle(title) : Promise.resolve({ deleted: false, deletedFiles: [] })
}

export const useAppStore = defineStore('app', () => {
  // 状态
  const ytdlpInstalled = ref(false)
  const ytdlpVersion = ref('')
  const isElectronEnv = ref(false)
  const config = ref({
    downloadPath: '',
    namingTemplate: '{title}',
    defaultFormat: 'best',
    enablePlaylist: true,  // 支持播放列表，默认开启
    proxy: '',
    cookieFile: '',
    cookiesFromBrowser: 'none',
    concurrentDownloads: 1,
    autoRetry: true,
    maxRetries: 3,
    downloadRetries: 3,  // 失败重试次数
    downloadThreads: 4,
    rateLimit: '',
    downloadSubtitles: false,
    subtitleLang: 'zh,en',
    embedSubtitles: false,
    embedThumbnail: false,
    writeThumbnail: false,
    writeDescription: false,
    audioFormat: 'mp3',
    audioQuality: '0',
    customArgs: '',
    smartParseDomains: [],  // 智能解析域名白名单
    smartParseFormats: ['m3u8'],  // 智能解析视频格式过滤
    autoRemoveCompleted: -1  // 完成后自动移除时间（秒），负数=不移除，0=立即移除
  })
  const history = ref([])
  const customRules = ref([])
  const toasts = ref([])
  
  // 下载队列
  const downloadQueue = ref([])
  const currentDownload = ref(null)
  
  // 解析结果持久化状态（切换页面后保留）
  const parsedResult = ref({
    url: '',
    videoInfo: null,
    isPlaylist: false,
    selectedFormat: 'best',
    formatType: 'video',
    selectedItems: []
  })
  
  // 文件存在弹窗状态（resolve 不再存储在响应式对象中）
  const fileExistsDialog = ref({
    visible: false,
    filename: '',
    fullPath: '',
    taskId: null
  })
  
  // 删除确认弹窗状态
  const deleteConfirmDialog = ref({
    visible: false,
    taskId: null,
    taskTitle: '',
    resolve: null
  })
  
  // 计算属性
  const queueCount = computed(() => downloadQueue.value.length)
  const activeCount = computed(() => 
    downloadQueue.value.filter(t => t.status === 'downloading').length
  )
  const pendingCount = computed(() => 
    downloadQueue.value.filter(t => t.status === 'pending').length
  )

  // 初始化
  async function init() {
    console.log('[Queue] ========== init() 开始执行 ==========')
    
    isElectronEnv.value = isElectron()
    console.log('[Queue] isElectronEnv:', isElectronEnv.value)
    
    if (!isElectronEnv.value) {
      showToast('请使用 npm run electron:dev 启动应用', 'warning')
      console.log('[Queue] 非 Electron 环境，退出 init()')
      return
    }
    
    try {
      console.log('[Queue] 开始检查 yt-dlp...')
      // 检查 yt-dlp
      const result = await api.checkYtdlp()
      ytdlpInstalled.value = result.installed
      ytdlpVersion.value = result.version
      console.log('[Queue] yt-dlp 检查完成:', result.installed)

      console.log('[Queue] 开始加载配置...')
      // 加载配置
      config.value = await api.getConfig()
      console.log('[Queue] 配置加载完成')

      console.log('[Queue] 开始加载历史记录...')
      // 加载历史记录
      history.value = await api.getHistory()
      console.log('[Queue] 历史记录加载完成')

      console.log('[Queue] 开始加载自定义规则...')
      // 加载自定义规则
      customRules.value = await api.getRules()
      console.log('[Queue] 自定义规则加载完成')

      console.log('[Queue] 开始监听下载进度...')
      // 监听下载进度
      api.onDownloadProgress((data) => {
        updateTaskProgress(data)
      })
      console.log('[Queue] 下载进度监听已设置')

      // 启动定期检查卡住任务的定时器（每3秒检查一次）
      console.log('[Queue] ========== 准备启动定时器 ==========')
      const timerId = setInterval(() => {
        console.log('[Queue] 定时检查运行中...', new Date().toLocaleTimeString())
        
        const preparingTasks = downloadQueue.value.filter(t => t.status === 'preparing')
        if (preparingTasks.length > 0) {
          console.log('[Queue] 发现', preparingTasks.length, '个 preparing 任务')
          console.log('[Queue] _preparingTasks:', Array.from(_preparingTasks.entries()))
          console.log('[Queue] _waitingForDialog:', _waitingForDialog ? _waitingForDialog.task.id : 'null')
          console.log('[Queue] _isProcessing:', _isProcessing)
        }
        
        _recoverStuckTasks()
      }, 3000)
      console.log('[Queue] ========== 定时器已启动，ID:', timerId, '==========')

      if (!result.installed) {
        showToast('未检测到 yt-dlp，请先安装', 'warning')
      }
      
      console.log('[Queue] ========== init() 执行完成 ==========')
    } catch (error) {
      console.error('[Queue] init() 执行出错:', error)
      showToast('初始化失败: ' + error.message, 'error')
    }
  }

  // 保存配置
  async function saveConfig(newConfig) {
    try {
      await api.saveConfig(newConfig)
      config.value = newConfig
      showToast('设置已保存', 'success')
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error')
    }
  }

  // 解析视频
  async function parseVideo(url, enablePlaylist = true) {
    if (!isElectronEnv.value) {
      throw new Error('请使用 npm run electron:dev 启动应用')
    }
    try {
      const result = await api.parseVideo(url, enablePlaylist)
      return result
    } catch (error) {
      throw error
    }
  }

  // 获取格式信息
  async function getFormats(url) {
    try {
      const result = await api.getFormats(url)
      return result
    } catch (error) {
      throw error
    }
  }

  // 添加到下载队列
  function addToQueue(tasks) {
    const tasksArray = Array.isArray(tasks) ? tasks : [tasks]
    
    tasksArray.forEach(task => {
      // 检查是否已在队列中
      const exists = downloadQueue.value.some(t => t.url === task.url)
      if (!exists) {
        downloadQueue.value.push({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          ...task,
          status: 'pending',
          progress: 0,
          addedAt: new Date().toISOString()
        })
      }
    })

    // 开始处理队列
    processQueue()
  }

  // ============================================================
  // 队列处理 - 每个任务独立检查，检查完立即启动
  // 流程：取一个任务 → 检查文件 → 弹窗（如需要）→ 启动下载 → 取下一个
  // ============================================================
  
  // 当前正在等待弹窗的任务（一次只能有一个）
  let _waitingForDialog = null  // { task, plainTask, checkResult }
  let _isProcessing = false      // 防止 processQueue 重入
  const _preparingTasks = new Map() // taskId -> timestamp，记录 preparing 状态的任务和时间
  
  // 处理下载队列入口
  function processQueue() {
    // 防止重入
    if (_isProcessing) {
      console.log('[Queue] processQueue 正在执行，跳过')
      return
    }
    
    // 如果有弹窗在等待用户操作，不处理新任务
    if (_waitingForDialog) {
      console.log('[Queue] 有弹窗在等待，跳过')
      return
    }
    
    // 检查是否有卡住的 preparing 任务（超过5秒）
    _recoverStuckTasks()
    
    _isProcessing = true
    
    try {
      // 计算当前正在下载和准备中的任务数
      const downloadingCount = downloadQueue.value.filter(t => 
        t.status === 'downloading'
      ).length
      const preparingCount = downloadQueue.value.filter(t => 
        t.status === 'preparing'
      ).length
      const activeCount = downloadingCount + preparingCount
      const availableSlots = config.value.concurrentDownloads - activeCount
      
      console.log('[Queue] downloading:', downloadingCount, 'preparing:', preparingCount, 'slots:', availableSlots)
      
      if (availableSlots <= 0) {
        _isProcessing = false
        return
      }
      
      // 获取待处理的任务（pending + 卡住的 preparing）
      const pendingTasks = downloadQueue.value.filter(t => t.status === 'pending')
      const stuckTasks = downloadQueue.value.filter(t => 
        t.status === 'preparing' && 
        _preparingTasks.has(t.id) &&
        Date.now() - _preparingTasks.get(t.id) > 5000
      )
      
      // 优先处理卡住的任务，然后是 pending 任务
      const nextTask = stuckTasks[0] || pendingTasks[0]
      
      if (!nextTask) {
        _isProcessing = false
        return
      }
      
      console.log('[Queue] 准备处理任务:', nextTask.title || nextTask.url)
      
      // 只将当前任务标记为 preparing
      if (nextTask.status !== 'preparing') {
        nextTask.status = 'preparing'
      }
      _preparingTasks.set(nextTask.id, Date.now())
      
      _isProcessing = false
      
      // 开始检查任务
      _checkAndStartTask(nextTask)
    } finally {
      // 注意：_isProcessing 在设置完状态后就重置了
    }
  }
  
  // 恢复卡住的任务（独立运行，不依赖 _isProcessing 和 _waitingForDialog）
  function _recoverStuckTasks() {
    const now = Date.now()
    
    // 查找所有 preparing 状态的任务
    const preparingTasks = downloadQueue.value.filter(t => t.status === 'preparing')
    
    if (preparingTasks.length === 0) return
    
    // 检查哪些任务卡住了（超过5秒，或者没有时间戳记录但状态是 preparing）
    const stuckTasks = preparingTasks.filter(task => {
      if (!_preparingTasks.has(task.id)) {
        // 没有时间戳记录，说明可能是在某个地方被标记为 preparing 但没有正确记录
        // 这种情况也视为卡住
        console.warn('[Queue] 发现没有时间戳记录的 preparing 任务:', task.id)
        return true
      }
      const elapsed = now - _preparingTasks.get(task.id)
      return elapsed > 5000
    })
    
    if (stuckTasks.length > 0) {
      console.warn('[Queue] 发现', stuckTasks.length, '个卡住的任务，强制恢复')
      
      for (const task of stuckTasks) {
        console.log('[Queue] 恢复任务:', task.id, task.title || task.url)
        
        // 如果这个任务正在等待弹窗，先清除弹窗状态
        if (_waitingForDialog && _waitingForDialog.task.id === task.id) {
          console.log('[Queue] 清除卡住的弹窗状态')
          _waitingForDialog = null
          fileExistsDialog.value = {
            visible: false,
            filename: '',
            fullPath: '',
            taskId: null
          }
        }
        
        // 重置处理标志（如果这个任务导致卡住）
        if (_isProcessing) {
          console.log('[Queue] 重置处理标志')
          _isProcessing = false
        }
        
        // 更新时间戳并重新检查文件
        _preparingTasks.set(task.id, Date.now())
        _checkAndStartTask(task)
      }
    }
  }
  
  // 检查文件并启动任务
  function _checkAndStartTask(task) {
    const plainTask = JSON.parse(JSON.stringify(toRaw(task)))
    
    console.log('[Queue] 检查文件:', task.title || task.url, 'taskId:', task.id)
    
    // 添加超时保护（10秒）
    const timeoutId = setTimeout(() => {
      console.error('[Queue] 检查文件超时:', task.id, task.title || task.url)
      // 超时后不清除 preparing 记录，让恢复机制处理
      _isProcessing = false
    }, 10000)
    
    api.checkFileExists(plainTask).then(checkResult => {
      clearTimeout(timeoutId)
      
      // 清除 preparing 记录
      _preparingTasks.delete(task.id)
      
      if (checkResult.exists) {
        // 文件存在，弹窗让用户选择
        console.log('[Queue] 文件已存在，弹窗:', checkResult.filename)
        _waitingForDialog = { task, plainTask, checkResult }
        fileExistsDialog.value = {
          visible: true,
          filename: checkResult.filename,
          fullPath: checkResult.fullPath,
          taskId: task.id
        }
        // 等待 handleFileExistsChoice 被调用，不继续
        _isProcessing = false
      } else {
        // 文件不存在，直接启动下载
        console.log('[Queue] 文件不存在，直接启动下载')
        _isProcessing = false
        _startDownload(task, plainTask)
        // 启动后立即检查下一个任务
        setTimeout(() => processQueue(), 0)
      }
    }).catch(error => {
      clearTimeout(timeoutId)
      console.error('[Queue] 检查文件失败:', error)
      // 清除 preparing 记录
      _preparingTasks.delete(task.id)
      // 出错也直接启动下载
      _isProcessing = false
      _startDownload(task, plainTask)
      setTimeout(() => processQueue(), 0)
    })
  }
  
  // 处理文件存在弹窗的选择（由 UI 回调调用）
  function handleFileExistsChoice(choice) {
    console.log('[Queue] 用户选择:', choice)
    
    // 关闭弹窗
    fileExistsDialog.value = {
      visible: false,
      filename: '',
      fullPath: '',
      taskId: null
    }
    
    const dialogData = _waitingForDialog
    _waitingForDialog = null
    
    if (!dialogData) {
      console.error('[Queue] handleFileExistsChoice: 没有等待中的任务!')
      _isProcessing = false
      return
    }
    
    const { task, plainTask, checkResult } = dialogData
    
    // 清除 preparing 记录
    _preparingTasks.delete(task.id)
    
    if (choice === 'cancel') {
      task.status = 'cancelled'
      task.error = '用户取消：文件已存在'
      console.log('[Queue] 任务已取消:', task.id)
      _isProcessing = false
      // 继续处理下一个任务
      setTimeout(() => processQueue(), 100)
      
    } else if (choice === 'overwrite') {
      // 先删除文件
      api.deleteFile(checkResult.fullPath).then(deleteResult => {
        _isProcessing = false
        if (deleteResult.success) {
          console.log('[Queue] 文件已删除，启动下载')
          _startDownload(task, plainTask)
          setTimeout(() => processQueue(), 0)
        } else {
          task.status = 'error'
          task.error = `无法删除已存在的文件: ${deleteResult.error}`
          console.log('[Queue] 删除文件失败')
          setTimeout(() => processQueue(), 100)
        }
      }).catch(err => {
        _isProcessing = false
        task.status = 'error'
        task.error = `删除文件失败: ${err.message}`
        setTimeout(() => processQueue(), 100)
      })
      
    } else if (choice === 'saveAs') {
      const timestamp = Date.now()
      task.title = `${task.title}_${timestamp}`
      const newPlainTask = JSON.parse(JSON.stringify(toRaw(task)))
      console.log('[Queue] 另存为，启动下载')
      _isProcessing = false
      _startDownload(task, newPlainTask)
      setTimeout(() => processQueue(), 0)
    }
  }
  
  // 启动单个任务的下载
  function _startDownload(task, plainTask) {
    // 清除 preparing 记录
    _preparingTasks.delete(task.id)
    
    // 再次确认任务状态
    if (task.status !== 'preparing') {
      console.log('[Queue] 任务', task.id, '状态已变化，跳过下载')
      return
    }
    
    task.status = 'downloading'
    task.progress = 0
    task.startTime = new Date().toISOString()
    
    console.log('[Queue] 启动下载:', task.title || task.url)
    
    api.startDownload(plainTask).then(() => {
      task.status = 'completed'
      task.progress = 100
      task.completedTime = new Date().toISOString()
      showToast(`下载完成: ${task.title}`, 'success')
      
      if (config.value.autoRemoveCompleted >= 0) {
        const delay = config.value.autoRemoveCompleted * 1000
        setTimeout(() => removeFromQueue(task.id, false), delay)
      }
      
      // 下载完成，尝试启动队列中的下一个任务
      processQueue()
    }).catch(error => {
      task.status = 'error'
      task.error = error.message || String(error)
      task.errorTime = new Date().toISOString()
      showToast(`下载失败: ${task.title}`, 'error')
      
      // 下载失败，也尝试启动下一个任务
      processQueue()
    })
  }

  // 更新任务进度
  function updateTaskProgress(data) {
    const task = downloadQueue.value.find(t => t.id === data.taskId)
    if (task) {
      // 处理进度
      if (data.progress !== undefined && data.progress !== null) {
        task.progress = data.progress
      }
      // 处理状态（重试状态保持为 downloading，但显示重试信息）
      if (data.status === 'retrying' || data.status === 'waiting_retry') {
        task.status = 'retrying'
        task.retryCount = data.retryCount
        task.maxRetries = data.maxRetries
      } else if (data.status) {
        task.status = data.status
        // 重新开始下载后清除重试信息
        if (data.status === 'downloading') {
          task.retryCount = undefined
          task.maxRetries = undefined
        }
      }
      if (data.output) task.output = data.output
      // 保存下载速度等信息
      if (data.speed) task.speed = data.speed
      if (data.eta) task.eta = data.eta
      if (data.size) task.downloadSize = data.size
    }
  }

  // 暂停任务
  async function pauseTask(taskId) {
    const task = downloadQueue.value.find(t => t.id === taskId)
    if (task && task.status === 'downloading') {
      await api.cancelDownload(taskId, task.title)
      task.status = 'paused'
    }
  }

  // 继续任务
  function resumeTask(taskId) {
    const task = downloadQueue.value.find(t => t.id === taskId)
    if (task && task.status === 'paused') {
      task.status = 'pending'
      processQueue()
    }
  }

  // 取消任务
  async function cancelTask(taskId) {
    const task = downloadQueue.value.find(t => t.id === taskId)
    if (task) {
      if (task.status === 'downloading') {
        await api.cancelDownload(taskId, task.title)
      }
      task.status = 'cancelled'
    }
  }

  // 从队列移除（带删除本地文件确认）
  async function removeFromQueue(taskId, deleteLocalFile = false) {
    const task = downloadQueue.value.find(t => t.id === taskId)
    const index = downloadQueue.value.findIndex(t => t.id === taskId)
    
    if (index > -1) {
      // 如果任务正在下载，先取消
      if (task && (task.status === 'downloading' || task.status === 'preparing' || task.status === 'retrying')) {
        await api.cancelDownload(taskId, task.title)
      }
      
      // 如果需要删除本地文件（包括临时文件）
      if (deleteLocalFile && task) {
        try {
          const plainTask = JSON.parse(JSON.stringify(toRaw(task)))
          const result = await api.deleteVideoByTitle(plainTask.title)
          if (result.deleted && result.deletedFiles.length > 0) {
            showToast(`已删除 ${result.deletedFiles.length} 个本地文件`, 'success')
          } else if (!result.deleted) {
            showToast('未找到匹配的本地文件', 'info')
          }
        } catch (error) {
          showToast('删除本地文件失败: ' + error.message, 'error')
        }
      } else if (task && (task.status === 'paused' || task.status === 'error')) {
        // 暂停或出错的任务，也尝试删除临时文件
        try {
          const plainTask = JSON.parse(JSON.stringify(toRaw(task)))
          await api.deleteVideoByTitle(plainTask.title)
        } catch (error) {
          console.error('清理临时文件失败:', error)
        }
      }
      
      // 保存到历史记录（只保存已完成的任务）
      if (task && task.status === 'completed') {
        await saveToHistory(task)
      }
      
      downloadQueue.value.splice(index, 1)
    }
  }
  
  // 保存任务到历史记录
  async function saveToHistory(task) {
    try {
      const historyItem = {
        id: task.id,
        url: task.url,
        title: task.title || '未知视频',
        thumbnail: task.thumbnail,
        uploader: task.uploader,
        duration: task.duration,
        resolution: task.resolution,
        filesize: task.filesize,
        format: task.format,
        formatId: task.formatId,
        addedAt: task.addedAt,
        startTime: task.startTime,
        completedTime: task.completedTime || new Date().toISOString(),
        downloadPath: config.value.downloadPath
      }
      
      // 添加到本地历史记录
      history.value.unshift(historyItem)
      
      // 通过 IPC 保存到文件（如果有 API）
      if (isElectronEnv.value && api.saveHistory) {
        const plainHistory = JSON.parse(JSON.stringify(toRaw(history.value)))
        await api.saveHistory(plainHistory)
      }
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }
  
  // 显示删除确认弹窗
  function showDeleteConfirmDialog(taskId, taskTitle) {
    return new Promise((resolve) => {
      deleteConfirmDialog.value = {
        visible: true,
        taskId,
        taskTitle,
        resolve
      }
    })
  }
  
  // 处理删除确认弹窗的选择
  function handleDeleteConfirmChoice(choice) {
    if (deleteConfirmDialog.value.resolve) {
      deleteConfirmDialog.value.resolve(choice)
    }
    deleteConfirmDialog.value = {
      visible: false,
      taskId: null,
      taskTitle: '',
      resolve: null
    }
  }
  
  // 保存解析结果
  function saveParsedResult(data) {
    parsedResult.value = { ...parsedResult.value, ...data }
  }
  
  // 清空解析结果
  function clearParsedResult() {
    parsedResult.value = {
      url: '',
      videoInfo: null,
      isPlaylist: false,
      selectedFormat: 'best',
      formatType: 'video',
      selectedItems: []
    }
  }

  // 清空已完成任务
  function clearCompleted() {
    downloadQueue.value = downloadQueue.value.filter(t => 
      !['completed', 'cancelled', 'error'].includes(t.status)
    )
  }

  // 保存自定义规则
  async function saveRules(rules) {
    try {
      // 将响应式对象转换为普通对象，确保可以通过 IPC 序列化
      const plainRules = JSON.parse(JSON.stringify(toRaw(rules)))
      await api.saveRules(plainRules)
      customRules.value = plainRules
      showToast('规则已保存', 'success')
    } catch (error) {
      showToast('保存规则失败: ' + error.message, 'error')
    }
  }

  // 清空历史
  async function clearHistory() {
    try {
      await api.clearHistory()
      history.value = []
      showToast('历史记录已清空', 'success')
    } catch (error) {
      showToast('清空失败: ' + error.message, 'error')
    }
  }

  // 显示消息提示
  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }, duration)
  }

  // 移除消息提示
  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    // 状态
    ytdlpInstalled,
    ytdlpVersion,
    isElectronEnv,
    config,
    history,
    customRules,
    toasts,
    downloadQueue,
    currentDownload,
    fileExistsDialog,
    deleteConfirmDialog,
    parsedResult,
    
    // 计算属性
    queueCount,
    activeCount,
    pendingCount,
    
    // 方法
    init,
    saveConfig,
    parseVideo,
    getFormats,
    addToQueue,
    pauseTask,
    resumeTask,
    cancelTask,
    removeFromQueue,
    clearCompleted,
    saveRules,
    clearHistory,
    showToast,
    removeToast,
    handleFileExistsChoice,
    showDeleteConfirmDialog,
    handleDeleteConfirmChoice,
    saveParsedResult,
    clearParsedResult,
    
    // API helpers
    api
  }
})
