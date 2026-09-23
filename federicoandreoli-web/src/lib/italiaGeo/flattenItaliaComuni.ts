import type { ItaliaComuniRoot, ItaliaGeoRow } from './italiaComuniTypes'

export type { ItaliaComuniRoot, ItaliaGeoRow }

export function flattenItaliaComuni(root: ItaliaComuniRoot): ItaliaGeoRow[] {
  const out: ItaliaGeoRow[] = []
  for (const regione of root.regioni) {
    for (const provincia of regione.province) {
      for (const comune of provincia.comuni) {
        out.push({
          id: comune.code,
          comune: comune.nome,
          cap: comune.cap,
          siglaProvincia: provincia.code,
          provincia: provincia.nome,
          regione: regione.nome,
        })
      }
    }
  }
  return out
}
