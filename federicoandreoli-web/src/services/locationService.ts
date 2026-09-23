import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import type { StructureBranch } from '../lib/directoryTypes'
import {
  LocationError,
  organizationLocationToStructureBranch,
  resolveOrgIdForPublicProfile,
  type OrganizationLocation,
  type OrganizationLocationAddress,
  type OrganizationLocationFieldErrors,
  type OrganizationLocationInput,
  type OrganizationLocationOwnerType,
  type OrganizationLocationPatch,
} from '../lib/locationTypes'

const MOCK_DELAY_MS = 400
const STORAGE_PREFIX = 'fa:org-locations:'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`
}

function readStore(orgId: string): OrganizationLocation[] | null {
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return null
    return JSON.parse(raw) as OrganizationLocation[]
  } catch {
    return null
  }
}

function writeStore(orgId: string, locations: OrganizationLocation[]): void {
  localStorage.setItem(storageKey(orgId), JSON.stringify(locations))
}

function nowIso(): string {
  return new Date().toISOString()
}

function addressFromGeo(place: ItaliaGeoRow, addressLine = ''): OrganizationLocationAddress {
  return {
    comune: place.comune,
    provincia: place.siglaProvincia,
    cap: place.cap,
    istat: place.id,
    regione: place.regione,
    addressLine: addressLine.trim(),
  }
}

function createSeedLocations(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
): OrganizationLocation[] {
  const t = nowIso()

  if (ownerType === 'structure') {
    return [
      {
        id: `loc-${orgId}-1`,
        orgId,
        ownerType,
        name: 'Sede principale — Monza',
        isPrimary: true,
        phone: '+39 039 1234567',
        address: {
          comune: 'Monza',
          provincia: 'MB',
          cap: '20900',
          istat: '108033',
          regione: 'Lombardia',
          addressLine: 'Via delle Betulle 12',
        },
        createdAt: t,
        updatedAt: t,
      },
      {
        id: `loc-${orgId}-2`,
        orgId,
        ownerType,
        name: 'Day hospital — Sesto San Giovanni',
        isPrimary: false,
        phone: '',
        address: {
          comune: 'Sesto San Giovanni',
          provincia: 'MI',
          cap: '20099',
          istat: '015209',
          regione: 'Lombardia',
          addressLine: 'Via Italia 8',
        },
        createdAt: t,
        updatedAt: t,
      },
    ]
  }

  return [
    {
      id: `loc-${orgId}-1`,
      orgId,
      ownerType,
      name: 'Sede operativa Milano',
      isPrimary: true,
      phone: '+39 02 1234567',
      address: {
        comune: 'Milano',
        provincia: 'MI',
        cap: '20141',
        istat: '015146',
        regione: 'Lombardia',
        addressLine: 'Via Ripamonti 42',
      },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: `loc-${orgId}-2`,
      orgId,
      ownerType,
      name: 'Sportello Monza-Brianza',
      isPrimary: false,
      phone: '+39 039 7654321',
      address: {
        comune: 'Monza',
        provincia: 'MB',
        cap: '20900',
        istat: '108033',
        regione: 'Lombardia',
        addressLine: 'Piazza Trento e Trieste 3',
      },
      createdAt: t,
      updatedAt: t,
    },
  ]
}

export function loadOrganizationLocations(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
): OrganizationLocation[] {
  const stored = readStore(orgId)
  if (stored && stored.length > 0) return stored
  const seed = createSeedLocations(orgId, ownerType)
  writeStore(orgId, seed)
  return seed
}

export function getOrganizationLocationById(
  orgId: string,
  locationId: string,
): OrganizationLocation | undefined {
  const store = readStore(orgId)
  if (!store) return undefined
  return store.find((loc) => loc.id === locationId)
}

export function validateOrganizationLocationInput(
  input: OrganizationLocationInput,
): LocationError | null {
  const fieldErrors: OrganizationLocationFieldErrors = {}
  if (!input.name.trim()) fieldErrors.name = 'Indica il nome della sede.'
  if (!input.address.comune.trim()) fieldErrors.comune = 'Seleziona il comune dalla ricerca.'
  if (Object.keys(fieldErrors).length > 0) {
    return new LocationError('validation', 'Controlla i campi evidenziati.', fieldErrors)
  }
  return null
}

function applyPrimaryFlag(
  locations: OrganizationLocation[],
  primaryId: string,
): OrganizationLocation[] {
  return locations.map((loc) => ({
    ...loc,
    isPrimary: loc.id === primaryId,
    updatedAt: loc.id === primaryId ? nowIso() : loc.updatedAt,
  }))
}

export function geoRowToLocationAddress(
  place: ItaliaGeoRow,
  addressLine = '',
): OrganizationLocationAddress {
  return addressFromGeo(place, addressLine)
}

export async function fetchOrganizationLocations(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
): Promise<OrganizationLocation[]> {
  await delay()
  if (!orgId) throw new LocationError('not_found', 'Sessione non valida.')
  if (orgId.toLowerCase().includes('server-error')) {
    throw new LocationError('server', 'Servizio sedi temporaneamente non disponibile.')
  }
  return loadOrganizationLocations(orgId, ownerType)
}

export async function createOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  input: OrganizationLocationInput,
): Promise<OrganizationLocation> {
  await delay()
  const err = validateOrganizationLocationInput(input)
  if (err) throw err

  const store = loadOrganizationLocations(orgId, ownerType)
  const t = nowIso()
  const makePrimary = input.isPrimary ?? store.length === 0

  const location: OrganizationLocation = {
    id: `loc-${orgId}-${Date.now()}`,
    orgId,
    ownerType,
    name: input.name.trim(),
    isPrimary: makePrimary,
    phone: (input.phone ?? '').trim(),
    address: {
      comune: input.address.comune.trim(),
      provincia: input.address.provincia.trim(),
      cap: input.address.cap.trim(),
      istat: input.address.istat.trim(),
      regione: input.address.regione.trim(),
      addressLine: input.address.addressLine.trim(),
    },
    createdAt: t,
    updatedAt: t,
  }

  let next = [...store, location]
  if (makePrimary) {
    next = applyPrimaryFlag(next, location.id)
  }
  writeStore(orgId, next)
  return next.find((l) => l.id === location.id) ?? location
}

export async function updateOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
  patch: OrganizationLocationPatch,
): Promise<OrganizationLocation> {
  await delay()
  const store = loadOrganizationLocations(orgId, ownerType)
  const index = store.findIndex((l) => l.id === locationId)
  if (index < 0) throw new LocationError('not_found', 'Sede non trovata.')

  const current = store[index]
  const merged: OrganizationLocationInput = {
    name: patch.name ?? current.name,
    phone: patch.phone ?? current.phone,
    isPrimary: patch.isPrimary ?? current.isPrimary,
    address: patch.address ? { ...current.address, ...patch.address } : current.address,
  }
  const err = validateOrganizationLocationInput(merged)
  if (err) throw err

  const updated: OrganizationLocation = {
    ...current,
    name: merged.name.trim(),
    phone: (merged.phone ?? '').trim(),
    isPrimary: merged.isPrimary ?? false,
    address: {
      comune: merged.address.comune.trim(),
      provincia: merged.address.provincia.trim(),
      cap: merged.address.cap.trim(),
      istat: merged.address.istat.trim(),
      regione: merged.address.regione.trim(),
      addressLine: merged.address.addressLine.trim(),
    },
    updatedAt: nowIso(),
  }

  let next = store.map((l, i) => (i === index ? updated : l))
  if (updated.isPrimary) {
    next = applyPrimaryFlag(next, updated.id)
  } else if (!next.some((l) => l.isPrimary)) {
    next = applyPrimaryFlag(next, next[0]?.id ?? updated.id)
  }

  writeStore(orgId, next)
  return next.find((l) => l.id === locationId) ?? updated
}

export async function deleteOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
): Promise<void> {
  await delay()
  const store = loadOrganizationLocations(orgId, ownerType)
  const target = store.find((l) => l.id === locationId)
  if (!target) throw new LocationError('not_found', 'Sede non trovata.')
  if (store.length <= 1) {
    throw new LocationError('validation', 'Devi mantenere almeno una sede operativa.')
  }

  let next = store.filter((l) => l.id !== locationId)
  if (target.isPrimary && next.length > 0) {
    next = applyPrimaryFlag(next, next[0].id)
  }
  writeStore(orgId, next)
}

export async function setPrimaryOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
): Promise<OrganizationLocation[]> {
  await delay()
  const store = loadOrganizationLocations(orgId, ownerType)
  if (!store.some((l) => l.id === locationId)) {
    throw new LocationError('not_found', 'Sede non trovata.')
  }
  const next = applyPrimaryFlag(store, locationId)
  writeStore(orgId, next)
  return next
}

/** Public `/strutture/:id` branches from org store when linked; otherwise null → fallback. */
export function resolvePublicStructureBranches(publicProfileId: string): StructureBranch[] | null {
  const orgId = resolveOrgIdForPublicProfile(publicProfileId)
  if (!orgId) return null

  const raw = readStore(orgId)
  if (!raw || raw.length === 0) return null

  return raw.map(organizationLocationToStructureBranch)
}
