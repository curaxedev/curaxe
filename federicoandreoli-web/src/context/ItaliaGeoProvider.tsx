/**
 * Carica una sola volta i comuni italiani e l’indice Fuse (dati: dakk/Italia.json).
 */
/* eslint-disable react-refresh/only-export-components -- provider + hook + tipi condivisi. */
import Fuse, { type IFuseOptions } from 'fuse.js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ItaliaComuniRoot, ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import { flattenItaliaComuni } from '../lib/italiaGeo/flattenItaliaComuni'

const GEO_JSON_URL = '/data/italia-comuni.json'

/** Alias comuni / zone di confine → query verso comuni italiani. */
const GEO_ALIASES: Record<string, string> = {
  lugano: 'Como',
  chiasso: 'Como',
  mendrisio: 'Como',
  locarno: 'Verbania',
  nizza: 'Ventimiglia',
  nice: 'Ventimiglia',
  mentone: 'Ventimiglia',
  menton: 'Ventimiglia',
  monaco: 'Ventimiglia',
  'monte carlo': 'Ventimiglia',
  innsbruck: 'Bolzano',
  innsbruk: 'Bolzano',
  kufstein: 'Bolzano',
  capodistria: 'Trieste',
  koper: 'Trieste',
  'san marino': 'Rimini',
  'città del vaticano': 'Roma',
  vaticano: 'Roma',
  geneve: 'Aosta',
  ginevra: 'Aosta',
  geneva: 'Aosta',
  zurigo: 'Como',
  zurich: 'Como',
}

function foldAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function expandGeoQuery(query: string): string {
  const t = query.trim()
  if (!t) return t
  const key = foldAccents(t).toLowerCase()
  return GEO_ALIASES[key] ?? t
}

const fuseOptions: IFuseOptions<ItaliaGeoRow> = {
  keys: [
    { name: 'comune', weight: 0.42 },
    { name: 'cap', weight: 0.18 },
    { name: 'siglaProvincia', weight: 0.14 },
    { name: 'provincia', weight: 0.14 },
    { name: 'regione', weight: 0.12 },
  ],
  threshold: 0.32,
  ignoreLocation: true,
  minMatchCharLength: 1,
  ignoreDiacritics: true,
}

export type ItaliaGeoLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ItaliaGeoContextValue = {
  status: ItaliaGeoLoadStatus
  errorMessage: string | null
  search: (query: string, limit?: number) => ItaliaGeoRow[]
  getByIstat: (istat: string) => ItaliaGeoRow | undefined
  retry: () => void
}

const ItaliaGeoContext = createContext<ItaliaGeoContextValue | null>(null)

export function ItaliaGeoProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ItaliaGeoLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const fuseRef = useRef<Fuse<ItaliaGeoRow> | null>(null)
  const byIstatRef = useRef<Map<string, ItaliaGeoRow>>(new Map())

  useEffect(() => {
    let cancelled = false
    fuseRef.current = null
    byIstatRef.current = new Map()

    fetch(GEO_JSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ItaliaComuniRoot>
      })
      .then((root) => {
        if (cancelled) return
        const flat = flattenItaliaComuni(root)
        const m = new Map<string, ItaliaGeoRow>()
        for (const row of flat) {
          m.set(row.id, row)
        }
        byIstatRef.current = m
        fuseRef.current = new Fuse(flat, fuseOptions)
        setErrorMessage(null)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        fuseRef.current = null
        byIstatRef.current = new Map()
        setStatus('error')
        setErrorMessage(e instanceof Error ? e.message : 'Errore di caricamento')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const search = useCallback((query: string, limit = 12): ItaliaGeoRow[] => {
    const raw = query.trim()
    if (raw.length === 0 || !fuseRef.current) return []
    const q = foldAccents(expandGeoQuery(raw))
    return fuseRef.current.search(q, { limit }).map((r) => r.item)
  }, [])

  const getByIstat = useCallback((istat: string) => {
    const id = istat.trim()
    if (!id) return undefined
    return byIstatRef.current.get(id)
  }, [])

  const retry = useCallback(() => {
    setErrorMessage(null)
    setReloadToken((t) => t + 1)
  }, [])

  const value = useMemo(
    () => ({
      status,
      errorMessage,
      search,
      getByIstat,
      retry,
    }),
    [status, errorMessage, search, getByIstat, retry],
  )

  return <ItaliaGeoContext.Provider value={value}>{children}</ItaliaGeoContext.Provider>
}

export function useItaliaGeo(): ItaliaGeoContextValue {
  const v = useContext(ItaliaGeoContext)
  if (!v) {
    throw new Error('useItaliaGeo deve essere usato dentro ItaliaGeoProvider')
  }
  return v
}
