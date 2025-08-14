import { GET } from '../route'

// Mock the Response object for testing
global.Response = class {
  status: number
  headers: Headers
  body: any

  constructor(body: any, init?: any) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers || {})
  }

  json() {
    return Promise.resolve(this.body)
  }

  static json(data: any) {
    return new global.Response(data, {
      headers: { 'content-type': 'application/json' }
    })
  }
} as any

describe('/api/projects', () => {
  describe('GET', () => {
    it('returns a response with projects data', async () => {
      const response = await GET()
      
      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('message')
      expect(data.message).toBe('All active projects with contractor counts')
    })

    it('returns JSON content type', async () => {
      const response = await GET()
      
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
