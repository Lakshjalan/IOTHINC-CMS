import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const SCHEDULER_CACHE_TAG = 'schedules'

export const useScheduler = () => {
  const { user } = useAuth()

  // Fetch the current user's schedule
  const {
    data: mySchedule = { busy_mask: '000000000000000000000000000000000000000000000000000000000000', updated_at: null, isNew: true },
    loading,
    error,
    isStale,
    refetch: refetchMySchedule,
    updateCache
  } = useCachedQuery(
    `my_schedule_${user?.id || 'none'}`,
    async () => {
      if (!user) return { busy_mask: '000000000000000000000000000000000000000000000000000000000000', updated_at: null, isNew: true }
      const { data, error: fetchErr } = await supabase
        .from('member_schedules')
        .select('busy_mask, updated_at')
        .eq('member_id', user.id)
        .maybeSingle()

      if (fetchErr) throw fetchErr
      return data || { busy_mask: '000000000000000000000000000000000000000000000000000000000000', updated_at: null, isNew: true }
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [SCHEDULER_CACHE_TAG, `my_schedule_${user?.id}`],
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      enabled: !!user
    }
  )

  // Save/Upsert own schedule
  const saveMySchedule = useCachedMutation(
    async (busyMask) => {
      if (!user) throw new Error('User must be authenticated')
      // Postgres bigint is a string in JavaScript when retrieved from Supabase to prevent precision issues,
      // but we can send it as a string or number when inserting/updating.
      const maskStr = busyMask.toString()
      const { data, error: saveErr } = await supabase
        .from('member_schedules')
        .upsert({
          member_id: user.id,
          busy_mask: maskStr,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (saveErr) throw saveErr
      return data
    },
    {
      invalidateTags: [SCHEDULER_CACHE_TAG, `my_schedule_${user?.id}`],
      onSuccess: (data) => {
        updateCache(data)
        refetchMySchedule()
      }
    }
  )

  // Fetch schedules of all members in a given team/department (or 'ALL' for everyone)
  const fetchTeamSchedules = useCachedQuery(
    `team_schedules_${null}`,
    async (teamId) => {
      if (!teamId) return []
      if (teamId === 'ALL') {
        return await fetchAllSchedules()
      }
      try {
        const { data, error: fetchErr } = await supabase
          .from('team_members')
          .select(`
            member_id,
            profiles:member_id (
              id,
              full_name,
              avatar_url,
              role,
              department,
              member_schedules:member_schedules (
                busy_mask,
                updated_at
              )
            )
          `)
          .eq('team_id', teamId)

        if (fetchErr) throw fetchErr

        return (data || []).map(row => {
          const profile = row.profiles
          const schedule = profile?.member_schedules?.[0] || profile?.member_schedules || null
          return {
            id: profile?.id,
            full_name: profile?.full_name || 'Unknown Member',
            avatar_url: profile?.avatar_url,
            role: profile?.role || 'member',
            department: profile?.department,
            busy_mask: schedule?.busy_mask || '000000000000000000000000000000000000000000000000000000000000',
            has_uploaded: !!schedule,
            updated_at: schedule?.updated_at
          }
        }).filter(m => m.id)
      } catch (err) {
        console.error('Error fetching team schedules:', err)
        throw err
      }
    },
    {
      ttl: 3 * 60 * 1000,
      tags: [SCHEDULER_CACHE_TAG],
      enabled: false // Called manually
    }
  )

  // Fetch all schedules for system-wide slot searches
  const fetchAllSchedules = useCachedQuery(
    `all_schedules`,
    async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            role,
            department,
            member_schedules:member_schedules (
              busy_mask,
              updated_at
            )
          `)
          .eq('needs_approval', false)
          .order('full_name')

        if (fetchErr) throw fetchErr

        return (data || []).map(profile => {
          const schedule = profile.member_schedules?.[0] || profile.member_schedules || null
          return {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role,
            department: profile.department,
            busy_mask: schedule?.busy_mask || '000000000000000000000000000000000000000000000000000000000000',
            has_uploaded: !!schedule,
            updated_at: schedule?.updated_at
          }
        })
      } catch (err) {
        console.error('Error fetching all schedules:', err)
        throw err
      }
    },
    {
      ttl: 5 * 60 * 1000,
      tags: [SCHEDULER_CACHE_TAG],
      enabled: false // Called manually
    }
  )

  return {
    mySchedule,
    loading,
    error,
    isStale,
    refetchMySchedule,
    saveMySchedule,
    fetchTeamSchedules: fetchTeamSchedules.getOrFetch,
    fetchAllSchedules: fetchAllSchedules.getOrFetch
  }
}

// Ultra-fast 72-bit Bitwise Engine Utilities for 300+ Members
// 72 bits = 6 days * 12 slots. Mask bit 1 = Busy, 0 = Free.

export const MASK_60_BITS = (1n << 60n) - 1n

/**
 * Convert 60-char string bitmask to BigInt
 */
export const maskToBigInt = (maskStr) => {
  if (!maskStr || typeof maskStr !== 'string') return 0n
  try {
    let val = 0n
    const len = Math.min(maskStr.length, 60)
    for (let i = 0; i < len; i++) {
      if (maskStr[i] === '1') {
        val |= (1n << BigInt(i))
      }
    }
    return val
  } catch {
    return 0n
  }
}

/**
 * Convert BigInt to 60-char string bitmask
 */
export const bigIntToMask = (bigIntVal) => {
  let str = ''
  for (let i = 0; i < 60; i++) {
    str += ((bigIntVal >> BigInt(i)) & 1n) === 1n ? '1' : '0'
  }
  return str
}

export const MASK_72_BITS = (1n << 72n) - 1n

/**
 * Check if a specific slot index is busy in a BigInt mask
 */
export const isSlotBusyBitwise = (bigIntMask, slotBitIndex) => {
  return ((bigIntMask >> BigInt(slotBitIndex)) & 1n) === 1n
}

/**
 * Ultra-fast member filtering for a specific slot (O(1) bitwise test per member)
 */
export const filterFreeMembersAtSlot = (membersWithBigInt, slotBitIndex) => {
  const targetBit = 1n << BigInt(slotBitIndex)
  return membersWithBigInt.filter(m => (m.maskBigInt & targetBit) === 0n)
}

/**
 * Calculate common free slots for a group of members using bitwise OR/NOT
 * Returns a BigInt where bit 1 = Free for ALL members in group, 0 = At least one member busy
 */
export const getGroupCommonFreeMask = (membersWithBigInt) => {
  if (!membersWithBigInt || membersWithBigInt.length === 0) return MASK_72_BITS
  let combinedBusy = 0n
  for (let i = 0; i < membersWithBigInt.length; i++) {
    combinedBusy |= membersWithBigInt[i].maskBigInt
  }
  return (~combinedBusy) & MASK_72_BITS
}