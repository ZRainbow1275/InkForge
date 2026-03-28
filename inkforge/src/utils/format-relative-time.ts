export function formatRelativeTime(date: Date | string | number): string {
    const value = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - value.getTime()

    if (diffMs < 0) return formatDate(value)

    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (
        value.getFullYear() === yesterday.getFullYear() &&
        value.getMonth() === yesterday.getMonth() &&
        value.getDate() === yesterday.getDate()
    ) {
        return '昨天'
    }

    if (diffDays < 30) return `${diffDays}天前`

    return formatDate(value)
}

function formatDate(value: Date): string {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
