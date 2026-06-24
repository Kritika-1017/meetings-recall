import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllPending, updateActionItem } from '../services/api'
import { format } from 'date-fns'

export default function ActionItemsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllPending().then(r => setItems(r.data)).finally(() => setLoading(false))
  }, [])

  const toggleDone = async (item) => {
    await updateActionItem(item.id, { is_done: true })
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4">
        <Link to="/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">All Pending Action Items</h1>
        {loading ? <p>Loading...</p> : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">✅</p>
            <p>No pending action items!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow flex items-start gap-3">
                <input type="checkbox" checked={false} onChange={() => toggleDone(item)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded" />
                <div className="flex-1">
                  <p className="text-gray-800">{item.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    {item.owner_name && <span>👤 {item.owner_name}</span>}
                    {item.due_date && <span>📅 {format(new Date(item.due_date), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
