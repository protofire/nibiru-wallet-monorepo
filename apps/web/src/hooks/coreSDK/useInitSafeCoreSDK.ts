import { selectUndeployedSafe } from '@/features/counterfactual/store/undeployedSafesSlice'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useSafeInfo from '@/hooks/useSafeInfo'
import { initSafeSDK, setSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import { trackError } from '@/services/exceptions'
import ErrorCodes from '@/services/exceptions/ErrorCodes'
import { useAppDispatch, useAppSelector } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { parsePrefixedAddress, sameAddress } from '@/utils/addresses'
import { asError } from '@/services/exceptions/utils'
import { isSmartContractWithRetry } from '@/utils/wallets'

export const useInitSafeCoreSDK = () => {
  const { safe, safeLoaded } = useSafeInfo()
  const dispatch = useAppDispatch()
  const web3ReadOnly = useWeb3ReadOnly()

  const { query } = useRouter()
  const prefixedAddress = Array.isArray(query.safe) ? query.safe[0] : query.safe
  const { address } = parsePrefixedAddress(prefixedAddress || '')
  const undeployedSafe = useAppSelector((state) => selectUndeployedSafe(state, safe.chainId, address))

  useEffect(() => {
    if (!safeLoaded || !web3ReadOnly || !sameAddress(address, safe.address.value)) {
      // If we don't reset the SDK, a previous Safe could remain in the store
      setSafeSDK(undefined)
      return
    }

    const initSDKWithRetry = async () => {
      // First check if contract is deployed
      const isDeployed = await isSmartContractWithRetry(safe.address.value, web3ReadOnly)
      if (!isDeployed) {
        setSafeSDK(undefined)
        return
      }

      // Then try to initialize SDK
      try {
        const sdk = await initSafeSDK({
          provider: web3ReadOnly,
          chainId: safe.chainId,
          address: safe.address.value,
          version: safe.version,
          implementationVersionState: safe.implementationVersionState,
          implementation: safe.implementation.value,
          undeployedSafe,
        })
        setSafeSDK(sdk)
      } catch (e) {
        const error = asError(e)
        dispatch(
          showNotification({
            message: 'Error connecting to the blockchain. Please try reloading the page.',
            groupKey: 'core-sdk-init-error',
            variant: 'error',
            detailedMessage: error.message,
          }),
        )
        trackError(ErrorCodes._105, error.message)
      }
    }

    initSDKWithRetry()
  }, [
    address,
    dispatch,
    safe.address.value,
    safe.chainId,
    safe.implementation.value,
    safe.implementationVersionState,
    safe.version,
    safeLoaded,
    web3ReadOnly,
    undeployedSafe,
  ])
}
