/** Shape of `italia_comuni.json` from https://github.com/dakk/Italia.json (dakk fork). */

export type ItaliaComuneJson = {
  code: string
  cap: string
  nome: string
}

export type ItaliaProvinciaJson = {
  code: string
  nome: string
  comuni: ItaliaComuneJson[]
}

export type ItaliaRegioneJson = {
  nome: string
  province: ItaliaProvinciaJson[]
}

export type ItaliaComuniRoot = {
  regioni: ItaliaRegioneJson[]
}

/** One row per comune for search. `id` is the ISTAT municipal code (`comuni[].code`). */
export type ItaliaGeoRow = {
  id: string
  comune: string
  cap: string
  siglaProvincia: string
  provincia: string
  regione: string
}
