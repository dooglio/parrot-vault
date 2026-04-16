import { configureStore } from '@reduxjs/toolkit'
import walletsReducer from './walletsSlice'
import processesReducer from './processesSlice'
import uiReducer from './uiSlice'
import walletTypesReducer from './walletTypesSlice'

export const store = configureStore({
  reducer: {
    wallets: walletsReducer,
    processes: processesReducer,
    ui: uiReducer,
    walletTypes: walletTypesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
