import { useEffect, useMemo, useState } from 'react'
import {
  getAdminFamilyRequests,
  type AdminFamilyRequestRow,
} from '../../../../lib/adminOverviewApi'
import { isMockApiEnabled } from '../../../../lib/runtimeConfig'
import {
  ASSISTANCE_TYPE_LABELS,
  formatFamilyRequestDate,
  loadFamilyRequestStore,
} from '../../../../services/familyRequestService'
import type { FamilyRequest } from '../../../../lib/familyRequestTypes'
import { MOCK_AUTH_ACCOUNTS } from '../../../../mocks/authFixtures'

export type AdminRequestRow = {
  id: string
  requester: string
  type: string
  zone: string
  date: string
  status: 'active' | 'closed' | 'draft' | 'paused' | string
  applications: number
}

function collectMockFamilyRequests(): AdminRequestRow[] {
  const familyUsers = MOCK_AUTH_ACCOUNTS.filter((a) => a.role === 'public_user')
  const rows: AdminRequestRow[] = []

  for (const account of familyUsers) {
    const store = loadFamilyRequestStore(account.id)
    for (const req of store.requests as FamilyRequest[]) {
      const apps = store.applications.filter((a) => a.requestId === req.id)
      rows.push({
        id: req.id,
        requester: account.name,
        type: ASSISTANCE_TYPE_LABELS[req.assistanceType] ?? req.assistanceType,
        zone: req.comune || '—',
        date: formatFamilyRequestDate(req.createdAt),
        status: req.status,
        applications: apps.length || req.applicationCount || 0,
      })
    }
  }

  return rows
}

function mapApiRow(row: AdminFamilyRequestRow): AdminRequestRow {
  const d = row.date ? new Date(row.date) : null
  const dateLabel =
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
      : row.date

  return {
    id: row.id,
    requester: row.requester,
    type: row.type,
    zone: row.zone,
    date: dateLabel,
    status: row.status,
    applications: row.applications,
  }
}

/** @deprecated used by overview export in mock mode */
export function collectFamilyRequests(): AdminRequestRow[] {
  return collectMockFamilyRequests()
}

export function AdminRequestsSection() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [rows, setRows] = useState<AdminRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    if (isMockApiEnabled()) {
      setRows(collectMockFamilyRequests())
      setLoading(false)
      return
    }
    void getAdminFamilyRequests()
      .then((data) => setRows(data.map(mapApiRow)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Caricamento non riuscito.'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () => rows.filter((r) => filterStatus === 'all' || r.status === filterStatus),
    [rows, filterStatus],
  )

  return (
    <div className="dash-admin-requests">
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Richieste di assistenza</h2>
          <p className="dash-section__subtitle">
            Richieste famiglia dalla piattaforma ({rows.length})
          </p>
        </div>
      </div>
      {error ? (
        <div className="dash-empty-state" role="alert">
          <div className="dash-empty-state__title">Impossibile caricare le richieste</div>
          <div className="dash-empty-state__sub">{error}</div>
          <button type="button" className="dash-btn dash-btn--primary" onClick={load}>
            Riprova
          </button>
        </div>
      ) : null}
      <div className="dash-filters">
        <select
          className="dash-form-select"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tutti gli status</option>
          <option value="active">Attive</option>
          <option value="paused">In pausa</option>
          <option value="closed">Chiuse</option>
          <option value="draft">Bozze</option>
        </select>
      </div>
      {loading ? (
        <div className="dash-skeleton" style={{ width: '100%', height: 180 }} aria-busy="true" />
      ) : (
        <div className="dash-table-wrap dash-table-wrap--cards-mobile">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Richiedente</th>
                <th>Tipo</th>
                <th>Zona</th>
                <th>Data</th>
                <th>Status</th>
                <th>Candidature</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nessuna richiesta.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Richiedente">{r.requester}</td>
                    <td data-label="Tipo">{r.type}</td>
                    <td data-label="Zona">{r.zone}</td>
                    <td data-label="Data">{r.date}</td>
                    <td data-label="Status">
                      <span className={`dash-badge dash-badge--${r.status}`}>{r.status}</span>
                    </td>
                    <td data-label="Candidature">{r.applications}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
