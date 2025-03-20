import { useMemo } from 'react'
import { IS_OFFICIAL_HOST } from '@/config/constants'

export const useIsOfficialHost = (): boolean => {
  return useMemo(() => IS_OFFICIAL_HOST, [])
}
