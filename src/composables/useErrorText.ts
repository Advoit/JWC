/**
 * Übersetzt Fehler-Keys (z. B. `nextcloud.http401` oder `sync.remoteUnreadable`)
 * in Anzeigetexte. Unbekannte HTTP-Codes werden auf den generischen Text
 * gemappt; nicht übersetzbare Meldungen bleiben als Rohtext erhalten.
 * Gemeinsam genutzt von allen Einstellungs-Unterseiten (DRY).
 */
import { useI18n } from 'vue-i18n'

export function useErrorText() {
  const { t, te } = useI18n()

  return (e: unknown): string => {
    const msg = e instanceof Error ? e.message : ''
    if (!msg) return t('settings.nextcloudSyncError')
    const httpMatch = msg.match(/^nextcloud\.http(\d+)$/)
    if (httpMatch && !te(msg)) return t('nextcloud.httpGeneric', { code: httpMatch[1] })
    if (te(msg)) return t(msg)
    return msg
  }
}