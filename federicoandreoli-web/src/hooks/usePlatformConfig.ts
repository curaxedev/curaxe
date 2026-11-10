import { useEffect, useState } from 'react'
import {
  fetchPlatformConfig,
  getCachedPlatformConfig,
  type PlatformPublicConfig,
} from '../lib/platformConfigApi'

export function usePlatformConfig(): PlatformPublicConfig {
  const [config, setConfig] = useState<PlatformPublicConfig>(getCachedPlatformConfig)

  useEffect(() => {
    let cancelled = false
    void fetchPlatformConfig().then((next) => {
      if (!cancelled) setConfig(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return config
}
