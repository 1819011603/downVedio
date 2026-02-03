const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // yt-dlp 相关
  checkYtdlp: () => ipcRenderer.invoke('ytdlp:check'),
  parseVideo: (url) => ipcRenderer.invoke('video:parse', url),
  getFormats: (url) => ipcRenderer.invoke('video:formats', url),

  // 下载相关
  startDownload: (task) => ipcRenderer.invoke('download:start', task),
  cancelDownload: (taskId) => ipcRenderer.invoke('download:cancel', taskId),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download:progress', (_, data) => callback(data))
  },

  // 配置相关
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // 历史记录
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // 自定义规则
  getRules: () => ipcRenderer.invoke('rules:get'),
  saveRules: (rules) => ipcRenderer.invoke('rules:save', rules),

  // 对话框
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),

  // Shell
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // 文件操作
  checkFileExists: (task) => ipcRenderer.invoke('file:checkExists', task),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  getDownloadedPath: (task) => ipcRenderer.invoke('file:getDownloadedPath', task),
  openFile: (filePath) => ipcRenderer.invoke('shell:openFile', filePath),
  deleteVideoByTitle: (title) => ipcRenderer.invoke('file:deleteByTitle', title)
})
