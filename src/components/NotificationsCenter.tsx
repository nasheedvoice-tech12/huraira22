import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { useTranslation } from '../context/TranslationContext';
import {
  Bell, AlertTriangle, CheckCircle, Package,
  DollarSign, Shield, Sparkles, CheckCheck, Trash2, ArrowRight
} from 'lucide-react';
import { VelcoraNotificationsEngine, SystemNotification } from '../utils/notificationsEngine';

export const NotificationsCenter: React.FC = () => {
  const {
    setCurrentModule,
    products,
    sales,
    expenses,
    customerCredits,
    purchaseOrders,
    brainMetrics,
    currency
  } = useVelcora();
  const { t, locale, setLocale } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<'all' | 'stock' | 'sale' | 'security' | 'ai'>('all');
  const [readTick, setReadTick] = useState<number>(0);

  // Dynamically compute real system notifications
  const notifications: SystemNotification[] = useMemo(() => {
    return VelcoraNotificationsEngine.generateRealNotifications({
      products,
      sales,
      expenses,
      customerCredits,
      purchaseOrders,
      brainMetrics,
      currency,
    });
  }, [products, sales, expenses, customerCredits, purchaseOrders, brainMetrics, currency, readTick]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    VelcoraNotificationsEngine.markAllAsRead(notifications.map(n => n.id));
    setReadTick(prev => prev + 1);
  };

  const clearAll = () => {
    VelcoraNotificationsEngine.clearAll();
    setReadTick(prev => prev + 1);
  };

  const handleMarkSingleRead = (id: string) => {
    VelcoraNotificationsEngine.markAsRead(id);
    setReadTick(prev => prev + 1);
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock':
        return <Package className="w-4 h-4 text-amber-500" />;
      case 'sale':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'security':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="velcora-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Live System Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-600 text-white animate-pulse">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time operational alerts for low inventory, high-value sales, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="velcora-btn-secondary text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={clearAll}
            className="px-3 py-2 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="velcora-card p-2.5 flex items-center gap-2 overflow-x-auto">
        {(['all', 'stock', 'sale', 'security', 'ai'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeCategory === cat
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {cat === 'all' && <span>All Alerts ({notifications.length})</span>}
            {cat === 'stock' && (
              <>
                <Package className="w-3.5 h-3.5" />
                <span>Stock Alerts</span>
              </>
            )}
            {cat === 'sale' && (
              <>
                <DollarSign className="w-3.5 h-3.5" />
                <span>Sales & Revenue</span>
              </>
            )}
            {cat === 'security' && (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Security & Drawer</span>
              </>
            )}
            {cat === 'ai' && (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Insights</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.map((notif) => (
          <div
            key={notif.id}
            className={`velcora-card p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !notif.isRead
                ? 'border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/20'
                : 'opacity-85'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(notif.category)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {notif.title}
                  </h3>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                  <span className="text-[11px] text-slate-400 font-medium">
                    {notif.time}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {notif.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {notif.actionModule && (
                <button
                  onClick={() => {
                    handleMarkSingleRead(notif.id);
                    setCurrentModule(notif.actionModule);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors flex items-center gap-1"
                >
                  <span>{notif.actionLabel || 'View'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredNotifs.length === 0 && (
          <div className="velcora-card p-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
            <p className="text-xs text-slate-500">No active notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};
