import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type {
  WalletTypeDefinition,
  NewWalletTypeDefinition,
  UpdateWalletTypeDefinition,
} from '../../shared/types'

interface WalletTypesState {
  items: WalletTypeDefinition[]
  loading: boolean
  error: string | null
}

const initialState: WalletTypesState = {
  items: [],
  loading: false,
  error: null,
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchWalletTypes = createAsyncThunk('walletTypes/fetchAll', async () => {
  return await window.electronAPI.getWalletTypes()
})

export const addWalletType = createAsyncThunk(
  'walletTypes/add',
  async (data: NewWalletTypeDefinition) => {
    return await window.electronAPI.addWalletType(data)
  }
)

export const updateWalletType = createAsyncThunk(
  'walletTypes/update',
  async ({ id, data }: { id: number; data: UpdateWalletTypeDefinition }) => {
    return await window.electronAPI.updateWalletType(id, data)
  }
)

export const deleteWalletType = createAsyncThunk('walletTypes/delete', async (id: number) => {
  await window.electronAPI.deleteWalletType(id)
  return id
})

// ─── Slice ───────────────────────────────────────────────────────────────────

const walletTypesSlice = createSlice({
  name: 'walletTypes',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // fetchWalletTypes
    builder
      .addCase(fetchWalletTypes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchWalletTypes.fulfilled,
        (state, action: PayloadAction<WalletTypeDefinition[]>) => {
          state.loading = false
          state.items = action.payload
        }
      )
      .addCase(fetchWalletTypes.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load wallet types'
      })

    // addWalletType
    builder
      .addCase(addWalletType.fulfilled, (state, action: PayloadAction<WalletTypeDefinition>) => {
        state.items.push(action.payload)
        state.items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      })
      .addCase(addWalletType.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to add wallet type'
      })

    // updateWalletType
    builder
      .addCase(updateWalletType.fulfilled, (state, action: PayloadAction<WalletTypeDefinition>) => {
        const idx = state.items.findIndex((w) => w.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        state.items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      })
      .addCase(updateWalletType.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update wallet type'
      })

    // deleteWalletType
    builder
      .addCase(deleteWalletType.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter((w) => w.id !== action.payload)
      })
      .addCase(deleteWalletType.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete wallet type'
      })
  },
})

export const { clearError } = walletTypesSlice.actions
export default walletTypesSlice.reducer
