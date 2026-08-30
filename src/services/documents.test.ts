/**
 * Tests für die reinen Dokumenten-Helfer (Ordner/Dateien): Sortierung,
 * Gültigkeit von Namen, Breadcrumb, Zykluserkennung beim Verschieben.
 */
import { describe, it, expect } from 'vitest'
import {
  isFolder,
  extensionOf,
  basenameOf,
  isImageName,
  isPdfName,
  isValidDocumentName,
  sortDocumentNodes,
  childrenOf,
  breadcrumbOf,
  canBeParent,
  wouldCreateCycle,
  formatFileSize,
} from './documents'
import type { DocumentNodeItem } from '../types'

function node(id: string, name: string, parentId: string | null, kind: 'folder' | 'file' = 'file'): DocumentNodeItem {
  return {
    id,
    type: 'document',
    data: { kind, name, parentId, shared: false },
    createdAt: '',
    updatedAt: '',
  }
}

describe('extensionOf / basenameOf', () => {
  it('liest Endung und Basis eines Dateinamens', () => {
    expect(extensionOf('Bericht.PDF')).toBe('pdf')
    expect(basenameOf('Bericht.PDF')).toBe('Bericht')
    expect(extensionOf('ohne')).toBe('')
    expect(basenameOf('ohne')).toBe('ohne')
  })
})

describe('isImageName / isPdfName', () => {
  it('erkennt Bilder und PDFs', () => {
    expect(isImageName('foto.PNG')).toBe(true)
    expect(isImageName('doku.PNG')).toBe(true)
    expect(isPdfName('doku.pdf')).toBe(true)
    expect(isImageName('doku.docx')).toBe(false)
    expect(isImageName('doku.pdf')).toBe(false)
    expect(isPdfName('foto.png')).toBe(false)
  })
})

describe('isValidDocumentName', () => {
  it('lehnt leere, Pfad- und Sonderfälle ab', () => {
    expect(isValidDocumentName('  ', 'folder')).toBe(false)
    expect(isValidDocumentName('a/b', 'file')).toBe(false)
    expect(isValidDocumentName('.', 'folder')).toBe(false)
    expect(isValidDocumentName('..', 'file')).toBe(false)
  })
  it('akzeptiert normale Namen', () => {
    expect(isValidDocumentName('Formulare', 'folder')).toBe(true)
    expect(isValidDocumentName('Bericht.pdf', 'file')).toBe(true)
  })
})

describe('sortDocumentNodes / childrenOf', () => {
  it('ordnet Ordner zuerst, dann Dateien, alphabetisch', () => {
    const nodes = [
      node('f1', 'z-datei.txt', null, 'file'),
      node('f2', 'a-ordner', null, 'folder'),
      node('f3', 'b-ordner', null, 'folder'),
    ]
    expect(sortDocumentNodes(nodes).map((n) => n.data.name)).toEqual([
      'a-ordner',
      'b-ordner',
      'z-datei.txt',
    ])
  })

  it('findet direkte Kinder, Wurzel bei null', () => {
    const nodes = [node('a', 'kind', 'root'), node('b', 'wurzel', null), node('c', 'kind2', 'root')]
    expect(childrenOf(nodes, 'root').map((n) => n.id)).toEqual(['a', 'c'])
    expect(childrenOf(nodes, null).map((n) => n.id)).toEqual(['b'])
  })
})

describe('breadcrumbOf', () => {
  it('baut die Kette von der Wurzel bis zum Knoten', () => {
    const nodes = [node('a', 'A', null, 'folder'), node('b', 'B', 'a', 'folder'), node('c', 'C', 'b')]
    expect(breadcrumbOf(nodes, 'c').map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(breadcrumbOf(nodes, null)).toEqual([])
  })
})

describe('canBeParent / wouldCreateCycle', () => {
  const nodes = [node('root', 'A', null, 'folder'), node('sub', 'B', 'root', 'folder'), node('file', 'x.txt', 'sub')]

  it('erlaubt nur Ordner als Ziel und nicht sich selbst', () => {
    expect(canBeParent(node('file', 'x.txt', 'sub'), node('root', 'A', null, 'folder'))).toBe(true)
    expect(canBeParent(node('root', 'A', null, 'folder'), node('root', 'A', null, 'folder'))).toBe(false)
    expect(canBeParent(node('file', 'x.txt', 'sub'), node('file', 'x.txt', 'sub'))).toBe(false)
  })

  it('erkennt Zyklen (Ordner in sich selbst/Unterordner)', () => {
    expect(wouldCreateCycle(nodes, node('root', 'A', null, 'folder'), 'sub')).toBe(true)
    expect(wouldCreateCycle(nodes, node('sub', 'B', 'root', 'folder'), 'root')).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('formatiert Bytes und KB', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(undefined)).toBe('')
  })
})

describe('isFolder', () => {
  it('erkennt Ordner', () => {
    expect(isFolder(node('a', 'x', null, 'folder'))).toBe(true)
    expect(isFolder(node('a', 'x', null, 'file'))).toBe(false)
  })
})