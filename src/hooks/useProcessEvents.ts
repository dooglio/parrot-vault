import { useEffect } from 'react'
import { useAppDispatch } from './useAppDispatch'
import {
  processStarted,
  processStopped,
  processError,
  processStdout,
  processStderr,
} from '../store/processesSlice'
import type { ProcessErrorType } from '../../shared/types'

/**
 * Registers IPC listeners for process lifecycle events from the main process.
 * Should be mounted once at the App level.
 */
export function useProcessEvents(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubStart = window.electronAPI.onProcessStart((id: number) => {
      dispatch(processStarted(id))
    })

    const unsubStop = window.electronAPI.onProcessStop((id: number) => {
      dispatch(processStopped(id))
    })

    const unsubError = window.electronAPI.onProcessError(
      (id: number, errorType: ProcessErrorType) => {
        dispatch(processError({ id, errorType }))
      }
    )

    const unsubStdout = window.electronAPI.onProcessStdout((id: number, output: string) => {
      dispatch(processStdout({ id, output }))
    })

    const unsubStderr = window.electronAPI.onProcessStderr((id: number, output: string) => {
      dispatch(processStderr({ id, output }))
    })

    return () => {
      unsubStart()
      unsubStop()
      unsubError()
      unsubStdout()
      unsubStderr()
    }
  }, [dispatch])
}
