import { sendSMS, processWebhook } from '../sms'

// Mock fetch globally
global.fetch = jest.fn()

describe('SMS Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendSMS', () => {
    it('successfully sends SMS', async () => {
      const mockResponse = { success: true, messageId: 'msg_123' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await sendSMS('+1234567890', 'Test message')

      expect(global.fetch).toHaveBeenCalledWith('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+1234567890', message: 'Test message' })
      })
      expect(result).toEqual(mockResponse)
    })

    it('throws error when API returns error response', async () => {
      const errorResponse = { error: 'Invalid phone number' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse)
      })

      await expect(sendSMS('invalid', 'Test message')).rejects.toThrow('Invalid phone number')
    })

    it('throws generic error when API fails and no error message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('JSON parse error'))
      })

      await expect(sendSMS('+1234567890', 'Test message')).rejects.toThrow('Failed to send SMS')
    })

    it('throws error when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(sendSMS('+1234567890', 'Test message')).rejects.toThrow('Network error')
    })

    it('handles empty message', async () => {
      const mockResponse = { success: true, messageId: 'msg_123' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await sendSMS('+1234567890', '')

      expect(global.fetch).toHaveBeenCalledWith('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+1234567890', message: '' })
      })
    })

    it('handles long messages', async () => {
      const longMessage = 'A'.repeat(1000)
      const mockResponse = { success: true, messageId: 'msg_123' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await sendSMS('+1234567890', longMessage)

      expect(global.fetch).toHaveBeenCalledWith('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+1234567890', message: longMessage })
      })
    })
  })

  describe('processWebhook', () => {
    it('handles webhook processing', () => {
      const mockRequest = {
        body: {
          From: '+1234567890',
          Body: 'Test response',
          MessageSid: 'msg_123'
        }
      }

      // Since processWebhook is currently empty, we just test it doesn't throw
      expect(() => processWebhook(mockRequest)).not.toThrow()
    })

    it('handles empty webhook request', () => {
      const mockRequest = {}

      expect(() => processWebhook(mockRequest)).not.toThrow()
    })
  })
})
