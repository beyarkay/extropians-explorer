/** URL helpers for internal navigation */

export const authorPath = (name: string) => `/author/${encodeURIComponent(name)}`
export const threadPath = (threadId: string) => `/thread/${encodeURIComponent(threadId)}`
export const messagePath = (id: number) => `/message/${id}`
