import { useState, useEffect } from 'react'
import { getMeetings } from '../services/api'

export function useMeetings(project = null) {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getMeetings(project)
      .then(res => setMeetings(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [project])

  return { meetings, setMeetings, loading, error }
}
