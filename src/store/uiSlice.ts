import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ModalType = 'add-wallet' | 'edit-wallet' | 'delete-wallet' | 'settings' | 'envvars' | null

interface UIState {
  selectedWalletId: number | null
  searchTerm: string
  activeModal: ModalType
  activeLogTabId: number | null
  notification: { message: string; type: 'success' | 'error' | 'info' } | null
}

const initialState: UIState = {
  selectedWalletId: null,
  searchTerm: '',
  activeModal: null,
  activeLogTabId: null,
  notification: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectWallet(state, action: PayloadAction<number | null>) {
      state.selectedWalletId = action.payload
    },

    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload
    },

    openModal(state, action: PayloadAction<ModalType>) {
      state.activeModal = action.payload
    },

    closeModal(state) {
      state.activeModal = null
    },

    setActiveLogTab(state, action: PayloadAction<number | null>) {
      state.activeLogTabId = action.payload
    },

    showNotification(
      state,
      action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>
    ) {
      state.notification = action.payload
    },

    clearNotification(state) {
      state.notification = null
    },
  },
})

export const {
  selectWallet,
  setSearchTerm,
  openModal,
  closeModal,
  setActiveLogTab,
  showNotification,
  clearNotification,
} = uiSlice.actions

export default uiSlice.reducer
