import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import {
  useScheduler,
  maskToBigInt,
  isSlotBusyBitwise,
  filterFreeMembersAtSlot
} from '../hooks/useScheduler'
import { useTeams } from '../hooks/useTeams'
import { useNotifications } from '../hooks/useNotifications'
import { TableSkeleton, ListSkeleton } from '../components/SkeletonLoaders'
import { Calendar } from '@phosphor-icons/react/dist/icons/Calendar'
import { Users } from '@phosphor-icons/react/dist/icons/Users'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/icons/MagnifyingGlass'
import { Clock } from '@phosphor-icons/react/dist/icons/Clock'
import { Check } from '@phosphor-icons/react/dist/icons/Check'
import { FloppyDisk } from '@phosphor-icons/react/dist/icons/FloppyDisk'
import { Trash } from '@phosphor-icons/react/dist/icons/Trash'
import { WarningCircle } from '@phosphor-icons/react/dist/icons/WarningCircle'
import { Lightning } from '@phosphor-icons/react/dist/icons/Lightning'
import { Sun } from '@phosphor-icons/react/dist/icons/Sun'
import { Briefcase } from '@phosphor-icons/react/dist/icons/Briefcase'
import { PencilSimple } from '@phosphor-icons/react/dist/icons/PencilSimple'
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { Bell } from '@phosphor-icons/react/dist/icons/Bell'

// Standard VIT Timetable Definition (Monday to Friday)
const VIT_TIMETABLE = {
  header: {
    theoryStart: ['08:00', '08:55', '09:50', '10:45', '11:40', '12:35', '14:00', '14:55', '15:50', '16:45', '17:40', '18:35'],
    theoryEnd: ['08:50', '09:45', '10:40', '11:35', '12:30', '13:25', '14:50', '15:45', '16:40', '17:35', '18:30', '19:25'],
    labStart: ['08:00', '08:50', '09:50', '10:40', '11:40', '12:30', '14:00', '14:50', '15:50', '16:40', '17:40', '18:30'],
    labEnd: ['08:50', '09:40', '10:40', '11:30', '12:30', '13:20', '14:50', '15:40', '16:40', '17:30', '18:30', '19:20']
  },
  days: [
    {
      name: 'MON',
      theory: ['A1', 'F1', 'D1', 'TB1', 'TG1', 'S11', 'A2', 'F2', 'D2', 'TB2', 'TG2', 'S3'],
      lab: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L31', 'L32', 'L33', 'L34', 'L35', 'L36']
    },
    {
      name: 'TUE',
      theory: ['B1', 'G1', 'E1', 'TC1', 'TAA1', '-', 'B2', 'G2', 'E2', 'TC2', 'TAA2', 'S1'],
      lab: ['L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L37', 'L38', 'L39', 'L40', 'L41', 'L42']
    },
    {
      name: 'WED',
      theory: ['C1', 'A1', 'F1', 'TD1', 'TBB1', '-', 'C2', 'A2', 'F2', 'TD2', 'TBB2', 'S4'],
      lab: ['L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L43', 'L44', 'L45', 'L46', 'L47', 'L48']
    },
    {
      name: 'THU',
      theory: ['D1', 'B1', 'G1', 'TE1', 'TCC1', '-', 'D2', 'B2', 'G2', 'TE2', 'TCC2', 'S2'],
      lab: ['L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L49', 'L50', 'L51', 'L52', 'L53', 'L54']
    },
    {
      name: 'FRI',
      theory: ['E1', 'C1', 'TA1', 'TF1', 'TDD1', 'S15', 'E2', 'C2', 'TA2', 'TF2', 'TDD2', '-'],
      lab: ['L25', 'L26', 'L27', 'L28', 'L29', 'L30', 'L55', 'L56', 'L57', 'L58', 'L59', 'L60']
    }
  ]
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const SLOT_TIME_LABELS = [
  '08:00 - 08:50 AM',
  '08:55 - 09:45 AM',
  '09:50 - 10:40 AM',
  '10:45 - 11:35 AM',
  '11:40 - 12:30 PM',
  '12:35 - 01:25 PM',
  '02:00 - 02:50 PM',
  '02:55 - 03:45 PM',
  '03:50 - 04:40 PM',
  '04:45 - 05:35 PM',
  '05:40 - 06:30 PM',
  '06:35 - 07:25 PM'
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
}

const Scheduler = () => {
  const { role, user, profile } = useAuth()
  const isLead = ['chairperson', 'vice_chairperson'].includes(role)

  const {
    mySchedule,
    saveMySchedule,
    fetchTeamSchedules,
    fetchAllSchedules
  } = useScheduler()

  const { teams } = useTeams()
  const { sendNotification } = useNotifications()

  // Tab State: 'my-timetable' | 'team-analyzer' | 'search-free'
  const [activeTab, setActiveTab] = useState('my-timetable')

  // My Timetable Editing & View Mode State
  const [selectedCells, setSelectedCells] = useState(new Set())
  const [isEditing, setIsEditing] = useState(false)
  const [isModified, setIsModified] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Team Analyzer State
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedAnalysisCell, setSelectedAnalysisCell] = useState(null) // { dayIndex, slotIndex }

  // Global Search State
  const [allSchedules, setAllSchedules] = useState([])
  const [searchDay, setSearchDay] = useState(0) // 0..4 Mon..Fri, 5 Sat
  const [searchSlot, setSearchSlot] = useState(0) // Slot 1
  const [searching, setSearching] = useState(false)

  // Saturday Dynamic Mapping State for Leadership (Chairperson, VC, Leads)
  const [satMode, setSatMode] = useState('working') // 'holiday' | 'working'
  const [satMappedDay, setSatMappedDay] = useState(0) // 0..4

  // Local storage key for persistent visual cell preferences
  const localStorageKey = user ? `iothinc_selected_cells_${user.id}` : null

  // Initialize UI cell selections & View/Edit mode
  useEffect(() => {
    if (localStorageKey) {
      const saved = localStorage.getItem(localStorageKey)
      if (saved) {
        try {
          const arr = JSON.parse(saved)
          setSelectedCells(new Set(arr))
          setIsModified(false)
          if (mySchedule && mySchedule.updated_at) {
            setIsEditing(false) // Permanent saved mode
          } else {
            setIsEditing(true)
          }
          return
        } catch (e) {
          console.error('Error parsing local selected cells:', e)
        }
      }
    }

    // Fallback: reconstruct from busy_mask
    if (mySchedule && mySchedule.busy_mask) {
      const newSet = new Set()
      const mask = mySchedule.busy_mask
      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        for (let slotIdx = 0; slotIdx < 12; slotIdx++) {
          const bitIndex = dayIdx * 12 + slotIdx
          if (mask[bitIndex] === '1') {
            const dayObj = VIT_TIMETABLE.days[dayIdx]
            const labCode = dayObj?.lab[slotIdx]
            if (labCode && labCode.startsWith('L')) {
              newSet.add(`${dayIdx}-${slotIdx}-lab`)
            } else {
              newSet.add(`${dayIdx}-${slotIdx}-theory`)
            }
          }
        }
      }
      setSelectedCells(newSet)
      setIsModified(false)
      if (mySchedule.updated_at) {
        setIsEditing(false)
      } else {
        setIsEditing(true)
      }
    } else {
      setIsEditing(true)
    }
  }, [mySchedule, localStorageKey])

  // Derive 60-bit busy_mask string
  const computedBusyMask = useMemo(() => {
    let mask = ''
    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      for (let slotIdx = 0; slotIdx < 12; slotIdx++) {
        const isBusy = selectedCells.has(`${dayIdx}-${slotIdx}-theory`) || selectedCells.has(`${dayIdx}-${slotIdx}-lab`)
        mask += isBusy ? '1' : '0'
      }
    }
    return mask
  }, [selectedCells])

  // Bitwise BigInt of logged-in user derived from computed mask
  const myBigIntMask = useMemo(() => maskToBigInt(computedBusyMask), [computedBusyMask])

  const getCellBitIndex = (dayIdx, slotIdx) => dayIdx * 12 + slotIdx

  const isSlotBusy = (maskBigInt, dayIdx, slotIdx) => {
    const bitIndex = getCellBitIndex(dayIdx, slotIdx)
    return isSlotBusyBitwise(maskBigInt, bitIndex)
  }

  // Toggle specific UI cell independently (Theory or Lab cell)
  const toggleCell = (dayIdx, slotIdx, type) => {
    if (!isEditing) return
    const key = `${dayIdx}-${slotIdx}-${type}`
    const nextSet = new Set(selectedCells)
    if (nextSet.has(key)) {
      nextSet.delete(key)
    } else {
      nextSet.add(key)
    }
    setSelectedCells(nextSet)
    setIsModified(true)
  }

  const clearMySchedule = () => {
    if (!isEditing) return
    if (window.confirm('Reset your entire timetable? (All slots will be cleared)')) {
      setSelectedCells(new Set())
      setIsModified(true)
    }
  }

  const handleSaveSchedule = async () => {
    setSaving(true)
    try {
      // Save 60-bit busy_mask string to Supabase
      await saveMySchedule(computedBusyMask)
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify([...selectedCells]))
      }

      // Notify Chairperson, VC & Leads about schedule change
      try {
        const memberName = profile?.full_name || user?.email || 'A member'
        const memberDept = profile?.department ? ` (${profile.department})` : ''
        const targetRoles = ['chairperson', 'vice_chairperson', 'department_lead']
        for (const roleName of targetRoles) {
          await sendNotification({
            title: 'Timetable Updated',
            message: `${memberName}${memberDept} has updated their availability timetable schedule.`,
            priority: 2,
            type: 'announcement',
            target_role: roleName
          })
        }
      } catch (notifErr) {
        console.warn('Notification log error:', notifErr)
      }

      setIsModified(false)
      setIsEditing(false) // Permanent saved mode
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      alert('Failed to save schedule: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Load team schedules for Team Analyzer
  useEffect(() => {
    if (activeTab === 'team-analyzer' && selectedTeamId) {
      const loadTeamSchedules = async () => {
        setAnalyzing(true)
        setSelectedAnalysisCell(null)
        try {
          const data = await fetchTeamSchedules(selectedTeamId)
          const parsedData = data.map(m => ({
            ...m,
            maskBigInt: maskToBigInt(m.busy_mask)
          }))
          setTeamMembers(parsedData)
        } catch (err) {
          console.error(err)
        } finally {
          setAnalyzing(false)
        }
      }
      loadTeamSchedules()
    }
  }, [activeTab, selectedTeamId])

  useEffect(() => {
    if (activeTab === 'team-analyzer' && !selectedTeamId) {
      setSelectedTeamId('ALL')
    }
  }, [activeTab, selectedTeamId])

  // Load all schedules for Global Search
  useEffect(() => {
    if (activeTab === 'search-free') {
      const loadAll = async () => {
        setSearching(true)
        try {
          const data = await fetchAllSchedules()
          const parsed = data.map(m => ({
            ...m,
            maskBigInt: maskToBigInt(m.busy_mask)
          }))
          setAllSchedules(parsed)
        } catch (err) {
          console.error(err)
        } finally {
          setSearching(false)
        }
      }
      loadAll()
    }
  }, [activeTab])

  // Team Stats calculation via BigInt
  const getCellStats = (dayIdx, slotIdx) => {
    if (teamMembers.length === 0) return { freeCount: 0, busyCount: 0, freeList: [], busyList: [], ratio: 1 }

    const bitIndex = getCellBitIndex(dayIdx, slotIdx)
    const targetBit = 1n << BigInt(bitIndex)

    const freeList = []
    const busyList = []

    for (let i = 0; i < teamMembers.length; i++) {
      const m = teamMembers[i]
      if ((m.maskBigInt & targetBit) !== 0n) {
        busyList.push(m)
      } else {
        freeList.push(m)
      }
    }

    return {
      freeCount: freeList.length,
      busyCount: busyList.length,
      freeList,
      busyList,
      ratio: freeList.length / teamMembers.length
    }
  }

  // Effective Day Index for Search (Handling Saturday Dynamic Mapping)
  const effectiveSearchDayIndex = useMemo(() => {
    if (searchDay === 5) {
      if (satMode === 'holiday') return -1
      return satMappedDay
    }
    return searchDay
  }, [searchDay, satMode, satMappedDay])

  // Search Results using BigInt bitwise filtering across 300+ members
  const freeMembersAtSearch = useMemo(() => {
    if (allSchedules.length === 0) return []
    if (effectiveSearchDayIndex === -1) {
      return allSchedules
    }
    const bitIndex = getCellBitIndex(effectiveSearchDayIndex, searchSlot)
    return filterFreeMembersAtSlot(allSchedules, bitIndex)
  }, [allSchedules, effectiveSearchDayIndex, searchSlot])

  // Render My Timetable Grid (Theory & Lab rows)
  const renderMyTimetableMatrix = () => {
    const header = VIT_TIMETABLE.header
    return (
      <div className="overflow-x-auto no-scrollbar pb-2">
        <table className="w-full min-w-[760px] border-collapse text-[10px] font-sans border border-outline-variant/30 bg-surface-container rounded-xl overflow-hidden shadow-sm">
          <thead>
            {/* Header Row 1: Theory Start */}
            <tr className="bg-surface-container-high/80 text-on-surface border-b border-outline-variant/30">
              <th rowSpan={2} colSpan={2} className="p-1 border-r border-b border-outline-variant/30 font-bold uppercase tracking-wider text-xs text-center w-24 bg-surface-container-highest">
                THEORY
              </th>
              <th className="px-2 py-0.5 border-r border-b border-outline-variant/30 font-semibold text-on-surface-variant bg-surface-container-high w-12 text-center">
                Start
              </th>
              {header.theoryStart.slice(0, 6).map((t, idx) => (
                <th key={`tstart-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center font-medium">
                  {t}
                </th>
              ))}
              <th rowSpan={4} className="px-2 py-2 border-r border-b border-outline-variant/30 font-bold text-on-surface bg-surface-container-highest text-center w-12 uppercase tracking-widest text-[9px] [writing-mode:vertical-lr] rotate-180">
                Lunch
              </th>
              {header.theoryStart.slice(6).map((t, idx) => (
                <th key={`tstart-pm-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center font-medium">
                  {t}
                </th>
              ))}
            </tr>

            {/* Header Row 2: Theory End */}
            <tr className="bg-surface-container-high/85 text-on-surface border-b border-outline-variant/30">
              <th className="px-2 py-0.5 border-r border-b border-outline-variant/30 font-semibold text-on-surface-variant bg-surface-container-high text-center">
                End
              </th>
              {header.theoryEnd.slice(0, 6).map((t, idx) => (
                <th key={`tend-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center text-on-surface-variant">
                  {t}
                </th>
              ))}
              {header.theoryEnd.slice(6).map((t, idx) => (
                <th key={`tend-pm-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center text-on-surface-variant">
                  {t}
                </th>
              ))}
            </tr>

            {/* Header Row 3: Lab Start */}
            <tr className="bg-surface-container-high/80 text-on-surface border-b border-outline-variant/30">
              <th rowSpan={2} colSpan={2} className="p-2 border-r border-b border-outline-variant/30 font-bold uppercase tracking-wider text-xs text-center bg-surface-container-highest">
                LAB
              </th>
              <th className="px-2 py-0.5 border-r border-b border-outline-variant/30 font-semibold text-on-surface-variant bg-surface-container-high text-center">
                Start
              </th>
              {header.labStart.slice(0, 6).map((t, idx) => (
                <th key={`lstart-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center font-medium">
                  {t}
                </th>
              ))}
              {header.labStart.slice(6).map((t, idx) => (
                <th key={`lstart-pm-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center font-medium">
                  {t}
                </th>
              ))}
            </tr>

            {/* Header Row 4: Lab End */}
            <tr className="bg-surface-container-high/90 text-on-surface border-b-2 border-outline-variant/40">
              <th className="px-2 py-0.5 border-r border-b border-outline-variant/30 font-semibold text-on-surface-variant bg-surface-container-high text-center">
                End
              </th>
              {header.labEnd.slice(0, 6).map((t, idx) => (
                <th key={`lend-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center text-on-surface-variant">
                  {t}
                </th>
              ))}
              {header.labEnd.slice(6).map((t, idx) => (
                <th key={`lend-pm-${idx}`} className="px-1.5 py-0.5 border-r border-b border-outline-variant/30 font-mono text-[9px] text-center text-on-surface-variant">
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {VIT_TIMETABLE.days.map((dayObj, dayIdx) => (
              <React.Fragment key={dayObj.name}>
                {/* THEORY Row for Day */}
                <tr className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                  <td
                    rowSpan={2}
                    className="px-2.5 py-1 border-r border-b border-outline-variant/30 font-bold text-center text-xs bg-surface-container-highest text-on-surface uppercase tracking-wide w-14"
                  >
                    {dayObj.name}
                  </td>
                  <td className="px-2 py-1 border-r border-outline-variant/30 font-semibold text-[9px] text-on-surface-variant text-center uppercase tracking-wider bg-surface-container-high/40 w-16">
                    THEORY
                  </td>
                  <td className="border-r border-outline-variant/20 bg-surface-container-low" />

                  {/* 6 Morning Theory Slots */}
                  {dayObj.theory.slice(0, 6).map((code, slotOffset) => {
                    const slotIdx = slotOffset
                    const isSelected = selectedCells.has(`${dayIdx}-${slotIdx}-theory`)
                    let cellBg = isSelected
                      ? 'bg-primary/20 text-primary border-primary/30 font-bold shadow-inner ring-1 ring-inset ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border-outline-variant/20'

                    return (
                      <td key={`${dayIdx}-th-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                        <button
                          disabled={!isEditing}
                          onClick={() => toggleCell(dayIdx, slotIdx, 'theory')}
                          className={`w-full h-full py-1 px-1 flex flex-col items-center justify-center font-mono text-[10px] transition-all ${cellBg} ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                          title={`${dayObj.name} Theory Slot ${slotIdx + 1}: ${code}`}
                        >
                          <span className="leading-tight">{code}</span>
                        </button>
                      </td>
                    )
                  })}

                  <td rowSpan={2} className="border-r border-outline-variant/30 bg-surface-container-high/50 text-on-surface-variant/40 font-mono text-[9px] text-center" />

                  {/* 6 Afternoon Theory Slots */}
                  {dayObj.theory.slice(6).map((code, slotOffset) => {
                    const slotIdx = slotOffset + 6
                    const isSelected = selectedCells.has(`${dayIdx}-${slotIdx}-theory`)
                    let cellBg = isSelected
                      ? 'bg-primary/20 text-primary border-primary/30 font-bold shadow-inner ring-1 ring-inset ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border-outline-variant/20'

                    return (
                      <td key={`${dayIdx}-th-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                        <button
                          disabled={!isEditing}
                          onClick={() => toggleCell(dayIdx, slotIdx, 'theory')}
                          className={`w-full h-full py-1 px-1 flex flex-col items-center justify-center font-mono text-[10px] transition-all ${cellBg} ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                          title={`${dayObj.name} Theory Slot ${slotIdx + 1}: ${code}`}
                        >
                          <span className="leading-tight">{code}</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>

                {/* LAB Row for Day */}
                <tr className="border-b-2 border-outline-variant/40 hover:bg-surface-container-low transition-colors">
                  <td className="px-2 py-1 border-r border-outline-variant/30 font-semibold text-[9px] text-on-surface-variant text-center uppercase tracking-wider bg-surface-container-high/40">
                    LAB
                  </td>
                  <td className="border-r border-outline-variant/20 bg-surface-container-low" />

                  {/* 6 Morning Lab Slots */}
                  {dayObj.lab.slice(0, 6).map((code, slotOffset) => {
                    const slotIdx = slotOffset
                    const isSelected = selectedCells.has(`${dayIdx}-${slotIdx}-lab`)
                    let cellBg = isSelected
                      ? 'bg-primary/20 text-primary border-primary/30 font-bold shadow-inner ring-1 ring-inset ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border-outline-variant/20'

                    return (
                      <td key={`${dayIdx}-lb-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                        <button
                          disabled={!isEditing}
                          onClick={() => toggleCell(dayIdx, slotIdx, 'lab')}
                          className={`w-full h-full py-1 px-1 flex flex-col items-center justify-center font-mono text-[10px] transition-all ${cellBg} ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                          title={`${dayObj.name} Lab Slot ${slotIdx + 1}: ${code}`}
                        >
                          <span className="leading-tight">{code}</span>
                        </button>
                      </td>
                    )
                  })}

                  {/* 6 Afternoon Lab Slots */}
                  {dayObj.lab.slice(6).map((code, slotOffset) => {
                    const slotIdx = slotOffset + 6
                    const isSelected = selectedCells.has(`${dayIdx}-${slotIdx}-lab`)
                    let cellBg = isSelected
                      ? 'bg-primary/20 text-primary border-primary/30 font-bold shadow-inner ring-1 ring-inset ring-primary/40'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border-outline-variant/20'

                    return (
                      <td key={`${dayIdx}-lb-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                        <button
                          disabled={!isEditing}
                          onClick={() => toggleCell(dayIdx, slotIdx, 'lab')}
                          className={`w-full h-full py-1 px-1 flex flex-col items-center justify-center font-mono text-[10px] transition-all ${cellBg} ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                          title={`${dayObj.name} Lab Slot ${slotIdx + 1}: ${code}`}
                        >
                          <span className="leading-tight">{code}</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Render Simplified 1-Row-Per-Day Grid Matrix for Team Analytics
  const renderSimplifiedTeamGrid = () => {
    return (
      <div className="overflow-x-auto no-scrollbar pb-2">
        <table className="w-full min-w-[760px] border-collapse text-[10px] font-sans border border-outline-variant/30 bg-surface-container rounded-xl overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-surface-container-high text-on-surface border-b border-outline-variant/30">
              <th className="p-2.5 border-r border-outline-variant/30 font-bold uppercase tracking-wider text-[11px] text-center w-16 bg-surface-container-highest">
                Day
              </th>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={`sm-head-am-${i}`} className="p-1.5 border-r border-outline-variant/30 text-center font-mono text-[9px]">
                  <div className="font-bold text-on-surface">Slot {i + 1}</div>
                  <div className="text-[8px] text-on-surface-variant font-normal mt-0.5">{SLOT_TIME_LABELS[i].split(' ')[0]}</div>
                </th>
              ))}
              <th className="p-1.5 border-r border-outline-variant/30 font-bold text-on-surface-variant bg-surface-container-highest text-center w-12 uppercase tracking-widest text-[8px] [writing-mode:vertical-lr] rotate-180">
                Lunch
              </th>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={`sm-head-pm-${i}`} className="p-1.5 border-r border-outline-variant/30 text-center font-mono text-[9px]">
                  <div className="font-bold text-on-surface">Slot {i + 7}</div>
                  <div className="text-[8px] text-on-surface-variant font-normal mt-0.5">{SLOT_TIME_LABELS[i + 6].split(' ')[0]}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {VIT_TIMETABLE.days.map((dayObj, dayIdx) => (
              <tr key={`sm-row-${dayObj.name}`} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                <td className="px-2.5 py-2.5 border-r border-outline-variant/30 font-bold text-center text-xs bg-surface-container-highest text-on-surface uppercase tracking-wide">
                  {dayObj.name}
                </td>

                {/* 6 Morning Slots */}
                {Array.from({ length: 6 }).map((_, slotOffset) => {
                  const slotIdx = slotOffset
                  const stats = getCellStats(dayIdx, slotIdx)
                  const isSelected = selectedAnalysisCell?.dayIndex === dayIdx && selectedAnalysisCell?.slotIndex === slotIdx

                  let heatClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 border-rose-500/10'
                  if (stats.ratio === 1.0) {
                    heatClass = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/20 font-bold'
                  } else if (stats.ratio >= 0.75) {
                    heatClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/10'
                  } else if (stats.ratio >= 0.5) {
                    heatClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/10'
                  }

                  return (
                    <td key={`sm-cell-${dayIdx}-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                      <button
                        onClick={() => setSelectedAnalysisCell({ dayIndex: dayIdx, slotIndex: slotIdx })}
                        className={`w-full h-full py-2 px-1 flex flex-col items-center justify-center transition-all ${heatClass} ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface z-10' : ''}`}
                      >
                        <span className="font-mono font-bold text-[10px]">{stats.freeCount} / {teamMembers.length}</span>
                        <span className="text-[7px] uppercase tracking-wider font-mono opacity-80 mt-0.5">Free</span>
                      </button>
                    </td>
                  )
                })}

                {/* Lunch Cell */}
                <td className="border-r border-outline-variant/30 bg-surface-container-high/50 text-on-surface-variant/40 font-mono text-[9px] text-center" />

                {/* 6 Afternoon Slots */}
                {Array.from({ length: 6 }).map((_, slotOffset) => {
                  const slotIdx = slotOffset + 6
                  const stats = getCellStats(dayIdx, slotIdx)
                  const isSelected = selectedAnalysisCell?.dayIndex === dayIdx && selectedAnalysisCell?.slotIndex === slotIdx

                  let heatClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 border-rose-500/10'
                  if (stats.ratio === 1.0) {
                    heatClass = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/20 font-bold'
                  } else if (stats.ratio >= 0.75) {
                    heatClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/10'
                  } else if (stats.ratio >= 0.5) {
                    heatClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/10'
                  }

                  return (
                    <td key={`sm-cell-${dayIdx}-${slotIdx}`} className="p-0 border-r border-outline-variant/20 text-center">
                      <button
                        onClick={() => setSelectedAnalysisCell({ dayIndex: dayIdx, slotIndex: slotIdx })}
                        className={`w-full h-full py-2 px-1 flex flex-col items-center justify-center transition-all ${heatClass} ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface z-10' : ''}`}
                      >
                        <span className="font-mono font-bold text-[10px]">{stats.freeCount} / {teamMembers.length}</span>
                        <span className="text-[7px] uppercase tracking-wider font-mono opacity-80 mt-0.5">Free</span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <main className="flex-1 px-6 md:px-12 pt-20 pb-4 max-w-7xl mx-auto w-full">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">Time Allocator</h2>
          </div>
          <p className="text-sm text-on-surface-variant mt-1.5">
            Monday to Friday timetable grid. Mark your class commitments.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-outline-variant mb-4 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('my-timetable')}
          className={`px-5 py-3 font-mono text-xs uppercase font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'my-timetable'
              ? 'border-accent text-accent'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
        >
          <Calendar size={16} /> My Timetable
        </button>

        <button
          onClick={() => isLead && setActiveTab('team-analyzer')}
          className={`px-5 py-3 font-mono text-xs uppercase font-bold border-b-2 transition-all flex items-center gap-2 relative ${!isLead ? 'opacity-40 cursor-not-allowed' : ''
            } ${activeTab === 'team-analyzer'
              ? 'border-accent text-accent'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          title={!isLead ? 'Restricted to Chairperson, VC & Leads' : ''}
        >
          <Users size={16} /> Team Analyzer
        </button>

        <button
          onClick={() => isLead && setActiveTab('search-free')}
          className={`px-5 py-3 font-mono text-xs uppercase font-bold border-b-2 transition-all flex items-center gap-2 relative ${!isLead ? 'opacity-40 cursor-not-allowed' : ''
            } ${activeTab === 'search-free'
              ? 'border-accent text-accent'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          title={!isLead ? 'Restricted to Chairperson, VC & Leads' : ''}
        >
          <MagnifyingGlass size={16} /> Find Free Members
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* PANEL 1: My Timetable */}
        {activeTab === 'my-timetable' && (
          <motion.div
            key="my-timetable"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl border border-outline-variant p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-on-surface">
                      {isEditing ? 'Edit Your Timetable' : 'Your Availability Schedule'}
                    </h3>

                    {/* Permanent Saved Badge */}
                    {!isEditing && mySchedule?.updated_at && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
                        <CheckCircle size={14} className="text-emerald-500" /> Saved
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant mt-1">
                    {isEditing
                      ? 'Click your Theory or Lab cells to toggle commitments, then click Save.'
                      : `Your timetable is saved. Click "Edit Timetable" to unlock and make changes.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  {/* View Mode Actions */}
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 bg-accent text-on-primary font-mono uppercase tracking-wider text-xs font-bold px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                    >
                      <PencilSimple size={16} /> Edit Timetable
                    </button>
                  ) : (
                    /* Edit Mode Actions */
                    <>
                      <button
                        onClick={clearMySchedule}
                        className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-mono uppercase tracking-wider text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-surface-container-high active:scale-[0.98] transition-all"
                      >
                        <Trash size={16} /> Reset
                      </button>

                      <button
                        onClick={handleSaveSchedule}
                        disabled={saving || !isModified}
                        className={`flex items-center justify-center gap-2 font-mono uppercase tracking-wider text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${isModified
                            ? 'bg-accent text-on-primary hover:brightness-110 active:scale-[0.98] cursor-pointer'
                            : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/60 cursor-not-allowed'
                          }`}
                      >
                        {saving ? (
                          <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                        ) : saveSuccess ? (
                          <>
                            <Check size={16} className="text-emerald-500 animate-bounce" /> Saved!
                          </>
                        ) : (
                          <>
                            <FloppyDisk size={16} /> Save Timetable
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Render Standard VIT Vertical Matrix for My Timetable */}
              {renderMyTimetableMatrix()}

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-on-surface-variant justify-center sm:justify-start pt-2 border-t border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-[#fef9c3] border border-amber-300 shadow-sm" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Selected Class Slot</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-[#1e1d1b] border border-[#3f3d39] shadow-sm" />
                  <span>Free slot</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* PANEL 2: Team Analyzer */}
        {activeTab === 'team-analyzer' && isLead && (
          <motion.div
            key="team-analyzer"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Department Availability Heatmap</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Simplified 1-row-per-day grid (6 morning slots, Lunch Break, 6 evening slots). Click any cell to inspect members.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider shrink-0">Team:</span>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="bg-surface-container-low text-on-surface font-body-sm text-sm px-4 py-2.5 rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-accent outline-none font-bold"
                  >
                    <option value="ALL">All Members / Everyone (System-wide)</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name} ({team.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              {analyzing ? (
                <TableSkeleton columns={3} rows={5} />
              ) : teamMembers.length === 0 ? (
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-12 text-center text-on-surface-variant italic">
                  No members registered in this department yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Render Simplified 1-Row-Per-Day Matrix for Team Analyzer */}
                  <div className="lg:col-span-2">
                    {renderSimplifiedTeamGrid()}
                  </div>

                  {/* Sidebar Member Availability Breakdown */}
                  <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 flex flex-col justify-between shadow-sm">
                    <div>
                      {selectedAnalysisCell ? (
                        <>
                          {(() => {
                            const dayObj = VIT_TIMETABLE.days[selectedAnalysisCell.dayIndex]
                            const slotIdx = selectedAnalysisCell.slotIndex
                            const slotTime = SLOT_TIME_LABELS[slotIdx]
                            const { freeList, busyList } = getCellStats(selectedAnalysisCell.dayIndex, slotIdx)

                            return (
                              <>
                                <div className="flex items-center gap-2 text-accent font-mono text-xs uppercase tracking-wider mb-1 font-bold">
                                  <Clock size={16} />
                                  <span>
                                    {dayObj.name} · Slot {slotIdx + 1}
                                  </span>
                                </div>
                                <div className="text-[10px] text-on-surface-variant font-mono mb-3">
                                  {slotTime}
                                </div>

                                <div className="space-y-4 max-h-96 overflow-y-auto no-scrollbar pr-1 mt-2">
                                  {/* FREE MEMBERS */}
                                  <div>
                                    <h5 className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      Free Members ({freeList.length})
                                    </h5>
                                    {freeList.length === 0 ? (
                                      <p className="text-xs text-on-surface-variant italic font-light pl-3">Nobody is free.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {freeList.map(m => (
                                          <div key={m.id} className="flex items-center gap-2.5 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/30">
                                            <img
                                              src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.full_name)}`}
                                              className="w-6 h-6 rounded-full object-cover border border-outline-variant/60"
                                              alt=""
                                            />
                                            <div className="truncate flex-1 min-w-0">
                                              <p className="text-xs font-bold text-on-surface truncate leading-normal">{m.full_name}</p>
                                              <p className="text-[9px] text-on-surface-variant truncate uppercase font-mono">{m.role}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* BUSY MEMBERS */}
                                  <div>
                                    <h5 className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      Busy / Class ({busyList.length})
                                    </h5>
                                    {busyList.length === 0 ? (
                                      <p className="text-xs text-on-surface-variant italic font-light pl-3">Nobody is busy.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {busyList.map(m => (
                                          <div key={m.id} className="flex items-center gap-2.5 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/30 opacity-75">
                                            <img
                                              src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.full_name)}`}
                                              className="w-6 h-6 rounded-full object-cover border border-outline-variant/60"
                                              alt=""
                                            />
                                            <div className="truncate flex-1 min-w-0">
                                              <p className="text-xs font-bold text-on-surface truncate leading-normal">{m.full_name}</p>
                                              <p className="text-[9px] text-on-surface-variant truncate uppercase font-mono">{m.role}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </>
                      ) : (
                        <div className="h-full flex flex-col justify-center items-center py-12 text-center text-on-surface-variant/60">
                          <WarningCircle size={36} className="mb-2 text-outline" />
                          <p className="text-xs leading-relaxed max-w-[200px]">
                            Click on any cell in the heatmap grid to inspect free and busy members.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Heatmap Legend */}
                    <div className="mt-6 pt-4 border-t border-outline-variant/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant space-y-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 shrink-0" />
                        <span>100% of Team Free</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 shrink-0" />
                        <span>75%+ of Team Free</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 shrink-0" />
                        <span>50% - 75% of Team Free</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 shrink-0" />
                        <span>&lt;50% of Team Free</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* PANEL 3: Find Free Members */}
        {activeTab === 'search-free' && isLead && (
          <motion.div
            key="search-free"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    Instant Member Finder Across 300+ Members
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Powered by 60-bit BigInt bitwise searching for sub-millisecond slot queries.
                  </p>
                </div>
              </div>

              {/* Day & Slot Selectors + Saturday Dynamic Options */}
              <div className="space-y-4 bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">Select Day</label>
                    <select
                      value={searchDay}
                      onChange={(e) => setSearchDay(parseInt(e.target.value))}
                      className="w-full bg-surface text-on-surface font-body-sm text-sm p-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-accent outline-none"
                    >
                      {WEEKDAY_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>{name}</option>
                      ))}
                      <option value={5}>Saturday (Tentative / Dynamic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">Select Time Slot</label>
                    <select
                      value={searchSlot}
                      onChange={(e) => setSearchSlot(parseInt(e.target.value))}
                      className="w-full bg-surface text-on-surface font-body-sm text-sm p-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-accent outline-none"
                    >
                      {Array.from({ length: 12 }).map((_, slotIdx) => {
                        const slotTime = SLOT_TIME_LABELS[slotIdx]
                        return (
                          <option key={`slot-opt-${slotIdx}`} value={slotIdx}>
                            Slot {slotIdx + 1} ({slotTime})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* SATURDAY DYNAMIC TIMETABLE CONTROLS */}
                {searchDay === 5 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-outline-variant/40 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                      <div>
                        <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Briefcase size={16} /> Saturday Timetable Options
                        </h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Configure whether Saturday is an off-day or follows a specific weekday schedule.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSatMode('holiday')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${satMode === 'holiday'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                          <Sun size={14} /> Holiday
                        </button>
                        <button
                          type="button"
                          onClick={() => setSatMode('working')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${satMode === 'working'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                          <Briefcase size={14} /> Working Day
                        </button>
                      </div>
                    </div>

                    {satMode === 'working' && (
                      <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-outline-variant">
                        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider shrink-0 font-bold">
                          Saturday Timetable Follows:
                        </span>
                        <select
                          value={satMappedDay}
                          onChange={(e) => setSatMappedDay(parseInt(e.target.value))}
                          className="flex-1 bg-surface-container-low text-on-surface font-body-sm text-xs p-2 rounded-md border border-outline-variant focus:outline-none focus:ring-2 focus:ring-accent outline-none font-bold"
                        >
                          {WEEKDAY_NAMES.map((name, idx) => (
                            <option key={`sat-map-${idx}`} value={idx}>
                              {name} Schedule
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {searching ? (
                <ListSkeleton items={5} variant="member" showAvatar={true} />
              ) : freeMembersAtSearch.length === 0 ? (
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-12 text-center text-on-surface-variant italic">
                  No members recorded as free during this slot.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-on-surface-variant tracking-wider px-2">
                    <span>
                      {freeMembersAtSearch.length} Members Available {searchDay === 5 ? (satMode === 'holiday' ? '· Saturday Holiday' : `· Saturday (${WEEKDAY_NAMES[satMappedDay]} Schedule)`) : ''}
                    </span>
                    <span>Status</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {freeMembersAtSearch.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between bg-surface-container-low border border-outline-variant/50 p-4 rounded-xl hover:border-accent/30 transition-all group shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.full_name)}`}
                            className="w-10 h-10 rounded-full object-cover border border-outline-variant/60"
                            alt=""
                          />
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-on-surface leading-snug group-hover:text-accent transition-colors">{m.full_name}</h4>
                            <p className="text-[10px] text-on-surface-variant truncate uppercase font-mono leading-none mt-1 font-medium">
                              {m.role} {m.department ? `· ${m.department}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Free</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}


export default Scheduler;
