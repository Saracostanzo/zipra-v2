declare module 'google-auth-library' {
  export class GoogleAuth {
    constructor(options?: any)
    getClient(): Promise<{
      getAccessToken(): Promise<{ token?: string } | string | null>
    }>
  }
}
