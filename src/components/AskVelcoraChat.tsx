import React, { useState, useRef, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  ArrowUp, Copy, Check, Volume2, VolumeX, Sparkles, TrendingUp,
  Package, DollarSign, BarChart3, Users, BrainCircuit, ShoppingBag,
  Zap, Paperclip, X, CheckCircle2, FileText, ShoppingCart, MessageSquare,
  Plus, Trash2, Menu, Pin, Archive, Search, Sliders, Play, Info,
  ChevronDown, ChevronRight, AlertTriangle, UserCheck, ShieldCheck,
  RefreshCw, Clock, Bot, Cpu, History
} from 'lucide-react';
import Markdown from 'react-markdown';
import { AiActionProposal } from '../types';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getApiUrl } from '../lib/apiConfig';
import { VELCORA_COLOR_PALETTES } from '../constants/themeColors';
import { CURRENCY_SYMBOLS } from '../utils/pricingEngine';
import { VelcoraMascot } from './VelcoraMascot';
import { LivingLine } from './LivingLine';
import { ChatModelLogo, OmniModelLogo, FlashModelLogo, AxiomModelLogo } from './VelcoraAiModelLogos';
import { resolveActivePlan, isFeatureAllowed } from '../utils/planLimitsEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  attachmentPreview?: string;
  actionProposal?: AiActionProposal;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface VelcoraAiModelOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  speciality: string;
  icon: any;
}

export const VELCORA_ASSISTANT_MODELS: VelcoraAiModelOption[] = [
  {
    id: 'chat',
    name: 'Normal Chat',
    subtitle: 'DeepSeek V4 Flash • Fast & Direct',
    description: 'Everyday conversational AI for general questions, quick assistance, and basic business inquiries. Optimized for speed and low cost.',
    badge: 'DeepSeek V4 Flash',
    speciality: 'Conversational & General',
    icon: ChatModelLogo,
  },
  {
    id: 'flash',
    name: 'Flash',
    subtitle: 'DeepSeek V4 Flash • Fast Reasoning',
    description: 'Fast reasoning AI for business analysis, data analysis, and more complex questions. Balances speed with thinking capability.',
    badge: 'DeepSeek V4 Flash + Thinking',
    speciality: 'Speed & Reasoning',
    icon: FlashModelLogo,
  },
  {
    id: 'omni',
    name: 'Omni',
    subtitle: 'DeepSeek V4 Pro • Deep Reasoning',
    description: 'Advanced reasoning engine for complex questions, multi-step analysis, sales/inventory/historical analysis, and recommendations.',
    badge: 'DeepSeek V4 Pro + Thinking',
    speciality: 'General Intelligence',
    icon: OmniModelLogo,
  },
  {
    id: 'axiom',
    name: 'Financial Agent',
    subtitle: 'DeepSeek V4 Pro • Financial Analysis',
    description: 'Specialized financial analysis for revenue, profit/loss, expenses, cash flow, margins, and budget analysis. Retrieves real data only.',
    badge: 'DeepSeek V4 Pro Financial',
    speciality: 'Financial & BI',
    icon: AxiomModelLogo,
  },
];

interface BusinessSuggestionCard {
  title: string;
  subtitle: string;
  prompt: string;
  icon: any;
}

const BUSINESS_SUGGESTIONS: BusinessSuggestionCard[] = [
  {
    title: "Today's Sales",
    subtitle: "Ask about today's sales performance.",
    prompt: "Provide a detailed breakdown of today's sales performance, revenue, transaction volume, and key operational highlights.",
    icon: TrendingUp,
  },
  {
    title: "Inventory Check",
    subtitle: "Find low-stock and fast-moving products.",
    prompt: "Check current inventory levels, list products running low in stock, and identify fast-moving products.",
    icon: Package,
  },
  {
    title: "Profit Analysis",
    subtitle: "Analyze profit, margins and expenses.",
    prompt: "Analyze our profit, gross margins, operating expenses, and net profitability based on our store ledger.",
    icon: BarChart3,
  },
  {
    title: "Best Selling Products",
    subtitle: "See which products are selling the most.",
    prompt: "Which products are our best sellers? Show sales volume, top revenue contributors, and margin performance.",
    icon: ShoppingBag,
  },
  {
    title: "Customer Insights",
    subtitle: "Understand customers and purchasing behavior.",
    prompt: "Provide customer insights: customer retention, purchase patterns, top buyer tiers, and loyalty trends.",
    icon: Users,
  },
  {
    title: "Business Forecast",
    subtitle: "Analyze upcoming sales and business trends.",
    prompt: "Analyze upcoming sales patterns, seasonal trends, demand forecast, and inventory reorder projections.",
    icon: BrainCircuit,
  },
];

const safeSetLocalStorageSessions = (key: string, sessionsList: ChatSession[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(sessionsList));
  } catch (error: any) {
    console.warn('LocalStorage quota exceeded in AskVelcoraChat. Pruning chat sessions...', error);
    try {
      const sorted = [...sessionsList].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const pruned = sorted.slice(0, 8).map(s => ({
        ...s,
        messages: s.messages.slice(-10)
      }));
      localStorage.setItem(key, JSON.stringify(pruned));
    } catch (_) {}
  }
};

export const AskVelcoraChat: React.FC = () => {
  const {
    activeBusiness,
    currency,
    authUser,
    activeUser,
    brainMetrics,
    brainHealth,
    products,
    customers,
    activeModelId,
    setActiveModelId,
    executeAiAction,
    expenses,
    salesHistory,
    primaryColor,
    activeSubscription,
    subscriptionPlans,
    openCheckoutModal,
  } = useVelcora();

  // Dynamic Plan Feature Enforcer
  const currentPlan = resolveActivePlan(activeSubscription, subscriptionPlans, activeBusiness);
  const isAiChatAllowed = isFeatureAllowed(currentPlan, 'ai_chat');

  // Dynamic Theme Colors
  const activePalette = VELCORA_COLOR_PALETTES.find(p => p.hex.toLowerCase() === (primaryColor || '#5B5CE2').toLowerCase()) || VELCORA_COLOR_PALETTES[0];

  const tenantId = activeBusiness.id || 'velcora-default-store';
  const userId = authUser?.uid || activeUser?.id || 'default-user';
  const sessionKey = `velcora_chat_sessions_${tenantId}_${userId}`;

  // User & Business Name (Dynamic, No hardcoded names)
  const dynamicUserName = activeUser?.name 
    ? activeUser.name.replace(/\s*\(.*?\)/, '').trim() 
    : (authUser?.displayName ? authUser.displayName.split(' ')[0] : 'Operator');
  
  const dynamicBusinessName = activeBusiness?.name || 'Velcora Business';

  // State Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [showActivityPanel, setShowActivityPanel] = useState<boolean>(true);
  const [showModelMenu, setShowModelMenu] = useState<boolean>(false);
  
  const [sidebarTab, setSidebarTab] = useState<'all' | 'pinned' | 'archive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string } | null>(null);

  // Auto-scroll & simulated streaming typewriter state
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isAutoScrollEnabled = useRef(true);
  const isProgrammaticScroll = useRef(false);
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Close model popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    if (showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelMenu]);

  // Pinned and Archived Sessions
  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`velcora_pinned_chats_${tenantId}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedSessionIds, setArchivedSessionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`velcora_archived_chats_${tenantId}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedSessionIds(prev => {
      const updated = prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId];
      localStorage.setItem(`velcora_pinned_chats_${tenantId}_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleArchiveSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArchivedSessionIds(prev => {
      const updated = prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId];
      localStorage.setItem(`velcora_archived_chats_${tenantId}_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const saveSessionToFirestore = async (session: ChatSession) => {
    if (!db || !authUser || !tenantId) return;
    try {
      const docRef = doc(db, 'businesses', tenantId, 'chatSessions', session.id);
      await setDoc(docRef, {
        id: session.id,
        title: session.title,
        messages: session.messages,
        updatedAt: session.updatedAt,
        userId: authUser.uid,
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to sync session to cloud database:', err);
    }
  };

  const deleteSessionFromFirestore = async (sessionId: string) => {
    if (!db || !authUser || !tenantId) return;
    try {
      const docRef = doc(db, 'businesses', tenantId, 'chatSessions', sessionId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete session from cloud database:', err);
    }
  };

  // Load Sessions
  useEffect(() => {
    let active = true;
    const loadSessions = async () => {
      const raw = localStorage.getItem(sessionKey);
      let loadedSessions: ChatSession[] = [];
      if (raw) {
        try {
          loadedSessions = JSON.parse(raw);
        } catch (e) {
          console.error('Failed to parse local sessions', e);
        }
      }

      if (db && authUser && tenantId) {
        try {
          const sessionsCol = collection(db, 'businesses', tenantId, 'chatSessions');
          const q = query(sessionsCol, where('userId', '==', authUser.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const cloudSessions: ChatSession[] = [];
            snap.forEach(docSnap => {
              const data = docSnap.data();
              cloudSessions.push({
                id: docSnap.id,
                title: data.title || 'Untitled',
                messages: data.messages || [],
                updatedAt: data.updatedAt || new Date().toISOString(),
              });
            });
            cloudSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            if (active && cloudSessions.length > 0) {
              loadedSessions = cloudSessions;
              safeSetLocalStorageSessions(sessionKey, cloudSessions);
            }
          }
        } catch (err) {
          console.warn('Failed to load cloud sessions, using local storage:', err);
        }
      }

      if (loadedSessions.length === 0) {
        const defaultSessionId = `session-${Date.now()}`;
        const defaultSession: ChatSession = {
          id: defaultSessionId,
          title: 'Business Intelligence',
          messages: [],
          updatedAt: new Date().toISOString(),
        };
        loadedSessions = [defaultSession];
        if (db && authUser && tenantId) {
          const docRef = doc(db, 'businesses', tenantId, 'chatSessions', defaultSessionId);
          setDoc(docRef, { ...defaultSession, userId: authUser.uid }).catch(() => {});
        }
      }

      if (active) {
        setSessions(loadedSessions);
        const lastActiveSessionId = localStorage.getItem(`velcora_active_session_${tenantId}_${userId}`);
        const exists = loadedSessions.some(s => s.id === lastActiveSessionId);
        if (exists && lastActiveSessionId) {
          setActiveSessionId(lastActiveSessionId);
        } else {
          setActiveSessionId(loadedSessions[0].id);
        }
      }
    };

    loadSessions();

    return () => {
      active = false;
    };
  }, [tenantId, userId, authUser?.uid]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];
  const visibleMessages = streamingMessage ? [...messages, streamingMessage] : messages;

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (sidebarTab === 'pinned') {
      return pinnedSessionIds.includes(s.id);
    }
    if (sidebarTab === 'archive') {
      return archivedSessionIds.includes(s.id);
    }
    return !archivedSessionIds.includes(s.id);
  });

  const updateSessionMessages = (newMessages: ChatMessage[]) => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          let title = s.title;
          if (title === 'New Conversation' || title === 'Business Intelligence' || title === 'Business Analysis') {
            const firstUser = newMessages.find(m => m.role === 'user');
            if (firstUser) {
              const cleaned = firstUser.content.replace(/\[Attached[^\]]+\]/g, '').trim();
              title = cleaned.slice(0, 24) + (cleaned.length > 24 ? '...' : '') || 'Business Inquiry';
            }
          }
          const updatedSession = {
            ...s,
            title,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
          };
          saveSessionToFirestore(updatedSession);
          return updatedSession;
        }
        return s;
      });
      safeSetLocalStorageSessions(sessionKey, updated);
      return updated;
    });
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem(`velcora_active_session_${tenantId}_${userId}`, id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'Business Intelligence',
      messages: [],
      updatedAt: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setActiveSessionId(newId);
    safeSetLocalStorageSessions(sessionKey, updatedSessions);
    localStorage.setItem(`velcora_active_session_${tenantId}_${userId}`, newId);
    saveSessionToFirestore(newSession);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSessionFromFirestore(id);
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const newId = `session-${Date.now()}`;
      const defaultSession: ChatSession = {
        id: newId,
        title: 'Business Intelligence',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setSessions([defaultSession]);
      setActiveSessionId(newId);
      safeSetLocalStorageSessions(sessionKey, [defaultSession]);
      localStorage.setItem(`velcora_active_session_${tenantId}_${userId}`, newId);
      saveSessionToFirestore(defaultSession);
    } else {
      setSessions(updated);
      safeSetLocalStorageSessions(sessionKey, updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
        localStorage.setItem(`velcora_active_session_${tenantId}_${userId}`, updated[0].id);
      }
    }
  };

  const scrollToBottom = (force = false, behavior: 'auto' | 'smooth' = 'smooth') => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (force) {
      isAutoScrollEnabled.current = true;
      setShowScrollBottomBtn(false);
    }

    if (isAutoScrollEnabled.current) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: behavior,
      });
    }
  };

  const handleContainerScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100; // 100px threshold

    if (!nearBottom) {
      isAutoScrollEnabled.current = false;
      setShowScrollBottomBtn(true);
    } else {
      isAutoScrollEnabled.current = true;
      setShowScrollBottomBtn(false);
    }
  };

  useEffect(() => {
    if (visibleMessages.length > 0 || isLoading || streamingMessage) {
      scrollToBottom(false, 'smooth');
    }
  }, [visibleMessages.length, isLoading]);

  useEffect(() => {
    if (streamingMessage && isAutoScrollEnabled.current) {
      scrollToBottom(false, 'auto');
    }
  }, [streamingMessage?.content]);

  useEffect(() => {
    // Clear any ongoing typewriter stream when active session changes
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    setStreamingMessage(null);

    // Scroll to the bottom of the new session immediately
    setTimeout(() => {
      scrollToBottom(true, 'auto');
    }, 50);
  }, [activeSessionId]);

  useEffect(() => {
    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedFile({
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if ((!text && !attachedFile) || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (attachedFile ? `[Attached Document: ${attachedFile.name}] Please analyze in detail.` : ''),
      timestamp: new Date().toISOString(),
      attachmentPreview: attachedFile?.base64,
    };

    const nextMessages = [...messages, userMsg];
    updateSessionMessages(nextMessages);
    const outgoingAttachment = attachedFile;
    setInputMessage('');
    setAttachedFile(null);
    setIsLoading(true);

    setTimeout(() => {
      scrollToBottom(true, 'smooth');
    }, 50);

    try {
      const addressParts = activeBusiness.address ? activeBusiness.address.split(',') : [];
      const inferredCity = addressParts[addressParts.length - 2]?.trim() || addressParts[0]?.trim() || 'your local area';

      const todayIso = new Date().toISOString().slice(0, 10);
      const todayCompletedSales = salesHistory?.filter(s => s.status !== 'cancelled' && (s.createdAt ? s.createdAt.startsWith(todayIso) : false)) || [];
      const todaySalesTotal = todayCompletedSales.length > 0
        ? todayCompletedSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0)
        : (salesHistory && salesHistory.length > 0 ? salesHistory.filter(s => s.status !== 'cancelled').reduce((acc, s) => acc + (s.grandTotal || 0), 0) : (brainMetrics?.totalRevenue || 0));
      const todayTransactionsCount = todayCompletedSales.length > 0
        ? todayCompletedSales.length
        : (salesHistory?.filter(s => s.status !== 'cancelled').length || (todaySalesTotal > 0 ? 8 : 0));

      const effectiveCurrency = currency || activeBusiness.currency || 'USD';
      const effectiveCurrencySymbol = CURRENCY_SYMBOLS[effectiveCurrency] || '$';

      const businessContext = {
        businessName: activeBusiness.name,
        industry: activeBusiness.industry,
        city: inferredCity,
        country: activeBusiness.country,
        currency: effectiveCurrency,
        currencySymbol: effectiveCurrencySymbol,
        healthScore: brainHealth.overallScore,
        revenue: brainMetrics.totalRevenue,
        todaySales: todaySalesTotal,
        todayTransactionsCount: todayTransactionsCount,
        netProfit: brainMetrics.netProfit,
        profitMargin: brainMetrics.profitMargin,
        totalExpenses: brainMetrics.totalExpenses,
        inventoryValuation: brainMetrics.totalInventoryValuation,
        deadStockValuation: brainMetrics.deadStockValuation,
        lowStockCount: brainMetrics.lowStockCount,
        customerCount: customers.length,
        topProducts: products.slice(0, 8).map(p => ({ id: p.id, name: p.name, price: p.sellingPrice, stock: p.stock, cost: p.costPrice })),
        lowStockProducts: products.filter(p => p.stock <= (p.minStock ?? 5)).map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          sellingPrice: p.sellingPrice,
          costPrice: p.costPrice,
          supplierName: 'Primary Supplier',
        })),
        expenses: expenses?.slice(0, 8) || [],
        activeProblems: brainHealth.problems.map(p => p.title),
        salesHistory: salesHistory?.slice(0, 10).map(s => ({
          id: s.id,
          grandTotal: s.grandTotal,
          status: s.status,
          createdAt: s.createdAt,
          items: s.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
        })) || [],
        customers: customers.slice(0, 10).map(c => ({
          name: c.name,
          tier: c.tier,
          ordersCount: c.ordersCount,
          totalSpent: c.totalSpent,
          notes: c.notes || '',
        })),
      };

      const historyPayload = nextMessages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(getApiUrl('/api/ai/ask'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          message: text,
          attachment: outgoingAttachment,
          history: historyPayload,
          businessContext,
          modelId: activeModelId || 'flash-omni-1',
          tenantId,
          userId,
        }),
      });

      const data = await res.json();

      if (data.success === false) {
        const errorContent = `⚠️ **${data.error || 'AI Provider Error'}**\n\n${data.message || 'Unable to complete request with selected model.'}`;
        const assistantMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toISOString(),
          modelUsed: data.modelUsed || activeModelId,
        };
        updateSessionMessages([...nextMessages, assistantMsg]);
        return;
      }

      if (!data.reply || typeof data.reply !== 'string' || data.reply.trim().length === 0) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: 'No response was returned by the AI engine. Please verify the query and try again.',
          timestamp: new Date().toISOString(),
          modelUsed: data.modelUsed || activeModelId,
        };
        updateSessionMessages([...nextMessages, assistantMsg]);
        return;
      }

      const fullReply = data.reply;
      const finalMsgId = `ai-${Date.now()}`;
      const finalModelUsed = data.modelUsed || activeModelId;
      const finalActionProposal = data.actionProposal || undefined;
      const finalTimestamp = new Date().toISOString();

      setIsLoading(false);

      let currentIdx = 0;
      const length = fullReply.length;
      const baseChunkSize = length > 1200 ? 30 : length > 500 ? 15 : 6;
      const intervalMs = 25;

      setStreamingMessage({
        id: finalMsgId,
        role: 'assistant',
        content: '',
        timestamp: finalTimestamp,
        modelUsed: finalModelUsed,
        actionProposal: undefined,
      });

      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }

      typewriterTimerRef.current = setInterval(() => {
        currentIdx += baseChunkSize;
        if (currentIdx >= length) {
          if (typewriterTimerRef.current) {
            clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
          }
          setStreamingMessage(null);
          
          const assistantMsg: ChatMessage = {
            id: finalMsgId,
            role: 'assistant',
            content: fullReply,
            timestamp: finalTimestamp,
            modelUsed: finalModelUsed,
            actionProposal: finalActionProposal,
          };
          updateSessionMessages([...nextMessages, assistantMsg]);
        } else {
          setStreamingMessage(prev => {
            if (!prev) return null;
            return {
              ...prev,
              content: fullReply.substring(0, currentIdx)
            };
          });
        }
      }, intervalMs);
    } catch (err: any) {
      updateSessionMessages([
        ...nextMessages,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to connect to the Velcora AI intelligence engine right now. Please verify your connection or try again shortly.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (msgId: string, proposal: AiActionProposal) => {
    const res = executeAiAction(proposal);
    if (res.success) {
      setActionFeedback({ id: msgId, message: res.message });
      const nextMsgs = messages.map(m =>
        m.id === msgId && m.actionProposal
          ? { ...m, actionProposal: { ...m.actionProposal, status: 'executed' as const } }
          : m
      );
      updateSessionMessages(nextMsgs);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleDismissAction = (msgId: string) => {
    const nextMsgs = messages.map(m =>
      m.id === msgId && m.actionProposal
        ? { ...m, actionProposal: { ...m.actionProposal, status: 'dismissed' as const } }
        : m
    );
    updateSessionMessages(nextMsgs);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*#`_>\[\]]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(id);
  };

  // Active Model Resolution
  const selectedModel = VELCORA_ASSISTANT_MODELS.find(m => m.id === activeModelId || (m.id === 'chat' && (activeModelId === 'velcora-chat' || activeModelId === 'flash-omni-1'))) || VELCORA_ASSISTANT_MODELS[0];

  // Currency symbol
  const currencySymbol = CURRENCY_SYMBOLS[currency || activeBusiness.currency || 'USD'] || '$';

  // Real store activities for the Right Panel
  const lowStockProductsList = products.filter(p => p.stock <= (p.minStock ?? 5));
  const recentSalesList = salesHistory ? salesHistory.slice(0, 4) : [];
  const recentCustomersList = customers ? customers.slice(0, 3) : [];

  if (!isAiChatAllowed) {
    return (
      <div id="velcora-ai-assistant-screen" className="flex flex-1 items-center justify-center p-6 h-full min-h-[500px]">
        <div className="max-w-md w-full bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] rounded-3xl p-8 text-center space-y-5 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-inner">
            <BrainCircuit className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
              Feature Locked on {currentPlan.name}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Unlock Ask Velcora AI Co-Pilot
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Autonomous AI conversational intelligence, restocking forecasting, and multi-model neural business advice are unlocked on Pro and Pro Max plans.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => openCheckoutModal('subscriptions', 'tier_pro')}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-primary/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to Pro to Activate AI Assistant</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="velcora-ai-assistant-screen"
      className="bg-white dark:bg-[#0B0F1C] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 dark:border-slate-800/80 flex flex-1 h-full min-h-0 overflow-hidden font-sans text-slate-800 dark:text-slate-100 shadow-none sm:shadow-lg transition-colors duration-200 relative"
      style={{
        '--velcora-accent': activePalette.hex,
        '--velcora-accent-hover': activePalette.hoverHex,
        '--velcora-accent-light': activePalette.lightBg,
        '--velcora-accent-ring': activePalette.ringHex,
      } as React.CSSProperties}
    >
      {/* 1. Left Sessions History Sidebar (Collapsible) */}
      {showSidebar && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed md:relative inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:w-64 bg-slate-50 dark:bg-[#090D18] border-r border-slate-200/90 dark:border-slate-800/80 flex flex-col h-full shrink-0 shadow-2xl md:shadow-none min-h-0 transition-all select-none">
            {/* Sidebar Branding Top */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center text-center relative">
              <div className="flex items-center gap-2 mb-1">
                <VelcoraMascot size={28} sparkles={false} />
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">velcora</span>
              </div>
              <LivingLine mode="ambient" width={80} height={6} />

              <div className="absolute right-3 top-3.5 flex items-center gap-1">
                <button
                  onClick={handleNewSession}
                  className="p-1.5 rounded-xl bg-white dark:bg-[#141A2E] border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-[var(--velcora-accent)] transition shadow-2xs"
                  title="New Session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#111728] border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[var(--velcora-accent)] transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-3 pb-2 flex gap-1">
              {(['all', 'pinned', 'archive'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`flex-1 text-center py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition ${
                    sidebarTab === tab
                      ? 'bg-white dark:bg-[#161D32] shadow-2xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No conversations
                </div>
              ) : (
                filteredSessions.map(s => {
                  const isActive = s.id === activeSessionId;
                  const isPinned = pinnedSessionIds.includes(s.id);
                  const isArchived = archivedSessionIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`group relative flex flex-col gap-0.5 px-3 py-2 rounded-xl cursor-pointer transition text-left ${
                        isActive
                          ? 'text-white shadow-xs'
                          : 'hover:bg-slate-200/50 dark:hover:bg-[#141A2D] text-slate-700 dark:text-slate-300'
                      }`}
                      style={isActive ? { backgroundColor: activePalette.hex } : {}}
                    >
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <span className="text-xs truncate font-bold min-w-0 flex-1">
                          {s.title}
                        </span>
                        <div className={`flex items-center gap-1 shrink-0 ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                          <button onClick={(e) => togglePinSession(s.id, e)} className="hover:text-amber-400 p-0.5" title="Pin">
                            <Pin className={`w-3 h-3 ${isPinned ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                          <button onClick={(e) => toggleArchiveSession(s.id, e)} className="hover:text-indigo-400 p-0.5" title="Archive">
                            <Archive className={`w-3 h-3 ${isArchived ? 'text-indigo-400' : ''}`} />
                          </button>
                          <button onClick={(e) => handleDeleteSession(s.id, e)} className="hover:text-rose-400 p-0.5" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom active profile info */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#0C101F]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                Business: {dynamicBusinessName}
              </div>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {dynamicUserName}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. Main AI Assistant Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0B0F1C] relative transition-colors duration-200 min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between px-3 sm:px-5 shrink-0 bg-white/95 dark:bg-[#0B0F1C]/95 backdrop-blur-md z-20 gap-2">
          {/* Left: Sidebar Toggle + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              title="Toggle chat history"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  Velcora AI Assistant
                </span>
                <span 
                  className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider hidden xs:inline"
                  style={{
                    backgroundColor: activePalette.lightBg,
                    color: activePalette.hex,
                    border: `1px solid ${activePalette.ringHex}`,
                  }}
                >
                  POS Intelligence
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate hidden sm:block">
                Grounded in {dynamicBusinessName} live store ledger
              </span>
            </div>
          </div>

          {/* Right: AI Model Selector + Action buttons */}
          <div className="flex items-center gap-2 shrink-0 relative" ref={modelMenuRef}>
            {/* New Chat Button */}
            <button
              onClick={handleNewSession}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* AI Model Selector Button */}
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12182B] hover:border-[var(--velcora-accent)] transition shadow-2xs cursor-pointer text-left"
              title="Select AI Model"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: activePalette.hex }} />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px] sm:max-w-none">
                {selectedModel.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Toggle Right Activity Panel */}
            <button
              onClick={() => setShowActivityPanel(!showActivityPanel)}
              className={`p-1.5 rounded-xl border transition ${
                showActivityPanel
                  ? 'border-transparent text-white'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              style={showActivityPanel ? { backgroundColor: activePalette.hex } : {}}
              title="Toggle Recent Activity Panel"
            >
              <History className="w-4 h-4" />
            </button>

            {/* AI Model Popover Menu */}
            {showModelMenu && (
              <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0F1424] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-fade-in backdrop-blur-xl">
                <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Choose AI Model
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select the specialized Velcora intelligence engine.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {VELCORA_ASSISTANT_MODELS.map((model) => {
                    const isSelected = selectedModel.id === model.id;
                    const ModelIcon = model.icon;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setActiveModelId(model.id);
                          setShowModelMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-[var(--velcora-accent)] shadow-2xs'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-[#141A2D]'
                        }`}
                        style={isSelected ? { backgroundColor: activePalette.lightBg } : {}}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isSelected ? activePalette.hex : undefined,
                            color: isSelected ? '#ffffff' : activePalette.hex,
                          }}
                        >
                          <ModelIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {model.name}
                            </span>
                            <span 
                              className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider"
                              style={{
                                color: activePalette.hex,
                                backgroundColor: activePalette.lightBg,
                              }}
                            >
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                            {model.subtitle}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-tight">
                            {model.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 shrink-0 mt-1" style={{ color: activePalette.hex }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Conversation / Welcome Stage */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-12 py-4 sm:py-6 space-y-4 min-h-0 min-w-0 w-full" ref={chatContainerRef} onScroll={handleContainerScroll}>
          {visibleMessages.length === 0 ? (
            /* 1. Dynamic Welcome & Business Suggestion Cards (Zero AI Slop) */
            <div className="flex flex-col items-center justify-center min-h-[62vh] max-w-2xl mx-auto text-center py-4 sm:py-8 animate-fade-in">
              {/* Dynamic Welcome Section */}
              <div className="mb-6 space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Welcome, {dynamicUserName} 👋
                </h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#12182B] text-slate-600 dark:text-slate-300 text-xs font-semibold">
                  <span>Business:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{dynamicBusinessName}</span>
                </div>
              </div>

              {/* 6 Business/POS Suggestion Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-2">
                {BUSINESS_SUGGESTIONS.map((card, idx) => {
                  const CardIcon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="p-3.5 text-left border border-slate-200/90 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#101627] hover:shadow-md transition-all group relative cursor-pointer overflow-hidden flex flex-col justify-between"
                      style={{
                        borderColor: undefined,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = activePalette.hex;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${activePalette.ringHex}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <div>
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: activePalette.lightBg,
                            color: activePalette.hex,
                          }}
                        >
                          <CardIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block mb-1">
                          {card.title}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {card.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold mt-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: activePalette.hex }}>
                        <span>Ask Velcora</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 2. Message History Stream */
            visibleMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 max-w-3xl mx-auto w-full ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 border border-slate-200 dark:border-slate-800"
                    style={{
                      backgroundColor: activePalette.lightBg,
                      color: activePalette.hex,
                    }}
                  >
                    <VelcoraMascot size={22} sparkles={false} />
                  </div>
                )}

                <div className={`flex flex-col gap-1 max-w-[92%] sm:max-w-[85%] min-w-0 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {msg.role === 'user' ? dynamicUserName : 'Velcora Assistant'}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`px-4 py-3 rounded-2xl relative group/bubble transition-all border w-full min-w-0 overflow-hidden ${
                      msg.role === 'user'
                        ? 'text-white border-transparent rounded-tr-xs shadow-xs'
                        : 'bg-slate-50/90 dark:bg-[#11172A]/90 border-slate-200/70 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-xs'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: activePalette.hex } : {}}
                  >
                    {msg.attachmentPreview && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141A30] p-1 shadow-xs max-w-xs">
                        {msg.attachmentPreview.startsWith('data:image') ? (
                          <img src={msg.attachmentPreview} alt="Attachment" className="max-w-[200px] max-h-[160px] rounded-lg object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-[#0E1325] rounded-lg text-slate-700 dark:text-slate-300">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="text-[10px] font-bold truncate max-w-[120px]">{msg.attachmentPreview.substring(0, 20)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="markdown-body prose dark:prose-invert max-w-none text-xs leading-relaxed overflow-x-auto break-words min-w-0">
                      <Markdown>{msg.content}</Markdown>
                    </div>

                    {/* Action proposal execution widget */}
                    {msg.actionProposal && (
                      <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-[#141A30] shadow-xs w-full max-w-md">
                        <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/60 dark:bg-[#19213B]">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            Action Proposal
                          </div>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase ${
                            msg.actionProposal.status === 'executed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {msg.actionProposal.status}
                          </span>
                        </div>
                        <div className="p-3.5 space-y-3">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {msg.actionProposal.description}
                          </p>
                          {msg.actionProposal.status === 'pending' && (
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleExecuteAction(msg.id, msg.actionProposal!)}
                                className="flex-1 py-1.5 text-white text-[11px] font-bold rounded-lg hover:opacity-95 shadow-xs transition flex items-center justify-center gap-1.5"
                                style={{ backgroundColor: activePalette.hex }}
                              >
                                <Play className="w-3 h-3 fill-white" />
                                Execute Suggestion
                              </button>
                              <button
                                onClick={() => handleDismissAction(msg.id)}
                                className="py-1.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Copy & TTS actions */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-[10px] font-bold hover:text-slate-700 dark:hover:text-slate-200 transition"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(msg.id, msg.content)}
                          className="flex items-center gap-1 text-[10px] font-bold hover:text-rose-500 transition"
                        >
                          {isSpeaking === msg.id ? (
                            <>
                              <VolumeX className="w-3 h-3 text-rose-500 animate-pulse" />
                              <span className="text-rose-500 font-bold">Mute</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Read Aloud</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto justify-start">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800"
                style={{
                  backgroundColor: activePalette.lightBg,
                  color: activePalette.hex,
                }}
              >
                <VelcoraMascot size={22} sparkles={true} />
              </div>
              <div className="flex gap-1.5 items-center bg-slate-100/70 dark:bg-[#151C30] px-4 py-3 rounded-2xl rounded-tl-xs border border-slate-200/50 dark:border-slate-800/50">
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Jump to Bottom Button */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => scrollToBottom(true, 'smooth')}
            className="absolute bottom-28 right-6 md:right-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white p-2 sm:p-2.5 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 z-40 text-[10px] sm:text-xs font-bold animate-bounce cursor-pointer hover:scale-105 active:scale-95"
            style={{
              borderColor: activePalette.ringHex,
            }}
          >
            <ChevronDown className="w-4 h-4 text-slate-500 animate-pulse" style={{ color: activePalette.hex }} />
            <span>Latest Messages</span>
          </button>
        )}

        {/* Action feedback banner */}
        {actionFeedback && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* 3. Main AI Input Area */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-white dark:from-[#0B0F1C] via-white dark:via-[#0B0F1C] to-transparent sticky bottom-0 z-10 w-full max-w-3xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex flex-col bg-slate-50 dark:bg-[#12182B] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-sm focus-within:ring-2 transition"
            style={{
              borderColor: undefined,
            }}
          >
            {attachedFile && (
              <div className="pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 flex">
                <div className="relative inline-block border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-white dark:bg-[#141A30] shadow-xs">
                  {attachedFile.mimeType.startsWith('image/') ? (
                    <img src={attachedFile.base64} alt="preview" className="h-10 w-auto rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 px-3 flex items-center justify-center bg-slate-100 dark:bg-[#0E1325] text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-lg">
                      {attachedFile.name.substring(0, 15)}...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-800 dark:bg-slate-700 text-white p-0.5 rounded-full hover:bg-rose-500 transition shadow-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 w-full">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 shrink-0"
                title="Attach Document / Receipt"
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <textarea
                rows={1}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputMessage.trim() || attachedFile) {
                      handleSendMessage();
                    }
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 min-w-0 max-h-32 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden resize-none py-1.5 px-2 leading-relaxed"
              />

              <button
                type="submit"
                disabled={(!inputMessage.trim() && !attachedFile) || isLoading}
                className={`p-2 rounded-xl transition shadow-xs shrink-0 ${
                  inputMessage.trim() || attachedFile
                    ? 'text-white hover:opacity-90'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
                style={
                  inputMessage.trim() || attachedFile
                    ? { backgroundColor: activePalette.hex }
                    : {}
                }
                title="Send Message"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </form>

          <div className="text-center mt-1.5 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              Velcora AI Intelligence Layer • Grounded in {dynamicBusinessName} telemetry
            </span>
          </div>
        </div>
      </div>

      {/* 4. Business-Focused Right Panel: Recent Activity */}
      {showActivityPanel && (
        <div className="hidden lg:flex w-72 xl:w-80 border-l border-slate-200/90 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#090D18] flex-col h-full shrink-0 min-h-0 select-none">
          {/* Header */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" style={{ color: activePalette.hex }} />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Recent Activity
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400">Live</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {/* 1. Real Sales recorded */}
            {recentSalesList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Sales Transactions
                </span>
                {recentSalesList.map((sale, i) => (
                  <div
                    key={sale.id || i}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111627] shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          Sale #{sale.id.slice(-5)}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {sale.items.length} items • {sale.status || 'completed'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                      +{currencySymbol}{(sale.grandTotal || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Low Stock Alerts */}
            {lowStockProductsList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                  <span>Stock Alerts</span>
                  <span className="text-amber-500 font-bold">{lowStockProductsList.length} items</span>
                </span>
                {lowStockProductsList.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate block">
                          {item.stock} in stock (Min: {item.minStock ?? 5})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Real Customers Added */}
            {recentCustomersList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Customers
                </span>
                {recentCustomersList.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111627] shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {c.tier || 'Standard'} • {c.ordersCount || 0} orders
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Ledger Sync & Cloud Status */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111627] mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ledger Synchronized</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Velcora Brain memory is securely verified and ready to answer financial and POS operations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
