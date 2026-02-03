import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

// 检查是否在 Electron 环境中
const isElectron = () => {
  return window.electronAPI !== undefined
}

// 安全调用 Electron API
const api = {
  checkYtdlp: () => isElectron() ? window.electronAPI.checkYtdlp() : Promise.resolve({ installed: false, version: null }),
  parseVideo: (url) => isElectron() ? window.electronAPI.parseVideo(url) : Promise.reject(new Error('请通过 Electron 启动应用')),
  getFormats: (url) => isElectron() ? window.electronAPI.getFormats(url) : Promise.reject(new Error('请通过 Electron 启动应用')),
  startDownload: (task) => isElectron() ? window.electronAPI.startDownload(task) : Promise.reject(new Error('请通过 Electron 启动应用')),
  cancelDownload: (taskId) => isElectron() ? window.electronAPI.cancelDownload(taskId) : Promise.resolve(),
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
    proxy: '',
    cookieFile: '',
    cookiesFromBrowser: 'none',
    concurrentDownloads: 1,
    autoRetry: true,
    maxRetries: 3,
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
    customArgs: ''
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
  
  // 文件存在弹窗状态
  const fileExistsDialog = ref({
    visible: false,
    filename: '',
    fullPath: '',
    taskId: null,
    resolve: null
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
    isElectronEnv.value = isElectron()
    
    if (!isElectronEnv.value) {
      showToast('请使用 npm run electron:dev 启动应用', 'warning')
      return
    }
    
    try {
      // 检查 yt-dlp
      const result = await api.checkYtdlp()
      ytdlpInstalled.value = result.installed
      ytdlpVersion.value = result.version

      // 加载配置
      config.value = await api.getConfig()

      // 加载历史记录
      history.value = await api.getHistory()

      // 加载自定义规则
      customRules.value = await api.getRules()

      // 监听下载进度
      api.onDownloadProgress((data) => {
        updateTaskProgress(data)
      })

      if (!result.installed) {
        showToast('未检测到 yt-dlp，请先安装', 'warning')
      }
    } catch (error) {
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
  async function parseVideo(url) {
    if (!isElectronEnv.value) {
      throw new Error('请使用 npm run electron:dev 启动应用')
    }
    try {
      const result = await api.parseVideo(url)
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

  // 处理下载队列
  async function processQueue() {
    // 检查是否有正在下载的任务
    const downloading = downloadQueue.value.filter(t => t.status === 'downloading')
    if (downloading.length >= config.value.concurrentDownloads) {
      return
    }

    // 获取下一个待下载任务
    const nextTask = downloadQueue.value.find(t => t.status === 'pending')
    if (!nextTask) {
      return
    }

    // 检查文件是否已存在
    let plainTask = JSON.parse(JSON.stringify(toRaw(nextTask)))
    
    try {
      const checkResult = await api.checkFileExists(plainTask)
      if (checkResult.exists) {
        // 显示弹窗让用户选择
        const userChoice = await showFileExistsDialog(checkResult.filename, checkResult.fullPath, nextTask.id)
        
        if (userChoice === 'cancel') {
          nextTask.status = 'cancelled'
          nextTask.error = '用户取消：文件已存在'
          processQueue()
          return
        } else if (userChoice === 'overwrite') {
          // 删除已存在的文件
          const deleteResult = await api.deleteFile(checkResult.fullPath)
          if (!deleteResult.success) {
            nextTask.status = 'error'
            nextTask.error = `无法删除已存在的文件: ${deleteResult.error}`
            processQueue()
            return
          }
        } else if (userChoice === 'saveAs') {
          // 修改文件名添加时间戳
          const timestamp = Date.now()
          nextTask.title = `${nextTask.title}_${timestamp}`
        }
        // 重新生成 plainTask（更新后的标题）
        plainTask = JSON.parse(JSON.stringify(toRaw(nextTask)))
      }
    } catch (error) {
      console.error('检查文件存在失败:', error)
    }

    // 开始下载
    nextTask.status = 'downloading'
    nextTask.progress = 0
    currentDownload.value = nextTask

    try {
      await api.startDownload(plainTask)
      nextTask.status = 'completed'
      nextTask.progress = 100
      showToast(`下载完成: ${nextTask.title}`, 'success')
    } catch (error) {
      nextTask.status = 'error'
      nextTask.error = error.message || String(error)
      nextTask.errorTime = new Date().toISOString()
      showToast(`下载失败: ${nextTask.title}`, 'error')
    }

    currentDownload.value = null

    // 继续处理队列
    processQueue()
  }
  
  // 显示文件存在弹窗
  function showFileExistsDialog(filename, fullPath, taskId) {
    return new Promise((resolve) => {
      fileExistsDialog.value = {
        visible: true,
        filename,
        fullPath,
        taskId,
        resolve
      }
    })
  }
  
  // 处理文件存在弹窗的选择
  function handleFileExistsChoice(choice) {
    if (fileExistsDialog.value.resolve) {
      fileExistsDialog.value.resolve(choice)
    }
    fileExistsDialog.value = {
      visible: false,
      filename: '',
      fullPath: '',
      taskId: null,
      resolve: null
    }
  }

  // 更新任务进度
  function updateTaskProgress(data) {
    const task = downloadQueue.value.find(t => t.id === data.taskId)
    if (task) {
      task.progress = data.progress
      task.status = data.status
      task.output = data.output
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
      await api.cancelDownload(taskId)
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
        await api.cancelDownload(taskId)
      }
      task.status = 'cancelled'
    }
  }

  // 从队列移除（带删除本地文件确认）
  async function removeFromQueue(taskId, deleteLocalFile = false) {
    const task = downloadQueue.value.find(t => t.id === taskId)
    const index = downloadQueue.value.findIndex(t => t.id === taskId)
    
    if (index > -1) {
      // 如果需要删除本地文件
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
      }
      downloadQueue.value.splice(index, 1)
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
  function showToast(message, type = 'info') {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }, 3000)
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
