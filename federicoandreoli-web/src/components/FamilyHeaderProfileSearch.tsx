import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ItaliaGeoSearchCombobox } from './ItaliaGeoSearchCombobox'
import { IconSearch } from './icons/DashboardIcons'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import { buildProfilesDirectoryHref } from '../lib/profilesDirectoryNav'

/**
 * Barra ricerca professionisti nell'header dashboard famiglia.
 * Porta a `/profili` (directory pubblica) restando loggati.
 */
export function FamilyHeaderProfileSearch() {
  const navigate = useNavigate()
  const [place, setPlace] = useState<ItaliaGeoRow | null>(null)

  function goToResults(next: ItaliaGeoRow | null, freeText?: string) {
    const href = buildProfilesDirectoryHref({
      istat: next?.id,
      q: next ? undefined : freeText?.trim() || undefined,
      intent: 'cerco',
    })
    navigate(href)
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (place) {
      goToResults(place)
      return
    }
    const input = e.currentTarget.querySelector<HTMLInputElement>('input[type="search"]')
    const q = input?.value?.trim() ?? ''
    if (!q) {
      navigate(buildProfilesDirectoryHref({ intent: 'cerco' }))
      return
    }
    goToResults(null, q)
  }

  return (
    <form className="dash-header-search" role="search" onSubmit={onSubmit}>
      <div className="dash-header-search__field">
        <ItaliaGeoSearchCombobox
          layoutVariant="toolbar"
          selectedPlace={place}
          onSelectedPlaceChange={(next) => {
            setPlace(next)
            if (next) goToResults(next)
          }}
        />
      </div>
      <button type="submit" className="dash-header-search__btn" aria-label="Cerca professionisti">
        <IconSearch size={18} />
        <span className="dash-header-search__btn-label">Cerca</span>
      </button>
    </form>
  )
}
