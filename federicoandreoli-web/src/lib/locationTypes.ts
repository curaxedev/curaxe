/** API-shaped organization location types (STR-P02) — swap transport in `locationApi.ts` when Laravel is ready. */

import type { StructureBranch } from './directoryTypes'
import type { JobPostingLocation } from './jobPostingTypes'

export type OrganizationLocationOwnerType = 'agency' | 'structure'

export type OrganizationLocationAddress = {
  comune: string
  provincia: string
  cap: string
  istat: string
  regione: string
  addressLine: string
}

export type OrganizationLocation = {
  id: string
  orgId: string
  ownerType: OrganizationLocationOwnerType
  name: string
  isPrimary: boolean
  phone: string
  address: OrganizationLocationAddress
  createdAt: string
  updatedAt: string
}

export type OrganizationLocationInput = {
  name: string
  isPrimary?: boolean
  phone?: string
  address: OrganizationLocationAddress
}

export type OrganizationLocationPatch = Partial<OrganizationLocationInput>

export type OrganizationLocationFieldErrors = Partial<
  Record<'name' | 'comune' | 'addressLine' | 'phone', string>
>

export type LocationErrorCode = 'not_found' | 'server' | 'validation'

export class LocationError extends Error {
  readonly code: LocationErrorCode
  readonly fieldErrors?: OrganizationLocationFieldErrors

  constructor(
    code: LocationErrorCode,
    message: string,
    fieldErrors?: OrganizationLocationFieldErrors,
  ) {
    super(message)
    this.name = 'LocationError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

/** Demo link: public directory profile id → dashboard org id (localStorage key). */
export const ORG_PUBLIC_PROFILE_LINKS: Record<string, string> = {
  'ag-2': 'agency-1',
  'fc-1': 'struct-1',
  'agency-1': 'agency-1',
  'struct-1': 'struct-1',
}

export function resolveOrgIdForPublicProfile(publicProfileId: string): string | null {
  return ORG_PUBLIC_PROFILE_LINKS[publicProfileId] ?? null
}

export function organizationLocationToStructureBranch(loc: OrganizationLocation): StructureBranch {
  const addressHint = loc.address.addressLine.trim()
    ? loc.address.addressLine.trim()
    : loc.address.comune
  return {
    id: loc.id,
    name: loc.name,
    comune: loc.address.comune,
    cap: loc.address.cap,
    addressHint,
    phoneHint: loc.phone.trim() || undefined,
  }
}

export function organizationLocationToJobPostingLocation(loc: OrganizationLocation): JobPostingLocation {
  return {
    comune: loc.address.comune,
    provincia: loc.address.provincia,
    cap: loc.address.cap,
    address: loc.address.addressLine,
    organizationLocationId: loc.id,
  }
}
