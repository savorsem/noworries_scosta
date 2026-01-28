/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Settings, Wand2, UserCircle2, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { GenerationMode, SystemHealth, VeoModel } from '../types';
import { generateVideo, generatePreviewImage } from '../services/geminiService';
import { ApiKeyDialog } from './ApiKeyDialog';
import { SettingsDrawer } from './SettingsDrawer';
import { StudioAgent } from './StudioAgent';
import { fetchBlob } from '../utils/http';

interface BottomPromptBarProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    onGenerate: (mode: GenerationMode, model: VeoModel, referenceImages?: ImageFile[]) => void;
    isGenerating: boolean;
    systemHealth: SystemHealth;
    appMode: GenerationMode;
    selectedModel: VeoModel;
    setSelectedModel: (model: VeoModel) => void;
    useChain: boolean;
    setUseChain: (useChain: boolean) => void;
    selectedCameoIds: string[];
    setSelectedCameoIds: (ids: string[]) => void;
    profiles: CameoProfile[];
    setProfiles: (profiles: CameoProfile[]) => void;
}

export interface ImageFile {
    file: File;
    base64: string;
}

export interface CameoProfile {
    id: string;
    name: string;
    imageUrl: string;
}

const MODELS: { value: VeoModel; label: string; description: string }[] = [
    {
        value: VeoModel.VEO_2,
        label: 'Veo 2',
        description: 'Быстрее, иногда хуже качество'
    },
    {
        value: VeoModel.VEO_2_PLUS,
        label: 'Veo 2+ (Качество)',
        description: 'Лучше качество, медленнее'
    },
    {
        value: VeoModel.VEO_3,
        label: 'Veo 3 (Premium)',
        description: 'Лучшее качество, самое медленное'
    }
];

export function BottomPromptBar({
    prompt,
    setPrompt,
    onGenerate,
    isGenerating,
    systemHealth,
    appMode,
    selectedModel,
    setSelectedModel,
    useChain,
    setUseChain,
    selectedCameoIds,
    setSelectedCameoIds,
    profiles,
    setProfiles
}: BottomPromptBarProps) {
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [referenceImage, setReferenceImage] = useState<ImageFile | null>(null);
    const [referenceImages, setReferenceImages] = useState<ImageFile[]>([]);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showModelList, setShowModelList] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [cameoName, setCameoName] = useState('');
    const [cameoImage, setCameoImage] = useState<File | null>(null);
    const [cameoPreview, setCameoPreview] = useState<string | null>(null);

    const cameoRef = useRef<HTMLDivElement>(null);
    const modelListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!showModelList) return;
            if (!modelListRef.current) return;
            if (modelListRef.current.contains(e.target as Node)) return;
            setShowModelList(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showModelList]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!showAdvancedSettings) return;
            if (!cameoRef.current) return;
            if (cameoRef.current.contains(e.target as Node)) return;
            setShowAdvancedSettings(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAdvancedSettings]);

    const currentModelLabel = useMemo(() => {
        const item = MODELS.find(m => m.value === selectedModel);
        return item?.label ?? 'Выберите модель';
    }, [selectedModel]);

    const currentModelDesc = useMemo(() => {
        const item = MODELS.find(m => m.value === selectedModel);
        return item?.description ?? '';
    }, [selectedModel]);

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '';
            setReferenceImage({ file, base64 });
        };
        reader.readAsDataURL(file);
    };

    const handleMultipleFileUpload = (files: FileList) => {
        const newImages: ImageFile[] = [];
        let processed = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '';
                newImages.push({ file, base64 });
                processed++;
                if (processed === files.length) {
                    setReferenceImages(prev => [...prev, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleCameoImageUpload = (file: File) => {
        setCameoImage(file);
        setCameoPreview(URL.createObjectURL(file));
    };

    const addCameoProfile = () => {
        if (!cameoName.trim() || !cameoImage) return;

        const reader = new FileReader();
        reader.onload = () => {
            const imageUrl = typeof reader.result === 'string' ? reader.result : '';
            const newProfile: CameoProfile = {
                id: crypto.randomUUID(),
                name: cameoName.trim(),
                imageUrl
            };
            setProfiles([...profiles, newProfile]);
            setCameoName('');
            setCameoImage(null);
            setCameoPreview(null);
        };
        reader.readAsDataURL(cameoImage);
    };

    const removeCameoProfile = (id: string) => {
        setProfiles(profiles.filter(profile => profile.id !== id));
        setSelectedCameoIds(selectedCameoIds.filter(cId => cId !== id));
    };

    const toggleCameoSelection = (id: string) => {
        setSelectedCameoIds(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;

        let mode = appMode;
        let referenceImages: ImageFile[] | undefined;

        // Choose mode based on cameo selection
        if (selectedCameoIds.length > 1) {
            mode = GenerationMode.CAMEO_LOOP;

            // Collect all reference images for selected cameos
            referenceImages = [];
            for (const cameoId of selectedCameoIds) {
                const cameo = profiles.find(c => c.id === cameoId);
                if (!cameo) continue;

                let referenceImagesLocal: ImageFile[] | undefined;
                try {
                    const blob = await fetchBlob(cameo.imageUrl);
                    const base64 = cameo.imageUrl.includes('base64,')
                        ? cameo.imageUrl.split('base64,')[1]
                        : '';
                    referenceImagesLocal = [{ file: new File([blob], 'ref.png', { type: blob.type }), base64 }];
                } catch (e) {
                    console.warn('Failed to load cameo image', e);
                }

                if (referenceImagesLocal) {
                    referenceImages.push(...referenceImagesLocal);
                }
            }
        } else if (selectedCameoIds.length > 0) {
            mode = GenerationMode.CHARACTER_REPLACEMENT;
            const cameoId = selectedCameoIds[0];
            const cameo = profiles.find(c => c.id === cameoId);
            if (cameo) {
                try {
                    const blob = await fetchBlob(cameo.imageUrl);
                    const base64 = cameo.imageUrl.includes('base64,')
                        ? cameo.imageUrl.split('base64,')[1]
                        : '';
                    referenceImages = [{ file: new File([blob], 'ref.png', { type: blob.type }), base64 }];
                } catch (e) {
                    console.warn('Failed to load cameo image', e);
                }
            }
        } else {
            referenceImages = referenceImages?.length ? referenceImages : referenceImage ? [referenceImage] : undefined;
        }

        onGenerate(mode, selectedModel, referenceImages);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleGenerate();
        }
    };

    const healthBadge = useMemo(() => {
        if (systemHealth.status === 'healthy') {
            return (
                <span className="health-badge healthy">
                    <Sparkles size={14} />
                    System: OK
                </span>
            );
        }
        if (systemHealth.status === 'degraded') {
            return (
                <span className="health-badge degraded">
                    <Loader2 size={14} className="spin" />
                    System: Degraded
                </span>
            );
        }
        return (
            <span className="health-badge down">
                <X size={14} />
                System: Down
            </span>
        );
    }, [systemHealth.status]);

    return (
        <div className="bottom-prompt-container">
            <div className="bottom-prompt-inner">
                <div className="prompt-row">
                    <textarea
                        ref={promptRef}
                        className="prompt-input"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Опишите видео, которое хотите создать..."
                        rows={2}
                        disabled={isGenerating}
                    />

                    <button className="generate-btn" onClick={() => void handleGenerate()} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="spin" /> : <Wand2 />}
                        <span>{isGenerating ? 'Генерация...' : 'Создать'}</span>
                    </button>
                </div>

                <div className="toolbar-row">
                    <div className="left-tools">
                        <button
                            className="icon-btn"
                            onClick={() => setShowApiKeyDialog(true)}
                            title="API Key"
                        >
                            <UserCircle2 size={18} />
                        </button>

                        <button
                            className="icon-btn"
                            onClick={() => setShowSettingsDialog(true)}
                            title="Настройки"
                        >
                            <Settings size={18} />
                        </button>

                        <button
                            className="icon-btn"
                            onClick={() => setShowAdvancedSettings(prev => !prev)}
                            title="Расширенные настройки"
                        >
                            {showAdvancedSettings ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>

                    <div className="right-tools">
                        {healthBadge}
                    </div>
                </div>

                <AnimatePresence>
                    {showAdvancedSettings && (
                        <motion.div
                            ref={cameoRef}
                            className="advanced-settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className="settings-section">
                                <h3>Модель</h3>
                                <div className="model-selector">
                                    <button
                                        className="model-btn"
                                        onClick={() => setShowModelList(prev => !prev)}
                                    >
                                        <div className="model-btn-text">
                                            <span className="model-label">{currentModelLabel}</span>
                                            <span className="model-desc">{currentModelDesc}</span>
                                        </div>
                                        {showModelList ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    <AnimatePresence>
                                        {showModelList && (
                                            <motion.div
                                                ref={modelListRef}
                                                className="model-list"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                            >
                                                {MODELS.map(m => (
                                                    <button
                                                        key={m.value}
                                                        className={`model-item ${selectedModel === m.value ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setSelectedModel(m.value);
                                                            setShowModelList(false);
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="model-item-label">{m.label}</div>
                                                            <div className="model-item-desc">{m.description}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3>Cameo</h3>
                                <div className="cameo-add">
                                    <input
                                        type="text"
                                        placeholder="Имя персонажа"
                                        value={cameoName}
                                        onChange={e => setCameoName(e.target.value)}
                                        disabled={isGenerating}
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) handleCameoImageUpload(file);
                                        }}
                                        disabled={isGenerating}
                                    />
                                    <button
                                        className="add-btn"
                                        onClick={addCameoProfile}
                                        disabled={!cameoName.trim() || !cameoImage || isGenerating}
                                    >
                                        Добавить
                                    </button>
                                </div>
                                {cameoPreview && (
                                    <div className="cameo-preview">
                                        <img src={cameoPreview} alt="preview" />
                                    </div>
                                )}

                                <div className="cameo-list">
                                    {profiles.map(profile => (
                                        <div key={profile.id} className="cameo-item">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCameoIds.includes(profile.id)}
                                                    onChange={() => toggleCameoSelection(profile.id)}
                                                    disabled={isGenerating}
                                                />
                                                <span>{profile.name}</span>
                                            </label>
                                            <button
                                                className="icon-btn"
                                                onClick={() => removeCameoProfile(profile.id)}
                                                title="Удалить"
                                                disabled={isGenerating}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3>Режим</h3>
                                <div className="switch-row">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={useChain}
                                            onChange={e => setUseChain(e.target.checked)}
                                            disabled={isGenerating}
                                        />
                                        <span className="slider" />
                                    </label>
                                    <span>Использовать цепочку моделей</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ApiKeyDialog open={showApiKeyDialog} onClose={() => setShowApiKeyDialog(false)} />
            <SettingsDrawer open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
        </div>
    );
}
