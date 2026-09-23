import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { RegisterDraft, RegisterIntent } from './registerDraft'
import {
  clearDraftStorage,
  initialRegisterDraft,
  loadDraftFromStorage,
  saveDraftToStorage,
} from './registerDraft'

type WizardAction =
  | { type: 'PATCH_DRAFT'; patch: Partial<RegisterDraft> }
  | { type: 'RESET_FOR_INTENT'; intent: RegisterIntent }

function draftReducer(state: RegisterDraft, action: WizardAction): RegisterDraft {
  switch (action.type) {
    case 'PATCH_DRAFT':
      return { ...state, ...action.patch }
    case 'RESET_FOR_INTENT': {
      const loaded = loadDraftFromStorage(action.intent)
      return loaded ?? { ...initialRegisterDraft(), intent: action.intent }
    }
  }
}

type RegisterWizardContextValue = {
  draft: RegisterDraft
  patchDraft: (patch: Partial<RegisterDraft>) => void
  resetForIntent: (intent: RegisterIntent) => void
  clearCompleted: (intent: RegisterIntent) => void
}

const RegisterWizardContext = createContext<RegisterWizardContextValue | null>(null)

export function RegisterWizardProvider({ children }: { children: React.ReactNode }) {
  const [draft, dispatch] = useReducer(draftReducer, undefined, initialRegisterDraft)

  useEffect(() => {
    if (draft.intent) {
      saveDraftToStorage(draft)
    }
  }, [draft])

  const patchDraft = useCallback((patch: Partial<RegisterDraft>) => {
    dispatch({ type: 'PATCH_DRAFT', patch })
  }, [])

  const resetForIntent = useCallback((intent: RegisterIntent) => {
    dispatch({ type: 'RESET_FOR_INTENT', intent })
  }, [])

  const clearCompleted = useCallback((intent: RegisterIntent) => {
    clearDraftStorage(intent)
    dispatch({ type: 'RESET_FOR_INTENT', intent })
  }, [])

  const value = useMemo(
    () => ({
      draft,
      patchDraft,
      resetForIntent,
      clearCompleted,
    }),
    [draft, patchDraft, resetForIntent, clearCompleted],
  )

  return <RegisterWizardContext.Provider value={value}>{children}</RegisterWizardContext.Provider>
}

/** Hook co-locato con il provider (wizard isolato). */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider accoppiati
export function useRegisterWizard(): RegisterWizardContextValue {
  const ctx = useContext(RegisterWizardContext)
  if (!ctx) {
    throw new Error('useRegisterWizard must be used within RegisterWizardProvider')
  }
  return ctx
}
