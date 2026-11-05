import { useEffect } from 'react'
import { AccountScreen } from './features/accounts/AccountScreen'
import { AccountsScreen } from './features/accounts/AccountsScreen'
import { useHash } from './useHash'

export function App() {
  const hash = useHash()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])

  const accountUuid = hash.match(/^#\/accounts\/(.+)$/)?.[1]
  if (accountUuid) {
    return <AccountScreen key={accountUuid} uuid={accountUuid} />
  }
  return <AccountsScreen />
}
