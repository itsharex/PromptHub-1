import { useState } from 'react';
import {
  SettingsIcon,
  PaletteIcon,
  DatabaseIcon,
  InfoIcon,
  GlobeIcon,
  BellIcon,
  ArrowLeftIcon,
  CheckIcon,
  FolderIcon,
  CloudIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  BrainIcon,
  KeyIcon,
  PlayIcon,
  Loader2Icon,
  ZapIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  EditIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadBackup, restoreFromFile, clearDatabase } from '../../services/database';
import { testConnection, uploadToWebDAV, downloadFromWebDAV } from '../../services/webdav';
import { testAIConnection, testImageGeneration, AITestResult, ImageTestResult } from '../../services/ai';
import { useSettingsStore, MORANDI_THEMES, FONT_SIZES, ThemeMode } from '../../stores/settings.store';
import { useToast } from '../ui/Toast';
import { Select, SelectOption } from '../ui/Select';

interface SettingsPageProps {
  onBack: () => void;
}

// 设置菜单项 - 使用 key 而非硬编码文本
const SETTINGS_MENU = [
  { id: 'general', labelKey: 'settings.general', icon: SettingsIcon },
  { id: 'appearance', labelKey: 'settings.appearance', icon: PaletteIcon },
  { id: 'data', labelKey: 'settings.data', icon: DatabaseIcon },
  { id: 'ai', labelKey: 'settings.ai', icon: BrainIcon },
  { id: 'language', labelKey: 'settings.language', icon: GlobeIcon },
  { id: 'notifications', labelKey: 'settings.notifications', icon: BellIcon },
  { id: 'about', labelKey: 'settings.about', icon: InfoIcon },
];

// AI 模型提供商 - 支持动态模型输入
const AI_PROVIDERS = [
  // 海外
  { id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'] },
  { id: 'anthropic', name: 'Anthropic (Claude)', defaultUrl: 'https://api.anthropic.com/v1', defaultModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  { id: 'google', name: 'Google (Gemini)', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'xai', name: 'xAI (Grok)', defaultUrl: 'https://api.x.ai/v1', defaultModels: ['grok-beta', 'grok-2-1212'] },
  { id: 'mistral', name: 'Mistral AI', defaultUrl: 'https://api.mistral.ai/v1', defaultModels: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'] },
  // 国内
  { id: 'deepseek', name: 'DeepSeek (深度求索)', defaultUrl: 'https://api.deepseek.com/v1', defaultModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { id: 'moonshot', name: 'Moonshot (Kimi)', defaultUrl: 'https://api.moonshot.cn/v1', defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { id: 'zhipu', name: '智谱 AI (GLM)', defaultUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModels: ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4v'] },
  { id: 'qwen', name: '通义千问 (阿里)', defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModels: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'] },
  { id: 'ernie', name: '文心一言 (百度)', defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop', defaultModels: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-8k'] },
  { id: 'spark', name: '讯飞星火', defaultUrl: 'https://spark-api-open.xf-yun.com/v1', defaultModels: ['generalv3.5', 'generalv3', 'generalv2'] },
  { id: 'doubao', name: '豆包 (字节)', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModels: ['doubao-pro-32k', 'doubao-lite-32k'] },
  { id: 'baichuan', name: '百川智能', defaultUrl: 'https://api.baichuan-ai.com/v1', defaultModels: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan2-Turbo'] },
  { id: 'minimax', name: 'MiniMax', defaultUrl: 'https://api.minimax.chat/v1', defaultModels: ['abab6.5s-chat', 'abab6-chat', 'abab5.5-chat'] },
  { id: 'stepfun', name: '阶跃星辰', defaultUrl: 'https://api.stepfun.com/v1', defaultModels: ['step-1-200k', 'step-1-32k', 'step-1v-32k'] },
  { id: 'yi', name: '零一万物 (Yi)', defaultUrl: 'https://api.lingyiwanwu.com/v1', defaultModels: ['yi-large', 'yi-medium', 'yi-spark'] },
  { id: 'azure', name: 'Azure OpenAI', defaultUrl: '', defaultModels: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'] },
  { id: 'ollama', name: 'Ollama (本地)', defaultUrl: 'http://localhost:11434/v1', defaultModels: ['llama3', 'mistral', 'codellama', 'qwen2'] },
  { id: 'custom', name: '自定义 (OpenAI 兼容)', defaultUrl: '', defaultModels: [] },
];

type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
type ImageQuality = 'standard' | 'hd';
type ImageStyle = 'vivid' | 'natural';

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState('general');
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  // 使用 settings store
  const settings = useSettingsStore();
  
  // AI 测试状态
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<AITestResult | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareConfig, setCompareConfig] = useState({ provider: '', apiKey: '', apiUrl: '', model: '' });
  const [compareTesting, setCompareTesting] = useState(false);
  const [compareResult, setCompareResult] = useState<AITestResult | null>(null);

  // 图像测试状态
  const [imageTesting, setImageTesting] = useState(false);
  const [imageTestResult, setImageTestResult] = useState<ImageTestResult | null>(null);
  const [imagePrompt, setImagePrompt] = useState('A cute cat sitting on a windowsill');
  const [imageSize, setImageSize] = useState<ImageSize>('1024x1024');
  const [imageQuality, setImageQuality] = useState<ImageQuality>('standard');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('vivid');

  // 多模型配置状态
  const [showAddChatModel, setShowAddChatModel] = useState(false);
  const [showAddImageModel, setShowAddImageModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelType, setEditingModelType] = useState<'chat' | 'image'>('chat');
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai',
    apiKey: '',
    apiUrl: '',
    model: '',
  });
  const [testingModelId, setTestingModelId] = useState<string | null>(null);

  // 分离对话模型和生图模型
  const chatModels = settings.aiModels.filter(m => m.type === 'chat' || !m.type);
  const imageModels = settings.aiModels.filter(m => m.type === 'image');

  // 测试单个模型
  const handleTestModel = async (model: typeof settings.aiModels[0]) => {
    setTestingModelId(model.id);
    setAiTestResult(null);
    
    const result = await testAIConnection({
      provider: model.provider,
      apiKey: model.apiKey,
      apiUrl: model.apiUrl,
      model: model.model,
    });
    
    setAiTestResult(result);
    setTestingModelId(null);
    
    if (result.success) {
      showToast(`连接成功 (${result.latency}ms)`, 'success');
    } else {
      showToast(result.error || '连接失败', 'error');
    }
  };

  // AI 测试函数
  const handleTestAI = async () => {
    if (!settings.aiApiKey || !settings.aiApiUrl || !settings.aiModel) {
      showToast(t('toast.configApiKey'), 'error');
      return;
    }
    
    setAiTesting(true);
    setAiTestResult(null);
    
    const result = await testAIConnection({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      apiUrl: settings.aiApiUrl,
      model: settings.aiModel,
    });
    
    setAiTestResult(result);
    setAiTesting(false);
    
    if (result.success) {
      showToast(`${t('toast.connectionSuccess')} (${result.latency}ms)`, 'success');
    } else {
      showToast(result.error || t('toast.connectionFailed'), 'error');
    }
  };

  // 对比测试函数
  const handleCompareTest = async () => {
    if (!settings.aiApiKey || !compareConfig.apiKey) {
      showToast(t('toast.configApiKey'), 'error');
      return;
    }
    
    setAiTesting(true);
    setCompareTesting(true);
    setAiTestResult(null);
    setCompareResult(null);
    
    // 并行测试两个模型
    const [result1, result2] = await Promise.all([
      testAIConnection({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        apiUrl: settings.aiApiUrl,
        model: settings.aiModel,
      }),
      testAIConnection({
        provider: compareConfig.provider || 'custom',
        apiKey: compareConfig.apiKey,
        apiUrl: compareConfig.apiUrl,
        model: compareConfig.model,
      }),
    ]);
    
    setAiTestResult(result1);
    setCompareResult(result2);
    setAiTesting(false);
    setCompareTesting(false);
  };

  const handleTestImage = async () => {
    if (!settings.aiApiKey || !settings.aiApiUrl || !settings.aiModel) {
      showToast(t('toast.configApiKey'), 'error');
      return;
    }

    setImageTesting(true);
    setImageTestResult(null);

    const result = await testImageGeneration(
      {
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        apiUrl: settings.aiApiUrl,
        model: settings.aiModel,
        type: 'image',
      },
      imagePrompt,
      {
        size: imageSize,
        quality: imageQuality,
        style: imageStyle,
      }
    );

    setImageTestResult(result);
    setImageTesting(false);

    if (result.success) {
      showToast(`${t('toast.connectionSuccess')} (${result.latency}ms)`, 'success');
    } else {
      showToast(result.error || t('toast.connectionFailed'), 'error');
    }
  };

  const handleExportData = async () => {
    try {
      await downloadBackup();
      showToast(t('toast.exportSuccess'), 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast(t('toast.exportFailed'), 'error');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await restoreFromFile(file);
          showToast(t('toast.importSuccess'), 'success');
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          console.error('Import failed:', error);
          showToast(t('toast.importFailed'), 'error');
        }
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm(t('settings.clearDesc') + '?')) {
      try {
        await clearDatabase();
        showToast(t('toast.clearSuccess'), 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Clear failed:', error);
        showToast(t('toast.clearFailed'), 'error');
      }
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <SettingSection title={t('settings.startup')}>
              <SettingItem
                label={t('settings.launchAtStartup')}
                description={t('settings.launchAtStartupDesc')}
              >
                <ToggleSwitch 
                  checked={settings.launchAtStartup}
                  onChange={(checked) => {
                    settings.setLaunchAtStartup(checked);
                    window.electron?.setAutoLaunch?.(checked);
                  }}
                />
              </SettingItem>
              <SettingItem
                label={t('settings.minimizeOnLaunch')}
                description={t('settings.minimizeOnLaunchDesc')}
              >
                <ToggleSwitch 
                  checked={settings.minimizeOnLaunch}
                  onChange={settings.setMinimizeOnLaunch}
                />
              </SettingItem>
            </SettingSection>

            <SettingSection title={t('settings.editor')}>
              <SettingItem
                label={t('settings.autoSave')}
                description={t('settings.autoSaveDesc')}
              >
                <ToggleSwitch 
                  checked={settings.autoSave}
                  onChange={settings.setAutoSave}
                />
              </SettingItem>
              <SettingItem
                label={t('settings.showLineNumbers')}
                description={t('settings.showLineNumbersDesc')}
              >
                <ToggleSwitch 
                  checked={settings.showLineNumbers}
                  onChange={settings.setShowLineNumbers}
                />
              </SettingItem>
            </SettingSection>
          </div>
        );

      case 'appearance':
        const themeModes: { id: ThemeMode; labelKey: string; icon: React.ReactNode }[] = [
          { id: 'light', labelKey: 'settings.light', icon: <SunIcon className="w-5 h-5" /> },
          { id: 'dark', labelKey: 'settings.dark', icon: <MoonIcon className="w-5 h-5" /> },
          { id: 'system', labelKey: 'settings.system', icon: <MonitorIcon className="w-5 h-5" /> },
        ];
        return (
          <div className="space-y-6">
            <SettingSection title={t('settings.themeMode')}>
              <div className="grid grid-cols-3 gap-3 p-4">
                {themeModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => settings.setThemeMode(mode.id)}
                    className={`flex flex-col items-center gap-2 py-4 px-4 rounded-lg text-sm font-medium transition-colors ${
                      settings.themeMode === mode.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-foreground hover:bg-muted'
                    }`}
                  >
                    {mode.icon}
                    <span>{t(mode.labelKey)}</span>
                  </button>
                ))}
              </div>
            </SettingSection>

            <SettingSection title={t('settings.themeColor')}>
              <div className="p-4">
                <div className="grid grid-cols-6 gap-4">
                  {MORANDI_THEMES.map((theme) => {
                    const colorNameKey = `settings.color${theme.id.charAt(0).toUpperCase() + theme.id.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => settings.setThemeColor(theme.id)}
                        className="group flex flex-col items-center gap-2"
                        title={t(colorNameKey)}
                      >
                        <div 
                          className={`w-10 h-10 rounded-lg transition-all ${
                            settings.themeColor === theme.id 
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                              : 'hover:opacity-80'
                          }`}
                          style={{ backgroundColor: `hsl(${theme.hue}, ${theme.saturation}%, 55%)` }}
                        >
                          {settings.themeColor === theme.id && (
                            <CheckIcon className="w-4 h-4 text-white m-auto mt-3" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{t(colorNameKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('settings.fontSize')}>
              <div className="grid grid-cols-3 gap-3 p-4">
                {FONT_SIZES.map((size) => {
                  const sizeNameKey = `settings.font${size.id.charAt(0).toUpperCase() + size.id.slice(1)}`;
                  return (
                    <button
                      key={size.id}
                      onClick={() => settings.setFontSize(size.id)}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                        settings.fontSize === size.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-foreground hover:bg-muted'
                      }`}
                    >
                      {t(sizeNameKey)}
                      <span className="block text-xs opacity-70 mt-0.5">{size.value}px</span>
                    </button>
                  );
                })}
              </div>
            </SettingSection>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <SettingSection title={t('settings.dataPath')}>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <FolderIcon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('settings.dataPath')}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {settings.dataPath}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const result = await window.electron?.selectFolder?.();
                      if (result) {
                        settings.setDataPath(result);
                      }
                    }}
                    className="h-8 px-3 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors"
                  >
                    {t('settings.change')}
                  </button>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('settings.webdav')}>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <CloudIcon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('settings.webdavEnabled')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.webdavEnabledDesc')}
                    </p>
                  </div>
                  <ToggleSwitch 
                    checked={settings.webdavEnabled}
                    onChange={settings.setWebdavEnabled}
                  />
                </div>
                {settings.webdavEnabled && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.webdavUrl')}</label>
                      <input
                        type="text"
                        placeholder="https://dav.example.com/path"
                        value={settings.webdavUrl}
                        onChange={(e) => settings.setWebdavUrl(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.webdavUsername')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.webdavUsername')}
                        value={settings.webdavUsername}
                        onChange={(e) => settings.setWebdavUsername(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.webdavPassword')}</label>
                      <input
                        type="password"
                        placeholder={t('settings.webdavPassword')}
                        value={settings.webdavPassword}
                        onChange={(e) => settings.setWebdavPassword(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={async () => {
                          if (!settings.webdavUrl || !settings.webdavUsername || !settings.webdavPassword) {
                            return;
                          }
                          const result = await testConnection({
                            url: settings.webdavUrl,
                            username: settings.webdavUsername,
                            password: settings.webdavPassword,
                          });
                          showToast(result.success ? t('toast.connectionSuccess') : t('toast.connectionFailed'), result.success ? 'success' : 'error');
                        }}
                        className="h-8 px-4 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors flex items-center gap-2"
                      >
                        <RefreshCwIcon className="w-4 h-4" />
                        {t('settings.testConnection')}
                      </button>
                      <button
                        onClick={async () => {
                          if (!settings.webdavUrl || !settings.webdavUsername || !settings.webdavPassword) {
                            return;
                          }
                          const result = await uploadToWebDAV({
                            url: settings.webdavUrl,
                            username: settings.webdavUsername,
                            password: settings.webdavPassword,
                          });
                          showToast(result.success ? t('toast.uploadSuccess') : t('toast.uploadFailed'), result.success ? 'success' : 'error');
                        }}
                        className="h-8 px-4 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <UploadIcon className="w-4 h-4" />
                        {t('settings.upload')}
                      </button>
                      <button
                        onClick={async () => {
                          if (!settings.webdavUrl || !settings.webdavUsername || !settings.webdavPassword) {
                            return;
                          }
                          const result = await downloadFromWebDAV({
                            url: settings.webdavUrl,
                            username: settings.webdavUsername,
                            password: settings.webdavPassword,
                          });
                          if (result.success) {
                            showToast(t('toast.downloadSuccess'), 'success');
                            setTimeout(() => window.location.reload(), 1000);
                          } else {
                            showToast(t('toast.downloadFailed'), 'error');
                          }
                        }}
                        className="h-8 px-4 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors flex items-center gap-2"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        {t('settings.download')}
                      </button>
                    </div>
                    
                    {/* 自动同步选项 */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-sm font-medium">{t('settings.webdavAutoSync')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('settings.webdavAutoSyncDesc')}
                        </p>
                      </div>
                      <ToggleSwitch 
                        checked={settings.webdavAutoSync}
                        onChange={settings.setWebdavAutoSync}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SettingSection>

            <SettingSection title={t('settings.backup')}>
              <SettingItem
                label={t('settings.export')}
                description={t('settings.exportDesc')}
              >
                <button
                  onClick={handleExportData}
                  className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {t('settings.export')}
                </button>
              </SettingItem>
              <SettingItem
                label={t('settings.import')}
                description={t('settings.importDesc')}
              >
                <button
                  onClick={handleImportData}
                  className="h-9 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  {t('settings.import')}
                </button>
              </SettingItem>
              <SettingItem
                label={t('settings.clear')}
                description={t('settings.clearDesc')}
              >
                <button
                  onClick={handleClearData}
                  className="h-9 px-4 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
                >
                  {t('settings.clear')}
                </button>
              </SettingItem>
            </SettingSection>

            <SettingSection title={t('settings.dbInfo')}>
              <div className="p-4 text-sm text-muted-foreground space-y-1">
                <p>• IndexedDB</p>
                <p>• PromptHubDB</p>
              </div>
            </SettingSection>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            {/* 对话模型列表 */}
            <SettingSection title={t('settings.chatModels')}>
              <div className="p-4 space-y-3">
                {chatModels.length > 0 && (
                  <div className="space-y-2">
                    {chatModels.map((model) => (
                      <div
                        key={model.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          model.isDefault ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {model.isDefault && (
                            <StarIcon className="w-4 h-4 text-primary fill-primary" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{model.name || model.model}</div>
                            <div className="text-xs text-muted-foreground">
                              {model.name ? `${model.model} • ` : ''}{AI_PROVIDERS.find(p => p.id === model.provider)?.name || model.provider}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTestModel(model)}
                            disabled={testingModelId === model.id}
                            className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                            title="测试连接"
                          >
                            {testingModelId === model.id ? (
                              <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <PlayIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          {!model.isDefault && (
                            <button
                              onClick={() => settings.setDefaultAiModel(model.id)}
                              className="p-1.5 rounded hover:bg-muted transition-colors"
                              title="设为默认"
                            >
                              <StarIcon className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingModelId(model.id);
                              setEditingModelType('chat');
                              setNewModel({
                                name: model.name || '',
                                provider: model.provider,
                                apiKey: model.apiKey,
                                apiUrl: model.apiUrl,
                                model: model.model,
                              });
                              setShowAddChatModel(true);
                            }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="编辑"
                          >
                            <EditIcon className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这个模型配置吗？')) {
                                settings.deleteAiModel(model.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="删除"
                          >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 添加对话模型表单 */}
                {showAddChatModel ? (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {editingModelId && editingModelType === 'chat' ? t('settings.editChatModel') : t('settings.addChatModel')}
                      </span>
                      <button
                        onClick={() => {
                          setShowAddChatModel(false);
                          setEditingModelId(null);
                          setNewModel({ name: '', provider: 'openai', apiKey: '', apiUrl: '', model: '' });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.customNameOptional')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.customNamePlaceholder')}
                        value={newModel.name}
                        onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.providerName')}</label>
                      <Select
                        value={newModel.provider}
                        onChange={(value) => {
                          const provider = AI_PROVIDERS.find(p => p.id === value);
                          setNewModel({
                            ...newModel,
                            provider: value,
                            apiUrl: provider?.defaultUrl || '',
                            model: provider?.defaultModels[0] || '',
                          });
                        }}
                        options={AI_PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiKey')}</label>
                      <input
                        type="password"
                        placeholder={t('settings.apiKeyPlaceholder')}
                        value={newModel.apiKey}
                        onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiUrl')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.apiUrlPlaceholder')}
                        value={newModel.apiUrl}
                        onChange={(e) => setNewModel({ ...newModel, apiUrl: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.modelName')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.modelNamePlaceholder')}
                        value={newModel.model}
                        onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newModel.apiKey || !newModel.apiUrl || !newModel.model) {
                          showToast(t('settings.fillComplete'), 'error');
                          return;
                        }
                        if (editingModelId && editingModelType === 'chat') {
                          settings.updateAiModel(editingModelId, { ...newModel, type: 'chat' });
                          showToast(t('settings.modelUpdated'), 'success');
                        } else {
                          settings.addAiModel({ ...newModel, type: 'chat' });
                          showToast(t('settings.modelAdded'), 'success');
                        }
                        setShowAddChatModel(false);
                        setEditingModelId(null);
                        setNewModel({ name: '', provider: 'openai', apiKey: '', apiUrl: '', model: '' });
                      }}
                      className="w-full h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {editingModelId && editingModelType === 'chat' ? t('settings.saveChanges') : t('settings.addModel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddChatModel(true)}
                    className="w-full h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t('settings.addChatModel')}
                  </button>
                )}

                {chatModels.length === 0 && !showAddChatModel && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {t('settings.noModelsHint')}
                  </p>
                )}
              </div>
            </SettingSection>

            {/* 生图模型列表 */}
            <SettingSection title={t('settings.imageModels')}>
              <div className="p-4 space-y-3">
                {imageModels.length > 0 && (
                  <div className="space-y-2">
                    {imageModels.map((model) => (
                      <div
                        key={model.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          model.isDefault ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {model.isDefault && (
                            <StarIcon className="w-4 h-4 text-primary fill-primary" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{model.model}</div>
                            <div className="text-xs text-muted-foreground">
                              {AI_PROVIDERS.find(p => p.id === model.provider)?.name || model.provider}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingModelId(model.id);
                              setEditingModelType('image');
                              setNewModel({
                                name: model.name || '',
                                provider: model.provider,
                                apiKey: model.apiKey,
                                apiUrl: model.apiUrl,
                                model: model.model,
                              });
                              setShowAddImageModel(true);
                            }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="编辑"
                          >
                            <EditIcon className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这个模型配置吗？')) {
                                settings.deleteAiModel(model.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="删除"
                          >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 添加生图模型表单 */}
                {showAddImageModel ? (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {editingModelId && editingModelType === 'image' ? t('settings.editImageModel') : t('settings.addImageModel')}
                      </span>
                      <button
                        onClick={() => {
                          setShowAddImageModel(false);
                          setEditingModelId(null);
                          setNewModel({ name: '', provider: 'openai', apiKey: '', apiUrl: '', model: '' });
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.customNameOptional')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.customNamePlaceholder')}
                        value={newModel.name}
                        onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.providerName')}</label>
                      <Select
                        value={newModel.provider}
                        onChange={(value) => {
                          const provider = AI_PROVIDERS.find(p => p.id === value);
                          setNewModel({
                            ...newModel,
                            provider: value,
                            apiUrl: provider?.defaultUrl || '',
                            model: value === 'openai' ? 'dall-e-3' : '',
                          });
                        }}
                        options={AI_PROVIDERS.filter(p => ['openai', 'azure', 'custom'].includes(p.id)).map((p) => ({ value: p.id, label: p.name }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiKey')}</label>
                      <input
                        type="password"
                        placeholder={t('settings.apiKeyPlaceholder')}
                        value={newModel.apiKey}
                        onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiUrl')}</label>
                      <input
                        type="text"
                        placeholder={t('settings.apiUrlPlaceholder')}
                        value={newModel.apiUrl}
                        onChange={(e) => setNewModel({ ...newModel, apiUrl: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t('settings.modelName')}</label>
                      <input
                        type="text"
                        placeholder="e.g., dall-e-3, stable-diffusion"
                        value={newModel.model}
                        onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-muted border-0 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newModel.apiKey || !newModel.apiUrl || !newModel.model) {
                          showToast(t('settings.fillComplete'), 'error');
                          return;
                        }
                        if (editingModelId && editingModelType === 'image') {
                          settings.updateAiModel(editingModelId, { ...newModel, type: 'image' });
                          showToast(t('settings.modelUpdated'), 'success');
                        } else {
                          settings.addAiModel({ ...newModel, type: 'image' });
                          showToast(t('settings.modelAdded'), 'success');
                        }
                        setShowAddImageModel(false);
                        setEditingModelId(null);
                        setNewModel({ name: '', provider: 'openai', apiKey: '', apiUrl: '', model: '' });
                      }}
                      className="w-full h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {editingModelId && editingModelType === 'image' ? t('settings.saveChanges') : t('settings.addModel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddImageModel(true)}
                    className="w-full h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t('settings.addImageModel')}
                  </button>
                )}

                {imageModels.length === 0 && !showAddImageModel && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {t('settings.noModelsHint')}
                  </p>
                )}
              </div>
            </SettingSection>

            <SettingSection title={t('settings.description')}>
              <div className="p-4 text-sm text-muted-foreground space-y-2">
                <p>• {t('settings.aiConfigDesc1')}</p>
                <p>• {t('settings.aiConfigDesc2')}</p>
                <p>• {t('settings.aiConfigDesc3')}</p>
                <p>• {t('settings.aiConfigDesc4')}</p>
              </div>
            </SettingSection>
          </div>
        );

      case 'language':
        const languageOptions: SelectOption[] = [
          { value: 'zh', label: '简体中文' },
          { value: 'en', label: 'English' },
        ];
        return (
          <div className="space-y-6">
            <SettingSection title={t('settings.language')}>
              <SettingItem
                label={t('settings.language')}
                description={t('settings.selectLanguage')}
              >
                <Select
                  value={settings.language}
                  onChange={(value) => settings.setLanguage(value as 'zh' | 'en')}
                  options={languageOptions}
                  className="w-32"
                />
              </SettingItem>
            </SettingSection>
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center justify-between">
              <span>{t('settings.languageChangeHint')}</span>
              <button
                onClick={() => window.location.reload()}
                className="h-8 px-3 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
              >
                {t('settings.refreshNow')}
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <SettingSection title={t('settings.notifications')}>
              <SettingItem
                label={t('settings.enableNotifications')}
                description={t('settings.enableNotificationsDesc')}
              >
                <ToggleSwitch 
                  checked={settings.enableNotifications}
                  onChange={settings.setEnableNotifications}
                />
              </SettingItem>
              <SettingItem
                label={t('settings.copyNotification')}
                description={t('settings.copyNotificationDesc')}
              >
                <ToggleSwitch 
                  checked={settings.showCopyNotification}
                  onChange={settings.setShowCopyNotification}
                />
              </SettingItem>
              <SettingItem
                label={t('settings.saveNotification')}
                description={t('settings.saveNotificationDesc')}
              >
                <ToggleSwitch 
                  checked={settings.showSaveNotification}
                  onChange={settings.setShowSaveNotification}
                />
              </SettingItem>
            </SettingSection>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            {/* 应用信息卡片 */}
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-white text-xl font-bold">P</span>
              </div>
              <h2 className="text-lg font-semibold">PromptHub</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('settings.version')} 0.1.4</p>
            </div>

            <SettingSection title={t('settings.projectInfo')}>
              <div className="px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p>• {t('settings.projectInfoDesc1')}</p>
                <p>• {t('settings.projectInfoDesc2')}</p>
                <p>• {t('settings.projectInfoDesc3')}</p>
              </div>
            </SettingSection>

            <SettingSection title={t('settings.checkUpdate')}>
              <SettingItem label={t('settings.autoCheckUpdate')} description={t('settings.autoCheckUpdateDesc')}>
                <ToggleSwitch 
                  checked={settings.autoCheckUpdate}
                  onChange={settings.setAutoCheckUpdate}
                />
              </SettingItem>
              <SettingItem label={t('settings.checkUpdate')} description={`${t('settings.version')}: 0.1.4`}>
                <button
                  onClick={() => {
                    window.open('https://github.com/legeling/PromptHub/releases', '_blank');
                  }}
                  className="h-8 px-4 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
                >
                  {t('settings.checkUpdate')}
                </button>
              </SettingItem>
            </SettingSection>

            <SettingSection title={t('settings.openSource')}>
              <SettingItem label="GitHub" description={t('settings.viewOnGithub')}>
                <a 
                  href="https://github.com/legeling/PromptHub" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  GitHub
                </a>
              </SettingItem>
            </SettingSection>

            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              MIT License © 2025 PromptHub
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 设置侧边栏 */}
      <div className="w-56 bg-card border-r border-border flex flex-col">
        {/* 返回按钮 */}
        <div className="p-3 border-b border-border">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>{t('common.back')}</span>
          </button>
        </div>

        {/* 菜单列表 */}
        <nav className="flex-1 overflow-y-auto p-2">
          {SETTINGS_MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeSection === item.id
                  ? 'bg-primary text-white'
                  : 'text-foreground/80 hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 设置内容区 - 自适应宽度 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold mb-6">
            {t(SETTINGS_MENU.find((m) => m.id === activeSection)?.labelKey || '')}
          </h1>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// 设置区块组件 - 扁平化设计
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="bg-card rounded-lg border border-border">
        {children}
      </div>
    </div>
  );
}

// 设置项组件
function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// 开关组件
interface ToggleSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
}

function ToggleSwitch({ checked, onChange, defaultChecked = false }: ToggleSwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleClick = () => {
    const newValue = !isChecked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative w-12 h-7 rounded-full transition-all duration-200 flex-shrink-0 ${
        isChecked 
          ? 'bg-primary' 
          : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
          isChecked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

