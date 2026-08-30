<script setup lang="ts">
/**
 * Dokumente (Explorer). Admin: voller Zugriff (Hochladen, Ordner, Umbenennen,
 * Verschieben per Drag&Drop, Löschen, Teilen). Normaler Benutzer: sieht und lädt
 * nur freigegebene Inhalte herunter – kein Bearbeiten/Verschieben/Löschen.
 * Inhalte liegen verschlüsselt auf Nextcloud (Fallback lokal). Vorschau inline
 * für Bilder + PDF, sonst Download.
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import { useCongregationStore } from '../../stores/congregation'
import { useDocumentsStore } from '../../stores/documents'
import AppIcon from '../../components/AppIcon.vue'
import {
  isFolder,
  childrenOf,
  breadcrumbOf,
  isValidDocumentName,
  formatFileSize,
  canBeParent,
  wouldCreateCycle,
  isImageName,
  isPdfName,
  extensionOf,
} from '../../services/documents'
import type { DocumentNodeItem } from '../../types'

const session = useSessionStore()
const congregation = useCongregationStore()
const docs = useDocumentsStore()
const { t } = useI18n()

const isAdmin = computed(() => session.isAdminUnlocked)

// ---- Navigation -------------------------------------------------------------
const currentFolderId = ref<string | null>(null)

const visibleNodes = computed(() => {
  let nodes = childrenOf(congregation.documents, currentFolderId.value)
  // Normale Benutzer sehen nur freigegebene Einträge.
  if (!isAdmin.value) nodes = nodes.filter((n) => n.data.shared)
  return nodes
})

const crumbs = computed(() => breadcrumbOf(congregation.documents, currentFolderId.value))

function openFolder(n: DocumentNodeItem): void {
  if (isFolder(n)) currentFolderId.value = n.id
}

function crumbGo(id: string | null): void {
  currentFolderId.value = id
}

// ---- Befehle (nur Admin) -----------------------------------------------------
const nameInput = ref('')
const folderOpen = ref(false)

function startNewFolder(): void {
  nameInput.value = ''
  folderOpen.value = true
}

async function createFolder(): Promise<void> {
  if (!isValidDocumentName(nameInput.value, 'folder')) return
  await docs.createFolder(nameInput.value, currentFolderId.value)
  folderOpen.value = false
}

/** Versteckter Upload-Trigger (File-Input). */
const fileInput = ref<HTMLInputElement | null>(null)
function triggerUpload(): void {
  fileInput.value?.click()
}

async function onFilesPicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  for (const f of files) await docs.uploadFile(f, currentFolderId.value)
}

// Umbenennen
const renamingId = ref<string | null>(null)
const renameInput = ref('')
function startRename(n: DocumentNodeItem): void {
  renamingId.value = n.id
  renameInput.value = n.data.name
}
async function confirmRename(): Promise<void> {
  if (!renamingId.value) return
  const node = congregation.documentById(renamingId.value)
  if (node && isValidDocumentName(renameInput.value, node.data.kind)) {
    docs.renameNode(renamingId.value, renameInput.value)
  }
  renamingId.value = null
}

// Löschen
async function deleteNode(n: DocumentNodeItem): Promise<void> {
  const label = t('documents.deleteConfirm')
  if (!window.confirm(label)) return
  await docs.deleteNode(n.id)
}

// Verschieben
const moveId = ref<string | null>(null)
const moveTarget = ref<string | null | undefined>(undefined)
const movePickerOpen = ref(false)
const moveFolders = computed(() => congregation.documents.filter((n) => isFolder(n)))
const moveParentName = computed(() => {
  const f = moveTarget.value ? congregation.documentById(moveTarget.value) : undefined
  return f?.data.name ?? t('documents.root')
})

function openMovePicker(n: DocumentNodeItem): void {
  moveId.value = n.id
  moveTarget.value = n.data.parentId
  movePickerOpen.value = true
}
function confirmMove(): void {
  if (!moveId.value) return
  const target = moveTarget.value ?? null
  const node = congregation.documentById(moveId.value)
  if (target && node && wouldCreateCycle(congregation.documents, node, target)) {
    window.alert(t('documents.cycleError'))
    return
  }
  docs.moveNode(moveId.value, target)
  movePickerOpen.value = false
}

// Drag & Drop
const dragId = ref<string | null>(null)
function onDragStart(_e: DragEvent, n: DocumentNodeItem): void {
  dragId.value = n.id
}
function onDrop(n: DocumentNodeItem | null): void {
  if (!dragId.value || dragId.value === (n?.id ?? null)) {
    dragId.value = null
    return
  }
  const source = congregation.documentById(dragId.value)
  if (source && n && !canBeParent(source, n)) {
    dragId.value = null
    return
  }
  if (source && n && wouldCreateCycle(congregation.documents, source, n.id)) {
    window.alert(t('documents.cycleError'))
    dragId.value = null
    return
  }
  docs.moveNode(dragId.value, n ? n.id : null)
  dragId.value = null
}

// Toggle teilen
function toggleShare(n: DocumentNodeItem): void {
  docs.toggleShare(n.id)
}

// Vorschau / Download
const previewId = ref<string | null>(null)
const previewBlob = ref<string | null>(null)
const previewMime = ref('')
const previewing = computed(() => previewId.value !== null)

async function openPreview(n: DocumentNodeItem): Promise<void> {
  if (!isFolder(n)) {
    previewId.value = n.id
    previewMime.value = n.data.mime ?? ''
    const blob = await docs.getContent(n.id)
    previewBlob.value = blob ? URL.createObjectURL(blob) : null
  }
}
function closePreview(): void {
  if (previewBlob.value) URL.revokeObjectURL(previewBlob.value)
  previewBlob.value = null
  previewId.value = null
}

async function downloadNode(n: DocumentNodeItem): Promise<void> {
  await docs.downloadDocument(n.id)
}

/** Formatiertes Datum aus createdAt. */
function fileMeta(n: DocumentNodeItem): string {
  const bits: string[] = []
  if (!isFolder(n)) {
    const size = formatFileSize(n.data.size)
    if (size) bits.push(size)
    const ext = extensionOf(n.data.name)
    if (ext) bits.push(ext.toUpperCase())
  }
  return bits.join(' · ')
}

// Erweiterungs-Helper für Template
const ext = (n: DocumentNodeItem): string => (isFolder(n) ? '' : extensionOf(n.data.name).toUpperCase() || '?')
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('nav.documents') }}</h1>

    <!-- Pfad / Aktionen -->
    <div class="toolbar">
      <nav class="crumbs">
        <button class="crumb" @click="crumbGo(null)">{{ t('documents.root') }}</button>
        <template v-for="c in crumbs" :key="c.id">
          <span class="crumb-sep">/</span>
          <button class="crumb" @click="crumbGo(c.id)">{{ c.data.name }}</button>
        </template>
      </nav>

      <div v-if="isAdmin" class="toolbar-actions">
        <button class="btn btn--ghost btn--small" @click="startNewFolder">
          <AppIcon name="plus" :size="16" />
          <span>{{ t('documents.newFolder') }}</span>
        </button>
        <button class="btn btn--primary btn--small" @click="triggerUpload">
          <AppIcon name="upload" :size="16" />
          <span>{{ t('documents.upload') }}</span>
        </button>
        <input ref="fileInput" type="file" multiple hidden @change="onFilesPicked" />
      </div>
    </div>

    <div v-if="isAdmin && folderOpen" class="card inline-form">
      <div class="field">
        <label>{{ t('documents.folderName') }}</label>
        <input v-model="nameInput" class="input" :placeholder="t('documents.folderNamePlaceholder')" @keyup.enter="createFolder" />
      </div>
      <div class="row">
        <button class="btn btn--primary btn--narrow" @click="createFolder">{{ t('common.save') }}</button>
        <button class="btn btn--ghost btn--narrow" @click="folderOpen = false">{{ t('common.cancel') }}</button>
      </div>
    </div>

    <!-- Liste -->
    <div class="card">
      <p v-if="visibleNodes.length === 0" class="card-sub">
        {{ isAdmin ? t('documents.empty') : t('documents.emptyShared') }}
      </p>

      <ul v-else class="doc-list">
        <li
          v-for="n in visibleNodes"
          :key="n.id"
          class="doc-row"
          :class="{
            'is-folder': isFolder(n),
            'is-dragover': dragId && dragId !== n.id && isFolder(n),
          }"
          draggable="true"
          @dragstart="onDragStart($event, n)"
          @dragover.prevent
          @drop.prevent="onDrop(n)"
          @dblclick="isFolder(n) ? openFolder(n) : openPreview(n)"
        >
          <div class="doc-ic" :class="isFolder(n) ? 'ic--folder' : 'ic--file'">
            <AppIcon :name="isFolder(n) ? 'documents' : 'documents'" :size="20" />
            <span class="ext-badge" v-if="!isFolder(n)">{{ ext(n) }}</span>
          </div>

          <div class="doc-body">
            <span class="doc-name">{{ n.data.name }}</span>
            <span class="doc-meta">
              <span v-if="n.data.shared" class="badge badge--shared">{{ t('documents.shared') }}</span>
              <span>{{ fileMeta(n) }}</span>
            </span>
          </div>

          <!-- Aktionen: Admin voll, Benutzer nur Download -->
          <span class="doc-actions">
            <template v-if="isAdmin">
              <button class="icon-btn" :class="n.data.shared ? 'is-on' : ''" :title="t('documents.shareToggle')" @click="toggleShare(n)">
                <AppIcon name="cloud" :size="16" />
              </button>
              <button class="icon-btn" :title="t('common.edit')" @click="startRename(n)">
                <AppIcon name="pencil" :size="16" />
              </button>
              <button class="icon-btn" :title="t('documents.move')" @click="openMovePicker(n)">
                <AppIcon name="documents" :size="16" />
              </button>
            </template>
            <button v-if="!isFolder(n)" class="icon-btn" :title="t('documents.download')" @click="downloadNode(n)">
              <AppIcon name="download" :size="16" />
            </button>
            <button v-if="isAdmin" class="icon-btn icon-btn--danger" :title="t('common.delete')" @click="deleteNode(n)">
              <AppIcon name="trash" :size="16" />
            </button>
          </span>
        </li>
      </ul>

      <div v-if="isAdmin" class="drop-hint" @dragover.prevent @drop.prevent="onDrop(null)">
        <AppIcon name="upload" :size="18" />
        <span>{{ t('documents.dropHere') }}</span>
      </div>
    </div>

    <!-- Umbenennen-Dialog -->
    <div v-if="renamingId" class="modal-mask" @click.self="renamingId = null">
      <div class="modal">
        <h3 class="modal-title">{{ t('documents.rename') }}</h3>
        <div class="field">
          <input v-model="renameInput" class="input" @keyup.enter="confirmRename" />
        </div>
        <div class="row">
          <button class="btn btn--primary btn--narrow" @click="confirmRename">{{ t('common.save') }}</button>
          <button class="btn btn--ghost btn--narrow" @click="renamingId = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Verschieben-Dialog -->
    <div v-if="movePickerOpen" class="modal-mask" @click.self="movePickerOpen = false">
      <div class="modal">
        <h3 class="modal-title">{{ t('documents.moveTo') }}</h3>
        <div class="row">
          <button class="btn btn--ghost btn--small" @click="moveTarget = null">{{ t('documents.root') }}</button>
          <button
            v-for="f in moveFolders"
            :key="f.id"
            class="btn btn--ghost btn--small"
            :class="{ 'is-selected': moveTarget === f.id }"
            @click="moveTarget = f.id"
          >
            {{ f.data.name }}
          </button>
        </div>
        <p class="move-current">{{ t('documents.moveCurrent') }}: {{ moveParentName }}</p>
        <div class="row">
          <button class="btn btn--primary btn--narrow" @click="confirmMove">{{ t('common.save') }}</button>
          <button class="btn btn--ghost btn--narrow" @click="movePickerOpen = false">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Vorschau -->
    <div v-if="previewing" class="modal-mask" @click.self="closePreview">
      <div class="modal modal--preview">
        <div class="modal-title-row">
          <h3 class="modal-title">{{ congregation.documentById(previewId)?.data.name }}</h3>
          <button class="icon-btn" title="Schließen" @click="closePreview"><AppIcon name="eyeOff" :size="16" /></button>
        </div>

        <template v-if="previewBlob">
          <img v-if="isImageName(congregation.documentById(previewId)?.data.name ?? '')" :src="previewBlob" class="preview-img" alt="" />
          <iframe v-else-if="isPdfName(congregation.documentById(previewId)?.data.name ?? '')" :src="previewBlob" class="preview-pdf" />
          <div v-else class="preview-fallback">
            <AppIcon name="documents" :size="40" />
            <p>{{ t('documents.noPreview') }}</p>
            <button class="btn btn--primary btn--narrow" @click="previewId ? downloadNode(congregation.documentById(previewId)!) : null">
              <AppIcon name="download" :size="16" />
              <span>{{ t('documents.download') }}</span>
            </button>
          </div>
        </template>
        <p v-else class="card-sub">{{ t('documents.loading') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.crumb {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
}

.crumb:hover {
  background: var(--color-accent-soft);
}

.crumb-sep {
  color: var(--color-text-muted);
}

.toolbar-actions {
  display: inline-flex;
  gap: 8px;
}

.btn--small {
  width: auto;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 10px;
}

.inline-form {
  margin-bottom: 14px;
  padding: 16px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  border-radius: 8px;
  transition: background 0.12s;
}

.doc-row.is-dragover {
  background: var(--color-accent-soft);
  outline: 2px dashed var(--color-accent);
}

.doc-ic {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.ic--folder {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.ic--file {
  background: var(--color-border);
  color: var(--color-text-muted);
}

.ext-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 8px;
  font-weight: 800;
  color: var(--color-text-muted);
}

.doc-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.badge--shared {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
}

.doc-actions {
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.icon-btn.is-on {
  color: var(--color-accent);
}

.icon-btn--danger:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.drop-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 14px;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

/* Modal */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.modal--preview {
  max-width: 860px;
}

.modal-title {
  font-size: 17px;
  margin-bottom: 14px;
}

.modal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 10px;
  object-fit: contain;
}

.preview-pdf {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 10px;
}

.preview-fallback {
  text-align: center;
  padding: 24px;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.is-selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.move-current {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}
</style>