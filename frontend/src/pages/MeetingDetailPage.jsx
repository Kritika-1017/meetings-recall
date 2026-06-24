import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMeeting, uploadAudio, getPreMeetingBrief, updateActionItem, draftFollowup, sendFollowup, updateFollowup, deleteFollowup, uploadAttachment, removeAttachment } from '../services/api'
import { format } from 'date-fns'
import useAuthStore from '../store/authStore'

export default function MeetingDetailPage() {
  const { id }               = useParams()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [brief, setBrief]    = useState(null)
  const [recipient, setRecipient] = useState('')
  const [drafting, setDrafting]   = useState(false)
  const [followups, setFollowups] = useState([])
  const [editingFollowupId, setEditingFollowupId] = useState(null)
  const [editRecipient, setEditRecipient] = useState('')
  const [editSubject, setEditSubject]     = useState('')
  const [editBody, setEditBody]           = useState('')
  const [saving, setSaving]               = useState(false)
  const [showFormattingBar, setShowFormattingBar] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker]     = useState(false)
  const [initialBodyHTML, setInitialBodyHTML]     = useState('')
  const [expandedEmails, setExpandedEmails]       = useState({})
  const [showProfileMenu, setShowProfileMenu]     = useState(false)
  const { logout, user }                          = useAuthStore()

  const convertToHTML = (text) => {
    if (!text) return ''
    const hasHtmlBlocks = /<(div|p|ul|ol|li|br|a)\b/i.test(text);

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Restore allowed formatting tags with attributes case-insensitively
    html = html.replace(/&lt;(b|strong|em|i|u|div|p|ul|ol|li|br|span|a)\b(.*?)&gt;/gi, '<$1$2>')
    html = html.replace(/&lt;\/(b|strong|em|i|u|div|p|ul|ol|li|br|span|a)&gt;/gi, '</$1>')
    html = html.replace(/&amp;nbsp;/g, '&nbsp;')

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #7C3AED; text-decoration: underline;">$1</a>')
    
    if (!hasHtmlBlocks) {
      html = html.replace(/\n/g, '<br/>')
    } else {
      html = html.replace(/\n/g, '')
    }
    return html
  }

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value)
    const editor = document.getElementById(`body-edit-${editingFollowupId}`)
    if (editor) {
      setEditBody(editor.innerHTML)
    }
  }

  const handleInsertLink = () => {
    const url = prompt("Enter URL (e.g., https://google.com):")
    if (!url) return

    // Get current text selection to pre-fill the text prompt
    const selection = window.getSelection()
    const selectedText = selection ? selection.toString() : ""
    const text = prompt("Enter Link Text (optional):", selectedText)

    const finalUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`
    const linkText = text || selectedText || url

    document.execCommand('insertHTML', false, `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${linkText}</a>`)

    const editor = document.getElementById(`body-edit-${editingFollowupId}`)
    if (editor) {
      setEditBody(editor.innerHTML)
    }
  }

  const handleInsertEmoji = (emoji) => {
    document.execCommand('insertText', false, emoji)
    const editor = document.getElementById(`body-edit-${editingFollowupId}`)
    if (editor) {
      setEditBody(editor.innerHTML)
    }
    setShowEmojiPicker(false)
  }

  const renderFormattedBody = (text) => {
    if (!text) return null
    const htmlContent = convertToHTML(text)
    return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />
  }


  useEffect(() => {
    getMeeting(id).then(r => { setMeeting(r.data); setFollowups(r.data.followups || []) }).finally(() => setLoading(false))
  }, [id])

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true); setUploadError('')
    const fd = new FormData(); fd.append('audio', file)
    try {
      const res = await uploadAudio(id, fd)
      setMeeting(res.data)
    } catch (err) {
      console.error(err)
      setUploadError(err.response?.data?.detail || 'Failed to transcribe and analyze audio. Please check your Groq API key.')
    } finally {
      setUploading(false)
    }
  }

  const handleBrief = async () => {
    const res = await getPreMeetingBrief(id)
    setBrief(res.data.brief)
  }

  const toggleDone = async (item) => {
    await updateActionItem(item.id, { is_done: !item.is_done })
    setMeeting(prev => ({
      ...prev,
      action_items: prev.action_items.map(a => a.id === item.id ? {...a, is_done: !a.is_done} : a)
    }))
  }

  const handleDraft = async () => {
    if (!recipient) return
    setDrafting(true)
    const res = await draftFollowup(id, recipient)
    setFollowups(prev => [...prev, res.data])
    setDrafting(false); setRecipient('')
  }

  const handleSend = async (followupId) => {
    await sendFollowup(followupId)
    setFollowups(prev => prev.map(f => f.id === followupId ? {...f, sent: true} : f))
  }

  const handleEditStart = (f) => {
    setEditingFollowupId(f.id)
    setEditRecipient(f.recipient)
    setEditSubject(f.subject)
    const htmlBody = convertToHTML(f.body)
    setEditBody(htmlBody)
    setInitialBodyHTML(htmlBody)
  }

  const handleEditSave = async (followupId) => {
    const textContent = editBody.replace(/<[^>]*>/g, '').trim()
    if (!editRecipient || !editSubject || !textContent) {
      alert("Please fill in all fields (Recipient, Subject, and Body).")
      return
    }
    setSaving(true)
    try {
      const res = await updateFollowup(followupId, {
        recipient: editRecipient,
        subject: editSubject,
        body: editBody
      })
      setFollowups(prev => prev.map(f => f.id === followupId ? res.data : f))
      setEditingFollowupId(null)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndSend = async (followupId) => {
    const textContent = editBody.replace(/<[^>]*>/g, '').trim()
    if (!editRecipient || !editSubject || !textContent) {
      alert("Please fill in all fields (Recipient, Subject, and Body).")
      return
    }
    setSaving(true)
    try {
      // 1. Save edits
      const res = await updateFollowup(followupId, {
        recipient: editRecipient,
        subject: editSubject,
        body: editBody
      })
      
      // 2. Send email
      await sendFollowup(followupId)
      
      // Update followups state (mark as sent)
      setFollowups(prev => prev.map(f => f.id === followupId ? { ...res.data, sent: true } : f))
      setEditingFollowupId(null)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to save and send email')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (followupId) => {
    if (!window.confirm("Are you sure you want to delete this follow-up email?")) return
    try {
      await deleteFollowup(followupId)
      setFollowups(prev => prev.filter(f => f.id !== followupId))
    } catch (err) {
      console.error(err)
      alert('Failed to delete follow-up email')
    }
  }

  const handleAttach = async (e, followupId) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await uploadAttachment(followupId, fd)
      setFollowups(prev => prev.map(f => f.id === followupId ? res.data : f))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to upload attachment')
    }
  }

  const handleRemoveAttach = async (followupId) => {
    try {
      const res = await removeAttachment(followupId)
      setFollowups(prev => prev.map(f => f.id === followupId ? res.data : f))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-8 text-gray-500 text-center font-medium bg-[#FAFAF7] min-h-screen pt-20">Loading meeting details...</div>
  if (!meeting) return <div className="p-8 text-red-500 text-center font-medium bg-[#FAFAF7] min-h-screen pt-20">Meeting not found</div>

  const meetingIdInt = parseInt(id) || 0
  const palette = (() => {
    const idx = meetingIdInt % 3
    if (idx === 0) {
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        accentBg: 'bg-emerald-500',
        focusRing: 'focus:ring-emerald-500/25',
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/40',
        dot: 'bg-emerald-500',
      }
    } else if (idx === 1) {
      return {
        text: 'text-rose-500',
        bg: 'bg-rose-50',
        border: 'border-rose-100',
        accentBg: 'bg-rose-450',
        focusRing: 'focus:ring-rose-400/25',
        badge: 'bg-rose-50 text-rose-700 border border-rose-200/40',
        dot: 'bg-rose-400',
      }
    } else {
      return {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        accentBg: 'bg-indigo-500',
        focusRing: 'focus:ring-indigo-500/25',
        badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/40',
        dot: 'bg-indigo-500',
      }
    }
  })()

  const sortedActionItems = [...(meeting.action_items || [])].sort((a, b) => {
    if (a.is_done === b.is_done) return 0
    return a.is_done ? 1 : -1
  })

  const renderSummary = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    const isBulletLine = (line) => /^\s*[\*\-\^]\s+/.test(line)
    
    const renderList = (items, key) => (
      <ul key={key} className="space-y-3 my-3 pl-1.5 list-none">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-650 leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full ${palette.accentBg} mt-1.5 shrink-0`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
    
    const elements = []
    let keyCounter = 0
    let currentList = []
    
    lines.forEach((line, idx) => {
      if (isBulletLine(line)) {
        const content = line.replace(/^\s*[\*\-\^]\s+/, '').trim()
        currentList.push(content)
      } else {
        if (currentList.length > 0) {
          elements.push(renderList(currentList, `list-${keyCounter++}`))
          currentList = []
        }
        if (line.trim() !== '') {
          elements.push(
            <p key={`p-${idx}`} className="text-xs text-slate-650 leading-relaxed mb-3">
              {line.trim()}
            </p>
          )
        } else {
          elements.push(<div key={`space-${idx}`} className="h-2" />)
        }
      }
    })
    
    if (currentList.length > 0) {
      elements.push(renderList(currentList, `list-${keyCounter++}`))
    }
    
    return <div className="space-y-1">{elements}</div>
  }

  const shouldShowExpandButton = (bodyText) => {
    if (!bodyText) return false
    return bodyText.length > 300 || bodyText.includes('\n') || bodyText.includes('<br') || bodyText.includes('<p>')
  }

  const toggleEmailExpand = (emailId) => {
    setExpandedEmails(prev => ({
      ...prev,
      [emailId]: !prev[emailId]
    }))
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-24 font-sans text-gray-900 selection:bg-purple-100 selection:text-purple-800">
      
      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-100 px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0 group">
            <div className="bg-purple-600 text-white p-2 rounded-xl shadow-md shadow-purple-100 group-hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent hidden sm:inline-block">
              Meeting Memory
            </span>
          </Link>
          
          <div className="flex-1" />

          {/* Right Navigation Elements */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Profile Menu */}
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center focus:outline-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:opacity-90 transition">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Account</p>
                    <p className="text-xs font-bold text-slate-700 truncate mt-1.5" title={user?.email}>{user?.email}</p>
                  </div>
                  <button onClick={logout} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Header / Title block */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to="/dashboard" className="flex items-center gap-1 group font-bold tracking-wide hover:text-purple-600 text-slate-500 transition-colors">
              <span className="text-sm transition-transform group-hover:-translate-x-0.5">←</span>
              <span className="hover:underline">Back to Meetings</span>
            </Link>
          </div>
          
          <div className="space-y-3.5">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {meeting.project && (
                <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${palette.badge}`}>
                  {meeting.project}
                </span>
              )}
              <p className="text-slate-400 text-xs font-semibold flex items-center gap-1.5 select-none">
                <span>📅</span>
                <span>{format(new Date(meeting.date), 'MMMM d, yyyy')}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Audio Upload */}
        {!meeting.raw_transcript && (
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className={`p-2 rounded-xl ${palette.bg} ${palette.text}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </div>
              <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Upload Meeting Audio</h2>
            </div>
            
            {uploadError && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-650 text-xs font-semibold">
                ⚠️ {uploadError}
              </div>
            )}
            
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-8 cursor-pointer bg-slate-50/30 hover:bg-slate-50 transition duration-200">
              <div className="text-center space-y-2">
                <span className="text-3xl block">🎙️</span>
                <p className="text-xs font-bold text-slate-700">Click to upload meeting audio</p>
                <p className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">MP3, WAV, M4A up to 25MB</p>
              </div>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleAudioUpload} 
                disabled={uploading}
                className="hidden" 
              />
            </label>
            
            {uploading && (
              <div className="flex items-center justify-center gap-2 text-purple-650 text-xs font-bold animate-pulse pt-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Transcribing and analyzing with AI... Please wait</span>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {meeting.summary && (
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5 gap-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${palette.bg} ${palette.text}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
                </div>
                <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Meeting Summary</h2>
              </div>
              <button 
                onClick={handleBrief} 
                className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full border border-purple-200 text-purple-650 hover:bg-purple-50 active:scale-95 text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <span>✨</span> Generate Pre-Meeting Brief
              </button>
            </div>

            <div className="space-y-1">
              {renderSummary(meeting.summary)}
            </div>

            {brief && (
              <div className="mt-5 bg-purple-50/50 p-5 rounded-2xl border border-purple-100 shadow-sm animate-fadeIn">
                <h3 className="font-bold text-purple-800 text-xs mb-2 flex items-center gap-1.5">
                  <span>📝</span> Pre-Meeting Brief
                </h3>
                <p className="text-purple-700/90 text-xs leading-relaxed whitespace-pre-wrap">{brief}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Items */}
        {meeting.action_items?.length > 0 && (
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className={`p-2 rounded-xl ${palette.bg} ${palette.text}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664a3.75 3.75 0 0 0 7.5 0c0-.23-.035-.454-.1-.664m-7.5 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Action Items</h2>
            </div>

            {/* Progress metrics */}
            {(() => {
              const total = meeting.action_items.length
              const completed = meeting.action_items.filter(a => a.is_done).length
              const pct = Math.round((completed / total) * 100)
              return (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Progress</span>
                    <span className={palette.text}>{completed} of {total} completed ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${palette.accentBg} transition-all duration-500 ease-out`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            <ul className="space-y-4">
              {sortedActionItems.map(item => (
                <li key={item.id} className="flex items-start gap-3.5 group">
                  <button
                    onClick={() => toggleDone(item)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 ${palette.focusRing} ${
                      item.is_done 
                        ? `${palette.accentBg} border-transparent text-white` 
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    {item.is_done && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-xs text-slate-700 font-semibold transition-all duration-305 leading-relaxed ${item.is_done ? 'line-through text-slate-400 opacity-60' : ''}`}>
                      {item.description}
                    </p>
                    {(item.owner_name || item.due_date) && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-400">
                        {item.owner_name && (
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-100/50 px-2 py-0.5 rounded">
                            👤 {item.owner_name}
                          </span>
                        )}
                        {item.due_date && (
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-100/50 px-2 py-0.5 rounded">
                            📅 {format(new Date(item.due_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Emails */}
        {meeting.summary && (
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className={`p-2 rounded-xl ${palette.bg} ${palette.text}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Follow-up Emails</h2>
            </div>

            {/* Recipient Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Recipient email (e.g., alex@company.com)" 
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="flex-1 bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-100 text-xs transition" 
              />
              <button 
                onClick={handleDraft} 
                disabled={drafting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                {drafting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <span>✉️</span>
                    <span>Draft Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Emails List */}
            <div className="space-y-4">
              {followups.map(f => (
                <div key={f.id}>
                  {editingFollowupId === f.id ? (
                    <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/85">
                      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs text-slate-400 font-bold w-12 select-none">To:</span>
                        <input 
                          type="email" 
                          value={editRecipient} 
                          onChange={e => setEditRecipient(e.target.value)}
                          className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none font-semibold" 
                          placeholder="Recipient email" 
                        />
                      </div>
                      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs text-slate-400 font-bold w-12 select-none">Subject:</span>
                        <input 
                          type="text" 
                          value={editSubject} 
                          onChange={e => setEditSubject(e.target.value)}
                          className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none font-semibold" 
                          placeholder="Subject" 
                        />
                      </div>
                      
                      {showFormattingBar && (
                        <div className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-1 rounded-full w-fit shadow-sm text-xs select-none">
                          <button type="button" onClick={() => handleFormat('bold')} className="hover:bg-slate-50 p-1.5 rounded-full font-bold w-8 h-8 flex items-center justify-center text-slate-700" title="Bold">B</button>
                          <button type="button" onClick={() => handleFormat('italic')} className="hover:bg-slate-50 p-1.5 rounded-full italic w-8 h-8 flex items-center justify-center text-slate-700" title="Italic">I</button>
                          <button type="button" onClick={() => handleFormat('underline')} className="hover:bg-slate-50 p-1.5 rounded-full underline w-8 h-8 flex items-center justify-center text-slate-700" title="Underline">U</button>
                          <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="hover:bg-slate-50 px-2.5 py-1 rounded-full font-bold text-[10px] text-slate-700" title="Bullet list">• List</button>
                        </div>
                      )}
                      
                      <div>
                        <div
                          id={`body-edit-${f.id}`}
                          contentEditable
                          dangerouslySetInnerHTML={{ __html: initialBodyHTML }}
                          onInput={e => setEditBody(e.currentTarget.innerHTML)}
                          className="rich-editor w-full min-h-[180px] max-h-[350px] overflow-y-auto bg-white text-xs text-slate-850 focus:outline-none border border-slate-200/85 rounded-xl p-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                          placeholder="Email body..."
                        />
                      </div>

                      {/* Attachment preview in edit view */}
                      {f.attachment_name && (
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 w-fit text-[10px] font-bold text-slate-655 shadow-sm">
                          <span>📎</span>
                          <span className="truncate max-w-[200px]">{f.attachment_name}</span>
                          <button onClick={() => handleRemoveAttach(f.id)} className="text-red-500 hover:text-red-750 p-0.5 ml-1 transition" title="Remove attachment">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* compose toolbar */}
                      <div className="flex flex-wrap items-center justify-between border-t border-slate-200/60 pt-4 mt-2 gap-3">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* Send Button */}
                          <button 
                            onClick={() => handleSaveAndSend(f.id)} 
                            disabled={saving} 
                            type="button"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-2.5 rounded-full text-xs inline-flex items-center shadow-sm disabled:opacity-50 transition"
                          >
                            {saving ? 'Sending...' : 'Send'}
                          </button>
                          
                          {/* Format (Aa) */}
                          <button 
                            onClick={() => setShowFormattingBar(!showFormattingBar)} 
                            className={`p-2 rounded-full transition ${showFormattingBar ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:bg-slate-200/60'}`} 
                            title="Formatting options" 
                            type="button"
                          >
                            <span className="font-serif font-black text-xs block leading-none select-none">Aa</span>
                          </button>

                          {/* Attach File (Paperclip) */}
                          <label 
                            htmlFor={`attach-edit-${f.id}`} 
                            className="text-slate-400 hover:bg-slate-200/60 p-2 rounded-full cursor-pointer inline-flex items-center transition" 
                            title="Attach files"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                            </svg>
                          </label>
                          <input id={`attach-edit-${f.id}`} type="file" onChange={(e) => handleAttach(e, f.id)} className="hidden" />

                          {/* Save Draft */}
                          <button 
                            onClick={() => handleEditSave(f.id)} 
                            disabled={saving}
                            className="text-slate-400 hover:bg-slate-200/60 p-2 rounded-full inline-flex items-center transition" 
                            title="Save draft" 
                            type="button"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>

                          {/* Insert Link */}
                          <button 
                            onClick={handleInsertLink} 
                            className="text-slate-400 hover:bg-slate-200/60 p-2 rounded-full transition inline-flex items-center" 
                            type="button" 
                            title="Insert link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                          </button>
                          
                          {/* Emoji Button Wrapper */}
                          <div className="relative inline-block">
                            <button 
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                              className="text-slate-400 hover:bg-slate-200/60 p-2 rounded-full transition inline-flex items-center" 
                              type="button" 
                              title="Insert emoji"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                              </svg>
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg grid grid-cols-4 gap-1.5 z-10 w-36">
                                {['😊', '👍', '🎉', '🙏', '📅', '💡', '👋', '✉️'].map(emoji => (
                                  <button key={emoji} type="button" onClick={() => handleInsertEmoji(emoji)} className="hover:bg-slate-100 p-1 text-base rounded text-center">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Cancel Button */}
                          <button 
                            onClick={() => setEditingFollowupId(null)} 
                            disabled={saving} 
                            type="button"
                            className="text-slate-400 hover:bg-slate-200/60 px-4.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          
                          {/* Discard Draft */}
                          <button 
                            onClick={() => handleDelete(f.id)} 
                            className="text-slate-400 hover:bg-slate-200/60 hover:text-rose-600 p-2 rounded-full transition" 
                            title="Discard draft" 
                            type="button"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-all duration-300 hover:shadow-md hover:border-slate-200">
                      {/* Avatar Circle */}
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${palette.bg} ${palette.text} font-bold text-sm shadow-inner`}>
                        ✉️
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Sender & Meta details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs">To: {f.recipient}</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Subject: {f.subject}</p>
                          </div>
                          {/* Status badge */}
                          <div className="shrink-0">
                            {f.sent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 px-2.5 py-0.5 rounded-full select-none">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-2.5 h-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-150 px-2.5 py-0.5 rounded-full select-none">
                                ✏️ Draft
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Body content */}
                        <div className={`text-xs text-slate-650 leading-relaxed mt-3 whitespace-pre-wrap overflow-hidden ${expandedEmails[f.id] ? '' : 'line-clamp-4'}`}>
                          {renderFormattedBody(f.body)}
                        </div>

                        {/* Show more/less */}
                        {shouldShowExpandButton(f.body) && (
                          <button 
                            onClick={() => toggleEmailExpand(f.id)} 
                            className="text-purple-600 hover:text-purple-700 text-[10px] font-extrabold mt-1.5 focus:outline-none block"
                          >
                            {expandedEmails[f.id] ? 'Show less ▲' : 'Show more ▼'}
                          </button>
                        )}

                        {/* Attachment Info */}
                        {f.attachment_name && (
                          <div className="mt-3.5 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100 w-fit text-[10px] font-bold text-slate-600 shadow-sm">
                            <span>📎</span>
                            <span className="truncate max-w-[240px]">{f.attachment_name}</span>
                            {!f.sent && (
                              <button onClick={() => handleRemoveAttach(f.id)} className="text-red-500 hover:text-red-750 p-0.5 ml-1 transition" title="Remove attachment">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {!f.sent ? (
                          <div className="flex items-center gap-4.5 mt-4.5 border-t border-slate-100 pt-3 flex-wrap">
                            <button onClick={() => handleSend(f.id)} className="inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                              </svg>
                              Send Email
                            </button>
                            <button onClick={() => handleEditStart(f)} className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(f.id)} className="inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-700 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
                            </button>
                            {!f.attachment_name && (
                              <label className="inline-flex items-center text-xs font-bold text-purple-650 hover:text-purple-700 cursor-pointer ml-auto transition select-none">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                </svg>
                                Attach File
                                <input type="file" onChange={(e) => handleAttach(e, f.id)} className="hidden" />
                              </label>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-4.5 border-t border-slate-100 pt-3">
                            <p className="text-xs text-green-500 font-semibold inline-flex items-center select-none">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              Sent
                            </p>
                            <button onClick={() => handleDelete(f.id)} className="inline-flex items-center text-xs text-red-500 hover:underline">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mr-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete Log
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
