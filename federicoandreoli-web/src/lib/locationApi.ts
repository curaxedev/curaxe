/**
 * Organization locations API — doppio binario mock / Laravel.
 */
import type {
  OrganizationLocation,
  OrganizationLocationInput,
  OrganizationLocationOwnerType,
  OrganizationLocationPatch,
} from './locationTypes'
import { LocationError } from './locationTypes'
import {
  createOrganizationLocation,
  deleteOrganizationLocation,
  fetchOrganizationLocations,
  setPrimaryOrganizationLocation,
  updateOrganizationLocation,
} from '../services/locationService'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  OrganizationLocation,
  OrganizationLocationAddress,
  OrganizationLocationInput,
  OrganizationLocationOwnerType,
  OrganizationLocationPatch,
} from './locationTypes'
export { LocationError, ORG_PUBLIC_PROFILE_LINKS, resolveOrgIdForPublicProfile } from './locationTypes'

type ApiLocation = {
  id: string
  name: string
  comune: string
  cap: string
  address: string
  phone: string
  isPrimary: boolean
}

function fromApi(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  row: ApiLocation,
): OrganizationLocation {
  const now = new Date().toISOString()
  return {
    id: row.id,
    orgId,
    ownerType,
    name: row.name,
    isPrimary: row.isPrimary,
    phone: row.phone,
    address: {
      comune: row.comune,
      provincia: '',
      cap: row.cap,
      istat: '',
      regione: '',
      addressLine: row.address,
    },
    createdAt: now,
    updatedAt: now,
  }
}

function toLocError(err: unknown, fallback: string): LocationError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new LocationError('not_found', err.message)
    if (err.kind === 'validation') return new LocationError('validation', err.message)
    return new LocationError('server', err.message || fallback)
  }
  return new LocationError('server', fallback)
}

export async function getOrganizationLocations(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
): Promise<OrganizationLocation[]> {
  if (isMockApiEnabled()) return fetchOrganizationLocations(orgId, ownerType)
  try {
    const rows = await httpGet<ApiLocation[]>(`/api/v1/organizations/${orgId}/locations`)
    return rows.map((r) => fromApi(orgId, ownerType, r))
  } catch (err) {
    throw toLocError(err, 'Impossibile caricare le sedi.')
  }
}

export async function postOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  input: OrganizationLocationInput,
): Promise<OrganizationLocation> {
  if (isMockApiEnabled()) return createOrganizationLocation(orgId, ownerType, input)
  try {
    const row = await httpPost<ApiLocation>(`/api/v1/organizations/${orgId}/locations`, {
      body: {
        name: input.name,
        comune: input.address.comune,
        cap: input.address.cap,
        address: input.address.addressLine,
        phone: input.phone,
        isPrimary: input.isPrimary,
      },
    })
    return fromApi(orgId, ownerType, row)
  } catch (err) {
    throw toLocError(err, 'Creazione sede non riuscita.')
  }
}

export async function patchOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
  patch: OrganizationLocationPatch,
): Promise<OrganizationLocation> {
  if (isMockApiEnabled()) return updateOrganizationLocation(orgId, ownerType, locationId, patch)
  try {
    const row = await httpPatch<ApiLocation>(
      `/api/v1/organizations/${orgId}/locations/${locationId}`,
      {
        body: {
          name: patch.name,
          comune: patch.address?.comune,
          cap: patch.address?.cap,
          address: patch.address?.addressLine,
          phone: patch.phone,
          isPrimary: patch.isPrimary,
        },
      },
    )
    return fromApi(orgId, ownerType, row)
  } catch (err) {
    throw toLocError(err, 'Aggiornamento sede non riuscito.')
  }
}

export async function removeOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
): Promise<void> {
  if (isMockApiEnabled()) return deleteOrganizationLocation(orgId, ownerType, locationId)
  try {
    await httpDelete(`/api/v1/organizations/${orgId}/locations/${locationId}`)
  } catch (err) {
    throw toLocError(err, 'Eliminazione sede non riuscita.')
  }
}

export async function markPrimaryOrganizationLocation(
  orgId: string,
  ownerType: OrganizationLocationOwnerType,
  locationId: string,
): Promise<OrganizationLocation[]> {
  if (isMockApiEnabled()) return setPrimaryOrganizationLocation(orgId, ownerType, locationId)
  try {
    await httpPost(`/api/v1/organizations/${orgId}/locations/${locationId}/primary`)
    return getOrganizationLocations(orgId, ownerType)
  } catch (err) {
    throw toLocError(err, 'Impostazione sede principale non riuscita.')
  }
}
