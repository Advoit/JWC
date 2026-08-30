<script setup lang="ts">
/**
 * Gruppen (öffentlich): zeigt alle Gruppen mit Name, Leiter (dunkler Akzent),
 * Stellvertreter (heller Akzent) und den Teilnehmern – nach Nachname sortiert.
 * Versteckte Personen erscheinen nicht.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCongregationStore } from '../../stores/congregation'
import { personName, sortGroupsByName, sortPeopleByLastName, peopleByIds } from '../../services/congregation'
import type { GroupItem, PersonItem } from '../../types'

const congregation = useCongregationStore()
const { t } = useI18n()

const groups = computed(() => sortGroupsByName(congregation.groups))
const visible = computed(() => congregation.people.filter((p) => !p.data.hidden))

function leader(g: GroupItem): PersonItem | undefined {
  return visible.value.find((p) => p.id === g.data.leaderId)
}

function deputy(g: GroupItem): PersonItem | undefined {
  return visible.value.find((p) => p.id === g.data.deputyId)
}

/** Alle sichtbaren Namen einer Gruppe in Anzeige-Reihenfolge. */
function groupNameList(g: GroupItem): { person: PersonItem; isLeader: boolean; isDeputy: boolean }[] {
  const [l, d] = [leader(g), deputy(g)]
  const others = peopleByIds(visible.value, g.data.memberIds).filter((p) => p.id !== l?.id && p.id !== d?.id)
  const list: { person: PersonItem; isLeader: boolean; isDeputy: boolean }[] = []
  if (l) list.push({ person: l, isLeader: true, isDeputy: false })
  if (d) list.push({ person: d, isLeader: false, isDeputy: true })
  for (const p of sortPeopleByLastName(others)) {
    list.push({ person: p, isLeader: false, isDeputy: false })
  }
  return list
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('nav.sub.gruppen') }}</h1>

    <p v-if="groups.length === 0" class="card-sub">{{ t('groups.empty') }}</p>

    <div v-for="g in groups" :key="g.id" class="card group-card">
      <h2 class="group-name">{{ g.data.name }}</h2>

      <p v-if="groupNameList(g).length === 0" class="card-sub">{{ t('groups.noMembers') }}</p>
      <ul v-else class="member-list">
        <li
          v-for="{ person, isLeader, isDeputy } in groupNameList(g)"
          :key="person.id"
          class="member-row"
          :class="{ 'member-row--leader': isLeader, 'member-row--deputy': isDeputy }"
        >
          <span v-if="isLeader" class="role-tag role-tag--leader">{{ t('groups.leader') }}</span>
          <span v-else-if="isDeputy" class="role-tag role-tag--deputy">{{ t('groups.deputy') }}</span>
          <span class="member-name">{{ personName(person.data) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.group-card {
  padding: 20px;
}

.group-name {
  font-size: 19px;
  margin-bottom: 14px;
}

.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 15px;
  border-bottom: 1px solid var(--color-border);
}

.member-row:last-child {
  border-bottom: none;
}

.member-row--leader {
  font-weight: 600;
}

.member-row--deputy {
  font-weight: 500;
}

.role-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
}

.role-tag--leader {
  background: var(--role-leader-bg);
  color: var(--role-leader-fg);
}

.role-tag--deputy {
  background: var(--role-deputy-bg);
  color: var(--role-deputy-fg);
}

.member-name {
  min-width: 0;
}
</style>
