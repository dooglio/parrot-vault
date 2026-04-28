import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { ProcessStatus, ProcessErrorType } from '../../shared/types'

interface ProcessEntry {
  id: number
  status: ProcessStatus
  logs: string[] // combined stdout + stderr lines
  errorMessage?: string
}

interface ProcessesState {
  entries: Record<number, ProcessEntry>
}

const initialState: ProcessesState = {
  entries: {},
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchRunningWallets = createAsyncThunk('processes/fetchRunning', async () => {
  return await window.electronAPI.getRunningWallets()
})

export const runWallet = createAsyncThunk('processes/run', async (id: number) => {
  await window.electronAPI.runWallet(id)
  return id
})

export const stopWallet = createAsyncThunk('processes/stop', async (id: number) => {
  await window.electronAPI.stopWallet(id)
  return id
})

// ─── Slice ───────────────────────────────────────────────────────────────────

const processesSlice = createSlice({
  name: 'processes',
  initialState,
  reducers: {
    processStarted(state, action: PayloadAction<number>) {
      const id = action.payload
      state.entries[id] = { id, status: 'running', logs: [] }
    },

    processStopped(state, action: PayloadAction<number>) {
      const id = action.payload
      if (state.entries[id]) {
        state.entries[id].status = 'stopped'
      }
    },

    processError(state, action: PayloadAction<{ id: number; errorType: ProcessErrorType }>) {
      const { id, errorType } = action.payload
      if (!state.entries[id]) {
        state.entries[id] = { id, status: 'error', logs: [] }
      }
      state.entries[id].status = errorType === 'failed-to-start' ? 'failed-to-start' : 'crashed'
      state.entries[id].errorMessage =
        errorType === 'failed-to-start'
          ? 'Failed to start — check the executable path in settings.'
          : errorType === 'crashed'
            ? 'Process crashed or was killed.'
            : 'An unexpected error occurred.'
    },

    processStdout(state, action: PayloadAction<{ id: number; output: string }>) {
      const { id, output } = action.payload
      if (state.entries[id]) {
        state.entries[id].logs.push(output)
        // Keep last 2000 lines to avoid unbounded memory growth
        if (state.entries[id].logs.length > 2000) {
          state.entries[id].logs = state.entries[id].logs.slice(-2000)
        }
      }
    },

    processStderr(state, action: PayloadAction<{ id: number; output: string }>) {
      const { id, output } = action.payload
      if (state.entries[id]) {
        // Prefix stderr with a marker for the UI to color red
        state.entries[id].logs.push(`\x00STDERR\x00${output}`)
        if (state.entries[id].logs.length > 2000) {
          state.entries[id].logs = state.entries[id].logs.slice(-2000)
        }
      }
    },

    clearLogs(state, action: PayloadAction<number>) {
      const id = action.payload
      if (state.entries[id]) {
        state.entries[id].logs = []
      }
    },

    removeProcess(state, action: PayloadAction<number>) {
      delete state.entries[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder.addCase(runWallet.pending, (state, action) => {
      const id = action.meta.arg
      state.entries[id] = { id, status: 'running', logs: [] }
    })

    builder.addCase(fetchRunningWallets.fulfilled, (state, action: PayloadAction<number[]>) => {
      // Sync running state on app init
      for (const id of action.payload) {
        if (!state.entries[id]) {
          state.entries[id] = { id, status: 'running', logs: [] }
        }
      }
    })
  },
})

export const {
  processStarted,
  processStopped,
  processError,
  processStdout,
  processStderr,
  clearLogs,
  removeProcess,
} = processesSlice.actions

export default processesSlice.reducer
