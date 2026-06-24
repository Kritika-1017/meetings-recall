import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createMeeting } from '../services/api'
import { useMeetings } from '../hooks/useMeetings'
import useAuthStore from '../store/authStore'
import { format } from 'date-fns'

const CARD_PALETTES = [
  {
    border: 'border-t-4 border-t-emerald-500',
    bar: 'bg-emerald-500',
    hover: 'hover:border-t-emerald-600 hover:shadow-lg hover:shadow-slate-100',
  },
  {
    border: 'border-t-4 border-t-rose-400',
    bar: 'bg-rose-400',
    hover: 'hover:border-t-rose-500 hover:shadow-lg hover:shadow-slate-100',
  },
  {
    border: 'border-t-4 border-t-indigo-500',
    bar: 'bg-indigo-500',
    hover: 'hover:border-t-indigo-600 hover:shadow-lg hover:shadow-slate-100',
  }
]

export default function DashboardPage() {
  const { meetings, setMeetings, loading } = useMeetings()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ title: '', project: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { logout, user }        = useAuthStore()
  const navigate                = useNavigate()

  const handleCreate = async (e) => {
    e.preventDefault()
    const res = await createMeeting(form)
    setMeetings(prev => [res.data, ...prev])
    setShowForm(false); setForm({ title: '', project: '' })
    navigate(`/meetings/${res.data.id}`)
  }

  // Filter meetings by search query
  const filteredMeetings = meetings.filter(m => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      m.title.toLowerCase().includes(query) ||
      (m.project && m.project.toLowerCase().includes(query)) ||
      (m.summary && m.summary.toLowerCase().includes(query))
    )
  })

  // Get total tasks and completed tasks to check task list metrics
  const upcomingTasks = []
  meetings.forEach(m => {
    if (m.action_items) {
      m.action_items.forEach(a => {
        if (!a.is_done) {
          upcomingTasks.push(a)
        }
      })
    }
  })

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

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.636Z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search meetings, projects, or summaries..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/60 border-0 focus:bg-white focus:ring-2 focus:ring-purple-500/25 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Right Navigation Elements */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Task Indicator */}
            <Link to="/action-items" className="relative p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-xl transition" title="Pending Tasks">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664a3.75 3.75 0 0 0 7.5 0c0-.23-.035-.454-.1-.664m-7.5 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              {upcomingTasks.length > 0 && (
                <span className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
                  {upcomingTasks.length}
                </span>
              )}
            </Link>

            {/* Profile Menu */}
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center focus:outline-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-505 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:opacity-90 transition">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 z-50">
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

      {/* Main Single Column Container */}
      <main className="max-w-4xl mx-auto px-6 pt-10 space-y-12">
        
        {/* Shrunk Pastel Gradient Hero Banner */}
        <div className="w-full bg-gradient-to-r from-violet-100/70 to-pink-100/70 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between shadow-sm relative overflow-hidden gap-6">
          <div className="space-y-2.5 max-w-xl text-center sm:text-left flex-1">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-white/70 px-2.5 py-0.5 rounded-full border border-purple-200/30">
              ✨ AI Meeting Assistant
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Never Lose a Meeting Detail Again
            </h2>
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-md mx-auto sm:mx-0">
              Automatically transcribe meetings, extract action items, generate summaries, and track follow-ups using AI.
            </p>
            <div className="pt-1.5">
              <button 
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold px-5.5 py-2.5 rounded-full shadow-md shadow-purple-500/10 transition-all text-xs"
              >
                🎤 New Meeting
              </button>
            </div>
          </div>
          
          {/* Proportional non-overlapping illustration */}
          <div className="w-32 h-32 md:w-44 md:h-44 shrink-0 flex items-center justify-center mt-4 sm:mt-0">
            <img 
              src="/assets/hero-meeting-3d.png" 
              alt="Meeting Illustration" 
              className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" 
            />
          </div>
        </div>

        {/* Create Meeting Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>➕</span> Create New Meeting
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Meeting Title</label>
                <input type="text" placeholder="e.g., Echo Vista Project Sync" value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-100 text-xs transition" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Name (optional)</label>
                <input type="text" placeholder="e.g., Echo Vista" value={form.project}
                  onChange={e => setForm({...form, project: e.target.value})}
                  className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-100 text-xs transition" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">
                Cancel
              </button>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 rounded-xl transition text-xs shadow-sm">
                Create Meeting
              </button>
            </div>
          </form>
        )}

        {/* Meetings Grid Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>📁</span> Your Meetings
              {searchQuery && <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Filter: "{searchQuery}"</span>}
            </h2>
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-10 font-medium bg-white rounded-2xl border border-slate-100 shadow-sm">Loading meetings...</p>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-4xl mb-4">🎙️</p>
              <p className="font-semibold text-slate-550">No meetings found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
              {filteredMeetings.map((m, index) => {
                const palette = CARD_PALETTES[index % CARD_PALETTES.length]
                
                // Calculate action items progress
                const totalItems = m.action_items?.length || 0
                const completedItems = m.action_items?.filter(a => a.is_done).length || 0
                const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

                return (
                  <Link 
                    key={m.id} 
                    to={`/meetings/${m.id}`}
                    className={`flex flex-col bg-white p-7 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 transform hover:-translate-y-1 ${palette.border} ${palette.hover}`}
                  >
                    {/* Header: Title and project tag */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        {/* Neutral project/general tag for clean look */}
                        {m.project ? (
                          <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {m.project}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            General
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider pt-0.5">
                          {format(new Date(m.date), 'MMM d, yyyy')}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-base leading-snug hover:text-purple-600 transition-colors">
                        {m.title}
                      </h3>
                    </div>

                    {/* Summary (max 2 lines) */}
                    <div className="py-4 flex-1">
                      {m.summary ? (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {m.summary}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic leading-relaxed">
                          No summary generated yet. Open meeting to upload audio.
                        </p>
                      )}
                    </div>

                    {/* Dynamic thin progress bar */}
                    {totalItems > 0 && (
                      <div className="space-y-1.5 pt-2 mt-auto">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Action items</span>
                          <span className="text-slate-600">{completedItems}/{totalItems} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${palette.bar} transition-all duration-500`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </main>

    </div>
  )
}
