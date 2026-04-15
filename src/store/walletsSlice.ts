import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Wallet, NewWallet, UpdateWallet } from '../../shared/types'

interface WalletsState {
  items: Wallet[]
  loading: boolean
  error: string | null
}

const initialState: WalletsState = {
  items: [],
  loading: false,
  error: null,
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchWallets = createAsyncThunk('wallets/fetchAll', async () => {
  return await window.electronAPI.getWallets()
})

export const addWallet = createAsyncThunk('wallets/add', async (data: NewWallet) => {
  return await window.electronAPI.addWallet(data)
})

export const updateWallet = createAsyncThunk(
  'wallets/update',
  async ({ id, data }: { id: number; data: UpdateWallet }) => {
    return await window.electronAPI.updateWallet(id, data)
  }
)

export const deleteWallet = createAsyncThunk(
  'wallets/delete',
  async ({ id, deleteFiles }: { id: number; deleteFiles: boolean }, { dispatch }) => {
    await window.electronAPI.deleteWallet(id, deleteFiles)
    dispatch(fetchWallets())
    return id
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const walletsSlice = createSlice({
  name: 'wallets',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // fetchWallets
    builder
      .addCase(fetchWallets.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWallets.fulfilled, (state, action: PayloadAction<Wallet[]>) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load wallets'
      })

    // addWallet
    builder
      .addCase(addWallet.fulfilled, (state, action: PayloadAction<Wallet>) => {
        state.items.push(action.payload)
        // Re-sort: pinned first, then alphabetical
        state.items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        })
      })
      .addCase(addWallet.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to add wallet'
      })

    // updateWallet
    builder
      .addCase(updateWallet.fulfilled, (state, action: PayloadAction<Wallet>) => {
        const idx = state.items.findIndex((w) => w.id === action.payload.id)
        if (idx !== -1) {
          state.items[idx] = action.payload
        }
        state.items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        })
      })
      .addCase(updateWallet.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update wallet'
      })

    // deleteWallet
    builder
      .addCase(deleteWallet.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter((w) => w.id !== action.payload)
      })
      .addCase(deleteWallet.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete wallet'
      })
  },
})

export const { clearError } = walletsSlice.actions
export default walletsSlice.reducer
