import React, { useEffect, useRef, useState } from 'react'

/**
 * TREE AI — ChatGPT-style chat application
 * Layout: dark collapsible sidebar (conversations) + centered main chat column,
 * full-width message rows (no bubbles, ChatGPT-style), pill input pinned to
 * the bottom. Kept the Tree AI identity (bark/moss palette, Fraunces display
 * face) instead of defaulting to ChatGPT's own colors.
 */

const API_ENDPOINT = 'http://127.0.0.1:8000/api/chat'

const TOKENS = `
  :root{
    --paper:#FFFFFF;
    --paper-deep:#F4F6F4;
    --sidebar:#0F1310;
    --sidebar-hover:#1B1F1A;
    --sidebar-active:#232924;
    --sidebar-text:#ECEEEA;
    --sidebar-text-dim:#8B948A;
    --ink:#151813;
    --ink-soft:#6B7268;
    --bark:#18A957;
    --bark-deep:#129046;
    --moss:#1FAE63;
    --moss-light:#6FD89C;
    --line:#E7EAE5;
    --gold:#E8A33D;
    --urgent:#DC4D38;
    --urgent-bg:#FCEAE6;
  }
`

type Msg = { id: string; role: 'user' | 'assistant'; text: string; urgent?: boolean }
type Conversation = { id: string; title: string; messages: Msg[] }

const URGENT_PATTERN = /\b(emergency|urgent|call 911|seek immediate|go to (the )?er|red flag)\b/i

function extractReply(data: any): string {
  if (typeof data === 'string') return data
  return (
    data?.reply ??
    data?.message ??
    data?.response ??
    data?.text ??
    data?.answer ??
    data?.output ??
    (data?.choices && data.choices[0]?.message?.content) ??
    "I couldn't quite read that response — try asking again."
  )
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function formatInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  })
}

/** Minimal markdown renderer: #/##/### headers, **bold**, -/* bullet lists, paragraphs. */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let listBuffer: string[] = []
  let blockKey = 0

  function flushList() {
    if (listBuffer.length === 0) return
    blocks.push(
      <ul className="md-list" key={`ul-${blockKey++}`}>
        {listBuffer.map((item, i) => (
          <li key={i}>{formatInline(item, `li-${blockKey}-${i}`)}</li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()

    if (line === '') {
      flushList()
      return
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headerMatch) {
      flushList()
      const level = headerMatch[1].length
      const content = formatInline(headerMatch[2], `h-${blockKey}`)
      if (level === 1) blocks.push(<h3 className="md-h1" key={`h-${blockKey++}`}>{content}</h3>)
      else if (level === 2) blocks.push(<h4 className="md-h2" key={`h-${blockKey++}`}>{content}</h4>)
      else blocks.push(<h5 className="md-h3" key={`h-${blockKey++}`}>{content}</h5>)
      return
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1])
      return
    }

    flushList()
    blocks.push(
      <p className="md-p" key={`p-${blockKey++}`}>
        {formatInline(line, `p-${blockKey}`)}
      </p>
    )
  })

  flushList()
  return blocks
}

const GREETING: Msg = {
  id: 'greeting',
  role: 'assistant',
  text: "Hi, I'm Tree AI. Describe a symptom or how you're feeling, and I'll grow a clear, ranked picture of what might be going on — rooted in what you tell me, and flagged plainly if anything needs urgent care.",
}

function newConversation(): Conversation {
  return { id: uid(), title: 'New chat', messages: [GREETING] }
}

function TreeMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 30V17" stroke="var(--bark-deep)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 21L9 14M16 18L23 11M16 24L11 19" stroke="var(--bark)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="13" r="4.5" fill="var(--moss)" opacity="0.35" />
      <circle cx="23" cy="10" r="5.5" fill="var(--moss-light)" opacity="0.5" />
      <circle cx="16" cy="7" r="6" fill="var(--moss)" />
    </svg>
  )
}

function Avatar({ role }: { role: 'user' | 'assistant' }) {
  if (role === 'assistant') {
    return (
      <div className="avatar avatar-tree">
        <TreeMark size={18} />
      </div>
    )
  }
  return <div className="avatar avatar-user">Y</div>
}

function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  collapsed,
  onToggle,
}: {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="icon-btn" onClick={onToggle} title="Toggle sidebar">
          ☰
        </button>
        {!collapsed && (
          <div className="sidebar-brand">
            <TreeMark size={20} />
            <span>Tree AI</span>
          </div>
        )}
      </div>

      <button className="new-chat-btn" onClick={onNew}>
        <span className="plus">+</span>
        {!collapsed && <span>New chat</span>}
      </button>

      {!collapsed && (
        <div className="sidebar-list">
          <p className="sidebar-label">Recent</p>
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`sidebar-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="avatar avatar-user" style={{ width: 26, height: 26, fontSize: 12 }}>
            Y
          </div>
          {!collapsed && <span>Your account</span>}
        </div>
      </div>
    </aside>
  )
}

function Message({ msg }: { msg: Msg }) {
  return (
    <div className={`msg-row ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
      <Avatar role={msg.role} />
      <div className={`msg-content ${msg.urgent ? 'msg-urgent' : ''}`}>
        {msg.urgent && <span className="flag-icon">⚑</span>}
        {msg.role === 'assistant' && !msg.urgent ? (
          <div className="md">{renderMarkdown(msg.text)}</div>
        ) : (
          <span>{msg.text}</span>
        )}
      </div>
    </div>
  )
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()])
  const [activeId, setActiveId] = useState(conversations[0].id)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [active.messages, loading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  function updateActiveConversation(updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)))
  }

  function handleNew() {
    const c = newConversation()
    setConversations((prev) => [c, ...prev])
    setActiveId(c.id)
    setInput('')
    setError(null)
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Msg = { id: uid(), role: 'user', text }
    const isFirstUserMessage = active.messages.every((m) => m.role !== 'user')

    updateActiveConversation((c) => ({
      ...c,
      title: isFirstUserMessage ? text.slice(0, 40) + (text.length > 40 ? '…' : '') : c.title,
      messages: [...c.messages, userMsg],
    }))
    setInput('')
    setLoading(true)
    setError(null)

    const history = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.text }))

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history }),
      })

      if (!res.ok) throw new Error(`Server responded ${res.status}`)

      const data = await res.json()
      const reply = extractReply(data)

      updateActiveConversation((c) => ({
        ...c,
        messages: [...c.messages, { id: uid(), role: 'assistant', text: reply, urgent: URGENT_PATTERN.test(reply) }],
      }))
    } catch (err) {
      setError(
        "Tree AI couldn't reach the server just now — the assistant may be waking up (it can take ~30s on a cold start). Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="app">
      <style>{`
        ${TOKENS}
        *{box-sizing:border-box;}
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap');

        html, body, #root { height:100%; margin:0; }
        .app{
          height:100vh;
          width:100%;
          display:flex;
          background:var(--paper);
          color:var(--ink);
          font-family:'Inter',sans-serif;
          overflow:hidden;
        }

        /* ---------- Sidebar ---------- */
        .sidebar{
          width:268px;
          flex-shrink:0;
          background:var(--sidebar);
          color:var(--sidebar-text);
          display:flex;
          flex-direction:column;
          padding:10px;
          transition:width 0.18s ease;
        }
        .sidebar-collapsed{ width:64px; }
        .sidebar-top{ display:flex; align-items:center; gap:10px; padding:6px 6px 14px; }
        .sidebar-brand{ display:flex; align-items:center; gap:8px; font-family:'Fraunces',serif; font-weight:600; font-size:16px; }
        .icon-btn{ background:none; border:none; color:var(--sidebar-text); font-size:16px; cursor:pointer; padding:8px; border-radius:8px; line-height:1; }
        .icon-btn:hover{ background:var(--sidebar-hover); }

        .new-chat-btn{
          display:flex; align-items:center; gap:10px;
          background:transparent; border:1px solid rgba(231,226,210,0.25);
          color:var(--sidebar-text); border-radius:10px; padding:10px 12px;
          font-size:13.5px; font-weight:600; cursor:pointer; margin-bottom:14px;
        }
        .new-chat-btn:hover{ background:var(--sidebar-hover); }
        .plus{ font-size:16px; font-weight:400; }

        .sidebar-list{ flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:2px; }
        .sidebar-label{ font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--sidebar-text-dim); padding:6px 10px; margin:0; }
        .sidebar-item{
          text-align:left; background:none; border:none; color:var(--sidebar-text);
          padding:9px 10px; border-radius:8px; font-size:13.5px; cursor:pointer;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .sidebar-item:hover{ background:var(--sidebar-hover); }
        .sidebar-item.active{ background:var(--sidebar-active); }

        .sidebar-bottom{ border-top:1px solid rgba(231,226,210,0.15); padding-top:10px; }
        .sidebar-user{ display:flex; align-items:center; gap:10px; padding:8px 6px; font-size:13px; color:var(--sidebar-text); }

        /* ---------- Main column ---------- */
        .main{
          flex:1;
          display:flex;
          flex-direction:column;
          min-width:0;
          position:relative;
        }
        .main-header{
          display:flex; align-items:center; justify-content:center;
          padding:14px 20px; border-bottom:1px solid var(--line);
          font-family:'Fraunces',serif; font-style:italic; font-size:14.5px; color:var(--ink-soft);
          background:var(--paper);
        }

        .scroll-area{ flex:1; overflow-y:auto; }
        .thread{ max-width:740px; margin:0 auto; padding:28px 24px 140px; }

        .msg-row{ display:flex; gap:14px; padding:18px 4px; align-items:flex-start; }
        .msg-assistant{ background:var(--paper-deep); margin:0 -24px; padding:18px 24px; border-radius:14px; }
        .avatar{
          width:30px; height:30px; border-radius:8px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700;
        }
        .avatar-tree{ background:var(--moss); }
        .avatar-user{ background:#2B2F2A; color:#fff; }
        .msg-content{ font-size:15px; line-height:1.7; color:var(--ink); padding-top:4px; }
        .md{ display:flex; flex-direction:column; gap:10px; }
        .md-p{ margin:0; white-space:pre-wrap; }
        .md-h1{ font-family:'Fraunces',serif; font-weight:600; font-size:19px; margin:4px 0 0; }
        .md-h2{ font-family:'Fraunces',serif; font-weight:600; font-size:17px; margin:4px 0 0; }
        .md-h3{ font-weight:700; font-size:15px; margin:2px 0 0; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.03em; }
        .md-list{ margin:0; padding-left:20px; display:flex; flex-direction:column; gap:6px; }
        .md-list li{ padding-left:2px; }
        .md strong{ font-weight:700; color:var(--ink); }
        .msg-urgent{
          background:var(--urgent-bg); color:var(--urgent); border-radius:10px;
          padding:10px 14px; display:flex; gap:8px; font-weight:600; font-size:14px;
        }
        .flag-icon{ flex-shrink:0; }

        .typing-row{ display:flex; gap:14px; padding:18px 4px; align-items:center; }
        .typing-dots{ display:flex; gap:4px; padding-top:4px; }
        .typing-dots span{ width:6px; height:6px; border-radius:50%; background:var(--moss); animation:bounce 1.2s infinite ease-in-out; }
        .typing-dots span:nth-child(2){ animation-delay:0.15s; }
        .typing-dots span:nth-child(3){ animation-delay:0.3s; }
        @keyframes bounce{ 0%,80%,100%{ transform:translateY(0); opacity:0.5; } 40%{ transform:translateY(-4px); opacity:1; } }

        /* ---------- Composer ---------- */
        .composer-wrap{
          position:absolute; left:0; right:0; bottom:0;
          background:linear-gradient(to top, var(--paper) 55%, transparent);
          padding:18px 24px 14px;
        }
        .composer{ max-width:740px; margin:0 auto; }
        .composer-box{
          display:flex; align-items:flex-end; gap:8px;
          background:#fff; border:1px solid var(--line); border-radius:24px;
          padding:10px 10px 10px 18px; box-shadow:0 8px 24px -16px rgba(15,20,15,0.18);
        }
        .composer-box textarea{
          flex:1; border:none; outline:none; resize:none; background:transparent;
          font-family:'Inter',sans-serif; font-size:14.5px; color:var(--ink); line-height:1.5;
          max-height:160px; padding:6px 0;
        }
        .composer-box textarea::placeholder{ color:var(--ink-soft); }
        .send-btn{
          width:34px; height:34px; border-radius:50%; border:none; background:var(--bark);
          color:#fff; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
        }
        .send-btn:disabled{ background:var(--line); color:var(--ink-soft); cursor:not-allowed; }
        .send-btn:not(:disabled):hover{ background:var(--bark-deep); }
        .composer-note{ text-align:center; font-size:11.5px; color:var(--ink-soft); padding-top:10px; }
        .error-banner{
          max-width:740px; margin:0 auto 10px; background:var(--urgent-bg); color:var(--urgent);
          border-radius:10px; padding:10px 14px; font-size:13px; display:flex; gap:8px;
        }

        @media (max-width: 720px){
          .sidebar{ position:absolute; z-index:30; height:100%; }
          .sidebar-collapsed{ width:0; padding:0; overflow:hidden; }
          .msg-assistant{ margin:0 -16px; padding:18px 16px; }
          .thread{ padding:20px 14px 140px; }
        }
      `}</style>

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((s) => !s)}
      />

      <div className="main">
        <div className="main-header">Tree AI · health assistant</div>

        <div className="scroll-area" ref={scrollRef}>
          <div className="thread">
            {active.messages.map((m) => (
              <Message key={m.id} msg={m} />
            ))}
            {loading && (
              <div className="typing-row msg-assistant" style={{ margin: '0 -24px', padding: '18px 24px', borderRadius: 14 }}>
                <Avatar role="assistant" />
                <div className="typing-dots">
                  <span /> <span /> <span />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer-wrap">
          {error && (
            <div className="error-banner">
              <span className="flag-icon">⚑</span>
              <span>{error}</span>
            </div>
          )}
          <div className="composer">
            <div className="composer-box">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe how you're feeling…"
              />
              <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
                ↑
              </button>
            </div>
            <p className="composer-note">
              Tree AI gives general health information — not a diagnosis. In an emergency, contact local emergency services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App