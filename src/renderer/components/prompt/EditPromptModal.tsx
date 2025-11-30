import { useState, useEffect } from 'react';
import { Modal, Button, Input, Textarea } from '../ui';
import { HashIcon, XIcon, FolderIcon } from 'lucide-react';
import { usePromptStore } from '../../stores/prompt.store';
import { useFolderStore } from '../../stores/folder.store';
import { useTranslation } from 'react-i18next';
import type { Prompt } from '../../../shared/types';

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt;
}

export function EditPromptModal({ isOpen, onClose, prompt }: EditPromptModalProps) {
  const { t } = useTranslation();
  const updatePrompt = usePromptStore((state) => state.updatePrompt);
  const prompts = usePromptStore((state) => state.prompts);
  const folders = useFolderStore((state) => state.folders);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  
  // 获取所有已存在的标签
  const existingTags = [...new Set(prompts.flatMap((p) => p.tags))];

  // 当 prompt 变化时更新表单
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description || '');
      setSystemPrompt(prompt.systemPrompt || '');
      setUserPrompt(prompt.userPrompt);
      setTags(prompt.tags || []);
      setFolderId(prompt.folderId);
    }
  }, [prompt]);

  const handleSubmit = async () => {
    if (!title.trim() || !userPrompt.trim()) return;
    
    try {
      await updatePrompt(prompt.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        userPrompt: userPrompt.trim(),
        tags,
        folderId,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('prompt.editPrompt')} size="lg">
      <div className="space-y-5">
        {/* 标题 */}
        <Input
          label={t('prompt.titleLabel')}
          placeholder={t('prompt.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* 描述 */}
        <Input
          label={t('prompt.descriptionOptional')}
          placeholder={t('prompt.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* 文件夹 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {t('prompt.folderOptional')}
          </label>
          <div className="relative">
            <FolderIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || undefined)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="">{t('prompt.noFolder')}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.icon || '📁'} {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 标签 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {t('prompt.tagsOptional')}
          </label>
          {/* 已选标签 */}
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white"
              >
                <HashIcon className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-white/70"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {/* 已有标签选择 */}
          {existingTags.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1.5">{t('prompt.selectExistingTags')}</div>
              <div className="flex flex-wrap gap-1.5">
                {existingTags.filter(t => !tags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags([...tags, tag])}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted hover:bg-accent transition-colors"
                  >
                    <HashIcon className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 新建标签 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('prompt.enterTagHint')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 h-10 px-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all duration-200"
            />
            <Button variant="secondary" size="md" onClick={handleAddTag}>
              {t('prompt.addTag')}
            </Button>
          </div>
        </div>

        {/* System Prompt */}
        <Textarea
          label={t('prompt.systemPromptOptional')}
          placeholder={t('prompt.systemPromptPlaceholder')}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />

        {/* User Prompt */}
        <Textarea
          label={t('prompt.userPromptLabel')}
          placeholder={t('prompt.userPromptPlaceholder')}
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          className="min-h-[200px]"
        />

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!title.trim() || !userPrompt.trim()}
          >
            {t('prompt.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
