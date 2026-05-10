export type VectorClock = Record<string, number>

export type ClockRelation = 'before' | 'after' | 'concurrent' | 'equal'

export function incrementClock(clock: VectorClock, profileId: string): VectorClock {
    return { ...clock, [profileId]: (clock[profileId] ?? 0) + 1 }
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
    const result: VectorClock = { ...a }
    for (const [key, value] of Object.entries(b)) {
        result[key] = Math.max(result[key] ?? 0, value)
    }
    return result
}

export function compareClocks(a: VectorClock, b: VectorClock): ClockRelation {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
    let aLess = false
    let bLess = false

    for (const key of allKeys) {
        const left = a[key] ?? 0
        const right = b[key] ?? 0
        if (left < right) aLess = true
        if (left > right) bLess = true
    }

    if (!aLess && !bLess) return 'equal'
    if (aLess && !bLess) return 'before'
    if (!aLess && bLess) return 'after'
    return 'concurrent'
}
