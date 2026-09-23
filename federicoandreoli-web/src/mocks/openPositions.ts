/**
 * Punto d’ingresso per i dati demo «posizioni aperte» (flusso assistenza=offro).
 * I record e i filtri home vivono in `../lib/mockOpenPositions`.
 */
export {
  MOCK_OPEN_POSITIONS,
  OPEN_POSITION_CONTRACT_FILTER_IDS,
  OPEN_POSITION_CONTRACT_FILTER_LABELS,
  OPEN_POSITION_ROLE_IDS,
  OPEN_POSITION_ROLE_LABELS,
  getOpenPositionById,
  listNearbyOpenPositions,
  listOpenPositionsForHome,
  locationMatchesCity,
  posterLabel,
  type MockOpenPosition,
  type OpenPositionContractBucket,
  type OpenPositionContractFilterId,
  type OpenPositionFilters,
  type OpenPositionPoster,
  type OpenPositionPosterFilter,
  type OpenPositionRoleId,
} from '../lib/mockOpenPositions'
