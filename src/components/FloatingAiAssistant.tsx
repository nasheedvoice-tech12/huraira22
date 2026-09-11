import React from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { Sparkles } from 'lucide-react';

export const FloatingAiAssistant: React.FC = () => {
  const {
    currentModule,
    setCurrentModule,
    setActiveMode,
  } = useVelcora();

  // If the user is already on the central Chat with Velcora page, do not render the shortcut
  if (currentModule === 'ask_velcora') {
    return null;
  }

  const handleOpenCentralChat = () => {
    setActiveMode('business');
    setCurrentModule('ask_velcora');
  };

  return (
    <button
      id="btn-floating-ask-velcora"
      onClick={handleOpenCentralChat}
      className="fixed bottom-5 right-5 z-40 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-primary hover:bg-primary-hover text-white rounded-full shadow-xl shadow-primary/25 flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer group select-none"
      title="Ask Velcora - Open Central AI Chat"
      aria-label="Open Velcora AI Chat"
    >
      <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform shrink-0" />
      <span className="text-xs font-extrabold tracking-wide">Ask Velcora</span>
    </button>
  );
};
