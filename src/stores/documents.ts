/**
 * Dokumenten-Store. Die Ordner-/Datei-Struktur (Baum) lebt in den StoredItems
 * der congregation (`ITEM_TYPE_DOCUMENT`, persistiert + gesynct). Dieser Store
 * kapselt die Inhaltsoperationen (Upload, Download, Löschen) und entscheidet,
 * wohin der Inhalt geht – bevorzugt Nextcloud (verschlüsselt), sonst lokaler
 * Fallback. Er bietet außerdem kaskadierendes Löschen von Ordnern.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSessionStore } from './session'
import { useCongregationStore } from './congregation'
import { decryptAppPassword } from './sync'
import type { NextcloudConfig } from '../types'
import { deleteDocContent, readDocContent, writeDocContent, type DocLocation } from '../services/docContent'
import { makeDir } from '../services/nextcloud'
import { childrenOf } from '../services/documents'

export const useDocumentsStore = defineStore('documents', () => {
  const session = useSessionStore()
  const congregation = useCongregationStore()

  const busy = ref(false)
  const error = ref('')

  /** Baut den Ort für Inhaltszugriffe nach aktuellem Versammlungsstand. */
  async function location(): Promise<DocLocation> {
    const congId = session.congregationId ?? 'unknown'
    const cfg: NextcloudConfig | undefined = session.congregation?.nextcloud
    if (cfg?.url && cfg.user) {
      const appPassword = await decryptAppPassword(cfg)
      if (appPassword) {
        return { mode: 'nextcloud', congId, cfg, appPassword }
      }
    }
    return { mode: 'local', congId }
  }

  /** Legt den Nextcloud-Dokumentordner an, falls er noch fehlt. */
  async function ensureRemoteDir(): Promise<void> {
    const loc = await location()
    if (loc.mode !== 'nextcloud' || !loc.cfg || !loc.appPassword) return
    const base = 'jwc-docs'
    await makeDir(loc.cfg, loc.appPassword, base)
    await makeDir(loc.cfg, loc.appPassword, `${base}/${encodeURIComponent(loc.congId)}`)
  }

  /** Lädt eine Datei in den übergeordneten Ordner hoch. */
  async function uploadFile(file: File, parentId: string | null): Promise<void> {
    const cong = session.congregation
    if (!cong) return
    busy.value = true
    error.value = ''
    try {
      const item = congregation.addDocument({
        kind: 'file',
        name: file.name,
        parentId,
        shared: false,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      })
      await ensureRemoteDir()
      await writeDocContent(await location(), cong, item.id, file)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fehler beim Hochladen.'
      throw e
    } finally {
      busy.value = false
    }
  }

  /** Erstellt einen neuen Ordner im übergeordneten Ordner. */
  async function createFolder(name: string, parentId: string | null): Promise<void> {
    congregation.addDocument({ kind: 'folder', name: name.trim(), parentId, shared: false })
  }

  /** Lädt den Inhalt einer Datei herunter (Blob) – für Vorschau/Download. */
  async function getContent(docId: string): Promise<Blob | null> {
    const cong = session.congregation
    if (!cong) return null
    try {
      return await readDocContent(await location(), cong, docId)
    } catch {
      return null
    }
  }

  /** Startet den Download einer Datei im Browser. */
  async function downloadDocument(docId: string): Promise<void> {
    const node = congregation.documentById(docId)
    if (!node || node.data.kind !== 'file') return
    const blob = await getContent(docId)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = node.data.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  /** Löscht einen Knoten inkl. rekursiv aller Nachfahren und deren Inhalte. */
  async function deleteNode(id: string): Promise<void> {
    const loc = await location()
    const ids = [id, ...subtreeIds(id)]
    for (const docId of ids) {
      const node = congregation.documentById(docId)
      if (node?.data.kind === 'file') await deleteDocContent(loc, docId)
      congregation.removeDocument(docId)
    }
  }

  /** Verschiebt einen Knoten in einen neuen übergeordneten Ordner (null = Wurzel). */
  function moveNode(id: string, newParentId: string | null): void {
    congregation.updateDocument(id, { parentId: newParentId })
  }

  /** Benennt einen Knoten um. */
  function renameNode(id: string, name: string): void {
    congregation.updateDocument(id, { name: name.trim() })
  }

  /** Schaltet „geteilt“ bei einem Knoten um. */
  function toggleShare(id: string): void {
    const node = congregation.documentById(id)
    if (node) congregation.updateDocument(id, { shared: !node.data.shared })
  }

  function subtreeIds(id: string): string[] {
    const out: string[] = []
    const stack = [...childrenOf(congregation.documents, id)]
    while (stack.length) {
      const cur = stack.pop()!
      out.push(cur.id)
      stack.push(...childrenOf(congregation.documents, cur.id))
    }
    return out
  }

  return {
    busy,
    error,
    location,
    uploadFile,
    createFolder,
    getContent,
    downloadDocument,
    deleteNode,
    moveNode,
    renameNode,
    toggleShare,
  }
})