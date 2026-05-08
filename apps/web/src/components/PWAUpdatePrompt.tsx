import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Verifica atualizações a cada hora
      if (r) {
        setInterval(
          () => {
            r.update()
          },
          60 * 60 * 1000,
        )
      }
    },
  })

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Atualize para ter as últimas melhorias.',
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateServiceWorker(true)
            setNeedRefresh(false)
          },
        },
        cancel: {
          label: 'Depois',
          onClick: () => setNeedRefresh(false),
        },
      })
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh])

  return null
}
