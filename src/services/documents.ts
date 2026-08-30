/**
 * Reine Helfer für den Dokumenten-Explorer (Ordner/Dateien). Keine Speicher-
 * oder Netzwerkzugriffe – leicht testbar und wiederverwendbar (DRY).
 */
import type { DocumentNodeItem } from '../types'

/** Prüft, ob ein Knoten ein Ordner ist. */
export function isFolder(n: DocumentNodeItem): boolean {
  return n.data.kind === 'folder'
}

/** Dateiendung (klein) aus dem Namen, ohne Punkt. */
export function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx < 0 ? '' : name.slice(idx + 1).toLowerCase()
}

/** Dateiname ohne Endung. */
export function basenameOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx <= 0 ? name : name.slice(0, idx)
}

/** Passt eine Endung zu den bekannten Bildformaten. */
export function isImageName(name: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(extensionOf(name))
}

/** Passt eine Endung zu PDF. */
export function isPdfName(name: string): boolean {
  return extensionOf(name) === 'pdf'
}

/** Erlaubt einen Datei-/Ordnernamen (kein Pfadtrenner, nicht leer, nicht trivial). */
export function isValidDocumentName(name: string, kind: 'folder' | 'file'): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (trimmed.includes('/') || trimmed.includes('\\')) return false
  if (/^\s*\.+$/.test(trimmed)) return false // „.“ / „..“
  if (kind === 'file' && trimmed === '.') return false
  return true
}

/** Ordnet Ordner zuerst, dann Dateien; jeweils alphabetisch (deutsch). */
export function sortDocumentNodes(nodes: DocumentNodeItem[]): DocumentNodeItem[] {
  return [...nodes].sort((a, b) => {
    if (a.data.kind !== b.data.kind) return a.data.kind === 'folder' ? -1 : 1
    return a.data.name.localeCompare(b.data.name, 'de')
  })
}

/** Direkte Kindknoten eines Ordners (Wurzel bei null), sortiert. */
export function childrenOf(nodes: DocumentNodeItem[], parentId: string | null): DocumentNodeItem[] {
  return sortDocumentNodes(nodes.filter((n) => n.data.parentId === parentId))
}

/** Vorfahrenkette von der Wurzel bis (inklusiv) zum gegebenen Knoten. */
export function breadcrumbOf(
  nodes: DocumentNodeItem[],
  nodeId: string | null
): DocumentNodeItem[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const chain: DocumentNodeItem[] = []
  let cur = nodeId ? byId.get(nodeId) : undefined
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = cur.data.parentId ? byId.get(cur.data.parentId) : undefined
  }
  return chain
}

/** Lesbare Dateigröße (z. B. „1,2 MB“). */
export function formatFileSize(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 1)} MB`
}

/** Erlaubt als übergeordneter Ordner: muss ein Ordner und nicht der Knoten selbst sein. */
export function canBeParent(target: DocumentNodeItem, folder: DocumentNodeItem): boolean {
  return isFolder(folder) && target.id !== folder.id
}

/**
 * Enthält `folder` (mitgelesen aus allen Knoten) irgendeinen Nachfahren von `target`
 * – verhindert, dass ein Ordner in sich selbst bzw. in einen seiner Unterordner
 * verschoben wird (Zyklen).
 */
export function wouldCreateCycle(
  nodes: DocumentNodeItem[],
  target: DocumentNodeItem,
  newParentId: string
): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const root = byId.get(newParentId)
  if (!root || !isFolder(root)) return false
  let cur: DocumentNodeItem | undefined = root
  const seen = new Set<string>()
  while (cur) {
    if (cur.id === target.id) return true
    if (seen.has(cur.id)) break
    seen.add(cur.id)
    cur = cur.data.parentId ? byId.get(cur.data.parentId) : undefined
  }
  return false
}