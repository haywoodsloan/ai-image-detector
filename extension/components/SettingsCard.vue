<script setup>
import SettingsSvg from '@/assets/settings.svg';
import {
  AiIndicatorColor,
  PrimaryColorLight,
  RealIndicatorColor,
} from '@/utilities/color.js';
import { useSettings } from '@/utilities/settings.js';
import { userAuth, userSettings } from '@/utilities/storage.js';
import { mdiInformationOutline } from '@mdi/js';
import { isHttpUrl } from 'common/utilities/url.js';

import DonateLinks from './DonateLinks.vue';
import StyleProvider from './StyleProvider.vue';

/** @type {Ref<string>} */
const currentSite = ref(null);
browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (isHttpUrl(tab?.url)) currentSite.value = new URL(tab.url).host;
});

/**
 * @param {{tabId: number}}
 */
const onSiteChange = async ({ tabId }) => {
  const tab = await browser.tabs.get(tabId);
  if (!tab.active) return;

  if (isHttpUrl(tab?.url)) currentSite.value = new URL(tab.url).host;
  else currentSite.value = null;
};

browser.webNavigation.onCommitted.addListener(onSiteChange);
onUnmounted(() =>
  browser.webNavigation.onCommitted.removeListener(onSiteChange)
);

/** @type {Ref<UserSettings>} */
const originalSettings = ref(null);
userSettings.getValue().then((settings) => (originalSettings.value = settings));

const storedSettings = useSettings();
const toggles = computed({
  get: () =>
    Object.keys(storedSettings.value ?? {}).filter(
      (key) => storedSettings.value[key] === true
    ),
  set: async (newVal) =>
    await userSettings.setValue({
      ...Object.fromEntries(newVal.map((key) => [key, true])),
      ...Object.fromEntries(
        Object.entries(await userSettings.getValue()).filter(
          ([, value]) => typeof value !== 'boolean'
        )
      ),
    }),
});

const disabledSites = computed({
  get: () => storedSettings.value?.disabledSites ?? [],
  set: async (newVal) =>
    await userSettings.setValue({
      ...(await userSettings.getValue()),
      disabledSites: newVal,
    }),
});

const reloadNeeded = computed(() => {
  const [original, current] = [originalSettings.value, storedSettings.value];
  if (!original || !current) return false;

  const site = currentSite.value;
  if (!site) return false;

  return (
    original.autoCheck !== current.autoCheck ||
    original.disabledSites.includes(site) !==
      current.disabledSites.includes(site)
  );
});

async function toggleDisabledSite(site) {
  const sites = disabledSites.value;
  if (sites.includes(site)) {
    disabledSites.value = sites.filter((s) => s !== site);
  } else {
    disabledSites.value = [...sites, site];
  }
}

async function logout() {
  await userAuth.removeValue();
}

async function reload() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  await browser.tabs.reload(tab.id);

  const replaceSettings = await userSettings.getValue();
  originalSettings.value = replaceSettings;
}
</script>

<template>
  <v-card min-width="425" class="d-flex flex-column">
    <v-card-item class="pb-0">
      <v-card-title> AI Image Detector </v-card-title>

      <v-card-subtitle> Settings </v-card-subtitle>

      <template #append>
        <v-icon class="icon mb-2" :icon="SettingsSvg" />
      </template>
    </v-card-item>
    <v-card-text
      v-if="storedSettings !== null"
      class="pa-0 d-flex flex-column overflow-hidden"
    >
      <v-fade-transition>
        <div v-if="reloadNeeded" class="text-medium-emphasis d-flex px-4 py-2">
          A reload is required for changes to take effect.
          <v-btn class="ml-6" :color="RealIndicatorColor" @click="reload">
            Reload Site
          </v-btn>
        </div>
      </v-fade-transition>

      <v-list
        v-model:selected="toggles"
        class="pa-0"
        lines="two"
        density="comfortable"
        select-strategy="leaf"
      >
        <v-list-item class="px-4" value="autoCheck">
          <v-list-item-title class="d-flex mb-1 gc-2">
            Automatically check images

            <v-tooltip location="top center">
              <template #activator="{ props }">
                <v-icon
                  v-bind="props"
                  :icon="mdiInformationOutline"
                  :color="PrimaryColorLight"
                />
              </template>

              Data used for image analysis is never stored. Requires a page
              reload for changes to take effect.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Check images as you browse and display an icon to indicate if its
            real or AI.
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColorLight"
                :model-value="isActive"
                inset
                hide-details
              />
            </v-list-item-action>
          </template>
        </v-list-item>

        <v-list-item
          class="pr-4 pl-8"
          value="autoCheckPrivate"
          :disabled="!toggles.includes('autoCheck')"
        >
          <v-list-item-title class="d-flex mb-1 gc-2">
            Check private images

            <v-tooltip location="top center">
              <template #activator="{ props }">
                <v-icon
                  v-bind="props"
                  :icon="mdiInformationOutline"
                  :color="PrimaryColorLight"
                />
              </template>
              Metadata (GPS, camera info, etc.) will be removed before sending
              the image for analysis. May increase bandwidth usage.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Also check images that are private (not accessible by just the URL).
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColorLight"
                :model-value="isActive && toggles.includes('autoCheck')"
                inset
                hide-details
              />
            </v-list-item-action>
          </template>
        </v-list-item>

        <v-list-item class="px-4" value="uploadImages">
          <v-list-item-title class="d-flex mb-1 gc-2">
            Upload reported images

            <v-tooltip location="top center">
              <template #activator="{ props }">
                <v-icon
                  v-bind="props"
                  :icon="mdiInformationOutline"
                  :color="PrimaryColorLight"
                />
              </template>

              Images are kept secure and private, they will only used to improve
              the detector.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Upload image data to improve the detector when reporting them as
            real or AI.
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColorLight"
                :model-value="isActive"
                inset
                hide-details
              />
            </v-list-item-action>
          </template>
        </v-list-item>

        <v-list-item
          class="pr-4 pl-8"
          value="uploadImagesPrivate"
          :disabled="!toggles.includes('uploadImages')"
        >
          <v-list-item-title class="d-flex mb-1 gc-2">
            Upload private images

            <v-tooltip location="top center">
              <template #activator="{ props }">
                <v-icon
                  v-bind="props"
                  :icon="mdiInformationOutline"
                  :color="PrimaryColorLight"
                />
              </template>

              Metadata (GPS, camera info, etc.) will be removed before
              uploading.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Also upload images that are private when reporting them.
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColorLight"
                :model-value="isActive && toggles.includes('uploadImages')"
                inset
                hide-details
              />
            </v-list-item-action>
          </template>
        </v-list-item>

        <v-list-item
          v-if="currentSite"
          class="px-4"
          :active="disabledSites.includes(currentSite)"
          @click="toggleDisabledSite(currentSite)"
        >
          <v-list-item-title> Disable for this site </v-list-item-title>

          <v-list-item-subtitle opacity="1">
            <span class="text-medium-emphasis">
              Disable automatic image check for just this site:
            </span>
            <span :style="{ color: PrimaryColorLight }">
              {{ currentSite }}
            </span>
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColorLight"
                :model-value="isActive"
                inset
                hide-details
              />
            </v-list-item-action>
          </template>
        </v-list-item>

        <v-list-item>
          <v-list-item-action>
            <v-dialog>
              <template #activator="{ props }">
                <v-btn
                  class="flex-fill"
                  v-bind="props"
                  :color="AiIndicatorColor"
                >
                  Sign Out
                </v-btn>
              </template>

              <template #default="{ isActive }">
                <StyleProvider>
                  <v-card>
                    <v-card-title>
                      Are you sure you want to sign out?
                    </v-card-title>
                    <v-card-text class="text-body-1">
                      You will need to sign in again before you can use the
                      detector.
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn @click="isActive.value = false"> Cancel </v-btn>
                      <v-btn :color="AiIndicatorColor" @click="logout">
                        Sign out
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </StyleProvider>
              </template>
            </v-dialog>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
    <DonateLinks />
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  height: 38px;
  width: 38px;
}
</style>
