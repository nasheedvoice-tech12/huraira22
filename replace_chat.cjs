const fs = require('fs');
const content = fs.readFileSync('src/components/AskVelcoraChat.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('return (') && l.includes('id="velcora-ask-ai-chat"') === false) - 2;
// wait, the actual return ( is at line 566.
const targetLineIndex = 565; // 0-indexed for 566

const topHalf = lines.slice(0, targetLineIndex).join('\n');

const newRender = `
  return (
    <div
      id="velcora-ask-ai-chat"
      className="bg-white rounded-2xl border border-[#E5E5EA] flex h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] overflow-hidden font-sans text-slate-800 shadow-xs"
      style={{
        '--velcora-accent': activePalette.hex,
        '--velcora-accent-hover': activePalette.hoverHex,
        '--velcora-accent-light': activePalette.lightBg,
        '--velcora-accent-ring': activePalette.ringHex,
      } as React.CSSProperties}
    >
      {/* Sidebar Navigation */}
      {showSidebar && (
        <div className="w-72 bg-[#F9F9FB] border-r border-[#E5E5EA] flex flex-col h-full shrink-0">
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--velcora-accent)]" />
              Conversations
            </span>
            <button
              onClick={handleNewSession}
              className="p-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[var(--velcora-accent)] hover:bg-slate-50 transition-colors shadow-xs"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#EFEFF4] border border-transparent rounded-lg pl-8 pr-8 py-1.5 text-[13px] text-slate-800 placeholder-slate-500 focus:outline-hidden focus:bg-white focus:border-[var(--velcora-accent)] focus:ring-2 focus:ring-[var(--velcora-accent-light)] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="px-3 pb-2 flex gap-1 border-b border-[#E5E5EA]">
            <button
              onClick={() => setSidebarTab('all')}
              className={\`flex-1 text-center py-1.5 text-[12px] font-medium rounded-md transition-colors \${
                sidebarTab === 'all'
                  ? 'bg-white shadow-xs text-slate-900 border border-[#E5E5EA]'
                  : 'text-slate-500 hover:bg-[#EFEFF4] border border-transparent'
              }\`}
            >
              All
            </button>
            <button
              onClick={() => setSidebarTab('pinned')}
              className={\`flex-1 text-center py-1.5 text-[12px] font-medium rounded-md transition-colors \${
                sidebarTab === 'pinned'
                  ? 'bg-white shadow-xs text-slate-900 border border-[#E5E5EA]'
                  : 'text-slate-500 hover:bg-[#EFEFF4] border border-transparent'
              }\`}
            >
              Pinned
            </button>
            <button
              onClick={() => setSidebarTab('archive')}
              className={\`flex-1 text-center py-1.5 text-[12px] font-medium rounded-md transition-colors \${
                sidebarTab === 'archive'
                  ? 'bg-white shadow-xs text-slate-900 border border-[#E5E5EA]'
                  : 'text-slate-500 hover:bg-[#EFEFF4] border border-transparent'
              }\`}
            >
              Archive
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-[12px]">
                No conversations found.
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
                    className={\`group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors \${
                      isActive
                        ? 'bg-[var(--velcora-accent)] text-white'
                        : 'hover:bg-[#EFEFF4] text-slate-700'
                    }\`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={\`text-[13px] truncate font-semibold \${isActive ? 'text-white' : 'text-slate-900'}\`}>
                        {s.title}
                      </span>
                      <div className={\`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity \${isActive ? 'text-white/80' : 'text-slate-400'}\`}>
                        <button onClick={(e) => togglePinSession(s.id, e)} className="hover:text-amber-500"><Pin className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => toggleArchiveSession(s.id, e)} className="hover:text-indigo-500"><Archive className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDeleteSession(s.id, e)} className="hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {s.messages.length > 0 && (
                      <p className={\`text-[11px] truncate \${isActive ? 'text-white/80' : 'text-slate-500'}\`}>
                        {s.messages[s.messages.length - 1].content.replace(/[*#\`_]/g, '')}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="h-14 border-b border-[#E5E5EA] flex items-center justify-between px-4 shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors rounded-md">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold tracking-tight text-slate-900">
                {activeSession?.title || 'Velcora Assistant'}
              </span>
              <span className="text-[11px] text-slate-500">Unified Intelligence</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2">
            <select
              value={activeModelId}
              onChange={(e) => setActiveModelId(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-medium text-slate-600 focus:outline-hidden hover:text-slate-900 cursor-pointer border border-[#E5E5EA] rounded-md px-2 py-1"
            >
              {aiModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-12 xl:px-32 2xl:px-48 py-8 space-y-6" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[var(--velcora-accent-light)] flex items-center justify-center border border-[var(--velcora-accent)] shadow-xs">
                <Sparkles className="w-7 h-7 text-[var(--velcora-accent)]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">How can I help you today?</h1>
                <p className="text-[14px] text-slate-500">Your AI assistant is connected to your {activeBusiness.name} business data.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
                {starterPromptsToUse.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(starter.prompt)}
                    className="p-3.5 text-left border border-[#E5E5EA] rounded-xl hover:border-[var(--velcora-accent)] hover:shadow-xs transition-all group bg-white"
                  >
                    <span className="text-[13px] font-medium text-slate-800 block mb-1 group-hover:text-[var(--velcora-accent)] transition-colors">{starter.label}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{starter.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id}
                className={\`flex gap-4 max-w-3xl mx-auto \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#F9F9FB] border border-[#E5E5EA] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-slate-600" />
                  </div>
                )}
                
                <div className={\`flex flex-col gap-1 max-w-[85%] \${msg.role === 'user' ? 'items-end' : 'items-start'}\`}>
                  {msg.role === 'assistant' && (
                    <span className="text-[11px] font-medium text-slate-400 ml-1">Velcora AI</span>
                  )}
                  
                  <div
                    className={\`px-4 py-3 text-[14px] leading-relaxed \${
                      msg.role === 'user'
                        ? 'bg-slate-100 text-slate-900 rounded-2xl rounded-tr-sm'
                        : 'bg-transparent text-slate-800'
                    }\`}
                  >
                    {msg.attachmentPreview && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-[#E5E5EA] inline-block bg-white p-1 shadow-xs">
                        {msg.attachmentPreview.startsWith('data:image') ? (
                          <img src={msg.attachmentPreview} alt="Attachment" className="max-w-[200px] max-h-[200px] rounded object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-[#F9F9FB] rounded text-slate-700">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="text-[11px] font-medium">Document Attached</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={\`prose prose-sm max-w-none \${msg.role === 'user' ? 'prose-p:text-slate-900' : 'prose-slate prose-a:text-[var(--velcora-accent)] prose-a:no-underline hover:prose-a:underline prose-pre:bg-[#F9F9FB] prose-pre:border prose-pre:border-[#E5E5EA]'}\`}>
                      <Markdown>{msg.content}</Markdown>
                    </div>

                    {msg.actionProposal && (
                      <div className="mt-4 border border-[#E5E5EA] rounded-xl overflow-hidden bg-white shadow-xs max-w-md">
                        <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F9F9FB]">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Action Proposed
                          </div>
                          <span className={\`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide \${
                            msg.actionProposal.status === 'executed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }\`}>
                            {msg.actionProposal.status}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-[13px] text-slate-600">{msg.actionProposal.description}</p>
                          {msg.actionProposal.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => executeAiAction(msg.actionProposal!)}
                                className="flex-1 py-2 bg-[var(--velcora-accent)] text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
                              >
                                Execute Action
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 max-w-3xl mx-auto justify-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#F9F9FB] border border-[#E5E5EA] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex gap-1 items-center bg-transparent px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent sticky bottom-0 z-10 w-full max-w-4xl mx-auto">
          <form
            onSubmit={handleSendMessage}
            className="flex items-end gap-2 bg-[#F9F9FB] border border-[#E5E5EA] rounded-2xl p-2 shadow-xs focus-within:ring-2 focus-within:ring-[var(--velcora-accent-light)] focus-within:border-[var(--velcora-accent)] transition-all relative"
          >
            {attachedFile && (
              <div className="absolute -top-14 left-2 z-20">
                <div className="relative inline-block border border-[#E5E5EA] rounded-lg p-1 bg-white shadow-xs">
                  {attachedFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(attachedFile)} alt="preview" className="h-10 w-auto rounded object-cover" />
                  ) : (
                    <div className="h-10 px-3 flex items-center justify-center bg-slate-50 text-[11px] font-medium text-slate-600 rounded">
                      {attachedFile.name.substring(0, 15)}...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="absolute -top-2 -right-2 bg-slate-800 text-white p-0.5 rounded-full hover:bg-rose-500 transition-colors shadow-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
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
              className="p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-xl"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              rows={1}
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputMessage.trim() || attachedFile) {
                    handleSendMessage(e as any);
                  }
                }
              }}
              placeholder="Message Velcora..."
              className="flex-1 max-h-32 bg-transparent text-[14px] text-slate-900 placeholder-slate-400 focus:outline-hidden resize-none py-2 px-1"
            />
            <button
              type="submit"
              disabled={(!inputMessage.trim() && !attachedFile) || isLoading}
              className={\`p-2 rounded-xl transition-all shadow-xs \${
                inputMessage.trim() || attachedFile
                  ? 'bg-[var(--velcora-accent)] text-white hover:opacity-90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }\`}
              title="Send message"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">AI can make mistakes. Check important info.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/AskVelcoraChat.tsx', topHalf + '\n' + newRender);
