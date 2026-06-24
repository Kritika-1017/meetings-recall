import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle expired or invalid tokens (401 Unauthorized) by logging out the user
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)

// Meetings
export const getMeetings = (project) => api.get('/meetings', { params: { project } })
export const createMeeting = (data) => api.post('/meetings', data)
export const getMeeting = (id) => api.get(`/meetings/${id}`)
export const uploadAudio = (id, formData) => api.post(`/meetings/${id}/upload-audio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getPreMeetingBrief = (id) => api.get(`/meetings/${id}/brief`)
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`)

// Transcripts
export const getTranscript = (id) => api.get(`/transcripts/${id}`)
export const updateTranscript = (id, text) => api.put(`/transcripts/${id}`, { transcript: text })

// Action Items
export const getAllPending = () => api.get('/action-items')
export const getMeetingItems = (meetingId) => api.get(`/action-items/meeting/${meetingId}`)
export const addActionItem = (meetingId, data) => api.post(`/action-items/meeting/${meetingId}`, data)
export const updateActionItem = (id, data) => api.patch(`/action-items/${id}`, data)
export const deleteActionItem = (id) => api.delete(`/action-items/${id}`)

// Follow-ups
export const draftFollowup = (meetingId, recipient) => api.post(`/followups/meeting/${meetingId}/draft`, { recipient })
export const sendFollowup  = (followupId)           => api.post(`/followups/${followupId}/send`)
export const updateFollowup = (followupId, data)   => api.patch(`/followups/${followupId}`, data)
export const deleteFollowup = (followupId)          => api.delete(`/followups/${followupId}`)
export const uploadAttachment = (followupId, formData) => api.post(`/followups/${followupId}/attach`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const removeAttachment = (followupId)        => api.delete(`/followups/${followupId}/attach`)
export const getFollowups  = (meetingId)            => api.get(`/followups/meeting/${meetingId}`)

export default api
