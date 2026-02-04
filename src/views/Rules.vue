<template>
  <div class="rules-view">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          网站规则
        </h1>
      </div>
      
      <button class="btn btn-primary" @click="addRule">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        添加规则
      </button>
    </header>
    
    <!-- 说明卡片 -->
    <div class="info-card">
      <div class="info-icon">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="info-content">
        <h3>网站规则说明</h3>
        <p>为特定网站配置额外的 yt-dlp 参数。当 URL 匹配规则时，会自动添加对应参数。</p>
        <p class="info-note">注意：此功能仅能增强 yt-dlp 已支持的网站，不能让 yt-dlp 支持新网站。</p>
      </div>
    </div>
    
    <!-- 规则列表 -->
    <div class="rules-list">
      <div v-if="rules.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <h2>暂无自定义规则</h2>
        <p>点击上方按钮添加规则，或选择下方预设模板</p>
      </div>
      
      <div 
        v-for="(rule, index) in rules" 
        :key="index"
        class="rule-card"
        :class="{ editing: editingIndex === index, enabled: rule.enabled }"
      >
        <div class="rule-header">
          <div class="rule-info">
            <label class="rule-toggle">
              <input type="checkbox" v-model="rule.enabled" @change="saveRules" />
              <span class="toggle-slider"></span>
            </label>
            <h3 class="rule-name">{{ rule.name || '未命名规则' }}</h3>
            <span class="rule-domain">{{ rule.domain }}</span>
          </div>
          
          <div class="rule-actions">
            <button class="btn btn-icon" @click="editRule(index)" title="编辑">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <button class="btn btn-icon" @click="deleteRule(index)" title="删除">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 编辑面板 -->
        <div v-if="editingIndex === index" class="rule-editor">
          <div class="form-grid">
            <div class="form-group">
              <label>规则名称</label>
              <input 
                type="text" 
                class="input" 
                v-model="rule.name"
                placeholder="例如：YouTube"
              />
            </div>
            
            <div class="form-group">
              <label>匹配域名</label>
              <input 
                type="text" 
                class="input" 
                v-model="rule.domain"
                placeholder="例如：youtube.com"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>URL 匹配模式 (正则表达式)</label>
            <input 
              type="text" 
              class="input font-mono" 
              v-model="rule.urlPattern"
              placeholder="例如：youtube\.com|youtu\.be"
            />
            <p class="form-hint">使用正则表达式匹配 URL，留空则使用域名匹配</p>
          </div>
          
          <div class="form-section">
            <h4>yt-dlp 参数</h4>
            
            <div class="form-group">
              <label>自定义参数</label>
              <input 
                type="text" 
                class="input font-mono" 
                v-model="rule.ytdlpArgs"
                placeholder="例如：--js-runtimes node --no-check-certificate"
              />
              <p class="form-hint">当 URL 匹配时，自动添加这些参数</p>
            </div>
            
            <div class="args-presets">
              <span class="preset-label">常用参数：</span>
              <div class="preset-tags">
                <code @click="addYtdlpArg(rule, '--js-runtimes node')">--js-runtimes node</code>
                <code @click="addYtdlpArg(rule, '--no-check-certificate')">--no-check-certificate</code>
                <code @click="addYtdlpArg(rule, '--geo-bypass')">--geo-bypass</code>
                <code @click="addYtdlpArg(rule, '--ignore-errors')">--ignore-errors</code>
                <code @click="addYtdlpArg(rule, '--extractor-args youtube:player_client=web')">youtube:player_client=web</code>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>自定义请求头 (JSON 格式，可选)</label>
            <textarea 
              class="textarea font-mono" 
              v-model="rule.headers"
              placeholder='{"Referer": "https://example.com"}'
              rows="2"
            ></textarea>
          </div>
          
          <div class="editor-actions">
            <button class="btn btn-secondary" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="saveRules">保存规则</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 预设规则 -->
    <section class="preset-section">
      <h2 class="section-title">预设模板</h2>
      <div class="preset-grid">
        <button 
          v-for="preset in presets" 
          :key="preset.name"
          class="preset-card"
          @click="applyPreset(preset)"
        >
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-desc">{{ preset.description }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const rules = ref([])
const editingIndex = ref(-1)

// 精简的预设模板
const presets = [
  {
    name: 'YouTube',
    description: '解决 403/400 错误',
    rule: {
      name: 'YouTube',
      domain: 'youtube.com',
      urlPattern: 'youtube\\.com|youtu\\.be',
      ytdlpArgs: '--js-runtimes node',
      headers: '',
      enabled: true
    }
  },
  {
    name: 'YouTube (完整修复)',
    description: '多参数修复',
    rule: {
      name: 'YouTube 完整修复',
      domain: 'youtube.com',
      urlPattern: 'youtube\\.com|youtu\\.be',
      ytdlpArgs: '--js-runtimes node --extractor-args youtube:player_client=web',
      headers: '',
      enabled: true
    }
  },
  {
    name: 'Bilibili',
    description: 'B站特殊处理',
    rule: {
      name: 'Bilibili',
      domain: 'bilibili.com',
      urlPattern: 'bilibili\\.com|b23\\.tv',
      ytdlpArgs: '--no-check-certificate',
      headers: '',
      enabled: true
    }
  },
  {
    name: 'Twitter/X',
    description: '推特视频',
    rule: {
      name: 'Twitter',
      domain: 'twitter.com',
      urlPattern: 'twitter\\.com|x\\.com',
      ytdlpArgs: '--no-check-certificate',
      headers: '',
      enabled: true
    }
  },
  {
    name: '通用 HTTPS 问题',
    description: '解决证书错误',
    rule: {
      name: '跳过证书验证',
      domain: '*',
      urlPattern: '',
      ytdlpArgs: '--no-check-certificate',
      headers: '',
      enabled: false
    }
  }
]

onMounted(() => {
  rules.value = [...appStore.customRules]
})

const createEmptyRule = () => ({
  name: '',
  domain: '',
  urlPattern: '',
  ytdlpArgs: '',
  headers: '',
  enabled: true
})

const addYtdlpArg = (rule, arg) => {
  if (rule.ytdlpArgs) {
    if (!rule.ytdlpArgs.includes(arg)) {
      rule.ytdlpArgs += ' ' + arg
    }
  } else {
    rule.ytdlpArgs = arg
  }
}

const addRule = () => {
  rules.value.push(createEmptyRule())
  editingIndex.value = rules.value.length - 1
}

const editRule = (index) => {
  editingIndex.value = editingIndex.value === index ? -1 : index
}

const deleteRule = (index) => {
  if (confirm('确定要删除这条规则吗？')) {
    rules.value.splice(index, 1)
    editingIndex.value = -1
    saveRules()
  }
}

const cancelEdit = () => {
  const rule = rules.value[editingIndex.value]
  if (!rule.name && !rule.domain) {
    rules.value.splice(editingIndex.value, 1)
  }
  editingIndex.value = -1
}

const saveRules = () => {
  appStore.saveRules(rules.value)
  editingIndex.value = -1
}

const applyPreset = (preset) => {
  rules.value.push({ ...preset.rule })
  editingIndex.value = rules.value.length - 1
  appStore.showToast(`已添加预设规则: ${preset.name}`, 'success')
}
</script>

<style lang="scss" scoped>
.rules-view {
  padding: var(--spacing-lg);
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  
  svg {
    color: var(--primary);
  }
}

.info-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  margin-bottom: var(--spacing-lg);
}

.info-icon {
  flex-shrink: 0;
  color: var(--primary);
}

.info-content {
  h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }
  
  p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  
  .info-note {
    margin-top: var(--spacing-xs);
    color: var(--warning);
    font-size: 12px;
  }
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-light);
  
  .empty-icon {
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
  }
  
  h2 {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--text-muted);
    font-size: 14px;
  }
}

.rule-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all 0.2s ease;
  
  &.editing {
    border-color: var(--primary);
  }
  
  &:not(.enabled) {
    opacity: 0.6;
  }
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
}

.rule-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.rule-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  cursor: pointer;
  
  input {
    display: none;
  }
  
  .toggle-slider {
    position: absolute;
    inset: 0;
    background: var(--bg-tertiary);
    border-radius: 10px;
    transition: background 0.2s;
    
    &::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
  }
  
  input:checked + .toggle-slider {
    background: var(--primary);
    
    &::before {
      transform: translateX(16px);
    }
  }
}

.rule-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.rule-domain {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.rule-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.rule-editor {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  
  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .input, .textarea {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
    }
    
    &::placeholder {
      color: var(--text-muted);
    }
  }
  
  .textarea {
    resize: vertical;
    min-height: 60px;
  }
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.form-section {
  margin-bottom: var(--spacing-md);
  
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
  }
}

.args-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.preset-label {
  font-size: 12px;
  color: var(--text-muted);
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  
  code {
    font-size: 11px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
  }
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.preset-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  
  &:hover {
    border-color: var(--primary);
    background: var(--bg-tertiary);
  }
  
  .preset-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .preset-desc {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  &-primary {
    background: var(--primary);
    color: white;
    
    &:hover {
      opacity: 0.9;
    }
  }
  
  &-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    
    &:hover {
      background: var(--border-light);
    }
  }
  
  &-icon {
    padding: var(--spacing-sm);
    background: transparent;
    color: var(--text-muted);
    
    &:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }
  }
}

.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
