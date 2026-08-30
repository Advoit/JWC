/**
 * Tests für die Nextcloud-URL-Normalisierung: Die WebDAV-Basis-URL darf nicht
 * doppelt angehängt werden – egal, ob eine Basis-Domain oder die volle
 * WebDAV-Pfad-URL angegeben wird.
 */
import { describe, it, expect } from 'vitest'
import { normalizeDirs } from './nextcloud'

describe('normalizeDirs', () => {
  it('baut die WebDAV-URL aus einer Basis-Domain', () => {
    expect(normalizeDirs('https://cloud.example.org', 'JWCdev')).toBe(
      'https://cloud.example.org/remote.php/dav/files/JWCdev'
    )
  })

  it('entfernt eine bereits angehängte volle WebDAV-Pfad-URL (kein Doppeln)', () => {
    expect(normalizeDirs('https://cloud.example.org/remote.php/dav/files/JWCdev', 'JWCdev')).toBe(
      'https://cloud.example.org/remote.php/dav/files/JWCdev'
    )
  })

  it('entfernt einen angehängten remote.php/dav-Teil (Basis-Pfad-URL)', () => {
    expect(normalizeDirs('https://cloud.example.org/remote.php/dav', 'JWCdev')).toBe(
      'https://cloud.example.org/remote.php/dav/files/JWCdev'
    )
  })

  it('normalisiert Domains ohne Protokoll auf HTTPS', () => {
    expect(normalizeDirs('cloud.example.org', 'JWCdev')).toBe(
      'https://cloud.example.org/remote.php/dav/files/JWCdev'
    )
  })
})