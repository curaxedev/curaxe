import { useEffect, useMemo, useState } from 'react'
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
  status: 'active' | 'closed' | 'draft' | 'paused'
  applications: number
}

export function collectFamilyRequests(): AdminRequestRow[] {
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

  if (rows.length === 0) {
    return [
      {
        id: 'demo-req-1',
        requester: 'Famiglia Bianchi',
        type: 'Badante',
        zone: 'Milano',
        date: '02 mag 2026',
        status: 'active',
        applications: 2,
      },
    ]
  }

  return rows
}

export function AdminRequestsSection() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [rows, setRows] = useState<AdminRequestRow[]>([])

  useEffect(() => {
    setRows(collectFamilyRequests())
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
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Richiedente</th>
              <th>Tipo</th>
              <th>Zona</th>
              <th>Data</th>
              <th>Candidature</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.requester}</td>
                <td>{r.type}</td>
                <td>{r.zone}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                <td>
                  <strong>{r.applications}</strong>
                </td>
                <td>
                  <span className={`dash-badge dash-badge--${r.status === 'active' ? 'active' : 'closed'}`}>
                    {r.status === 'active'
                      ? 'Attiva'
                      : r.status === 'draft'
                        ? 'Bozza'
                        : r.status === 'paused'
                          ? 'In pausa'
                          : 'Chiusa'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
