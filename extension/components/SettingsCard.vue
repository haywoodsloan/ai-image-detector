<script setup>
import SettingsSvg from '@/assets/settings.svg';
import { AiIndicatorColor, PrimaryColor } from '@/utilities/color.js';
import { useSettings } from '@/utilities/settings.js';
import { userAuth, userSettings } from '@/utilities/storage.js';
import { mdiInformationOutline } from '@mdi/js';
import { isHttpUrl } from 'common/utilities/url.js';

import StyleProvider from './StyleProvider.vue';

/** @type {Ref<string>} */
const currentSite = ref(null);
browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (isHttpUrl(tab?.url)) currentSite.value = new URL(tab.url).origin;
});

/**
 * @param {{tabId: number}}
 */
const onSiteChange = async ({ tabId }) => {
  const tab = await browser.tabs.get(tabId);
  if (isHttpUrl(tab?.url)) currentSite.value = new URL(tab.url).origin;
  else currentSite.value = null;
};

browser.tabs.onActivated.addListener(onSiteChange);
browser.webNavigation.onCommitted.addListener(onSiteChange)
onUnmounted(() => {
  browser.tabs.onActivated.removeListener(onSiteChange);
  browser.webNavigation.onCommitted.removeListener(onSiteChange);
});

const storedSettings = useSettings();
const toggles = computed({
  get: () =>
    Object.keys(storedSettings.value ?? {}).filter(
      (key) => storedSettings.value[key] === true
    ),
  set: async (newVal) =>
    await userSettings.setValue({
      ...(await userSettings.getValue()),
      autoCheck: newVal.includes('autoCheck'),
      autoCheckPrivate: newVal.includes('autoCheckPrivate'),
      uploadImages: newVal.includes('uploadImages'),
      uploadImagesPrivate: newVal.includes('uploadImagesPrivate'),
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

async function toggleSiteDisable() {
  if (disabledSites.value.includes(currentSite.value)) {
    disabledSites.value = disabledSites.value.filter(
      (site) => site !== currentSite.value
    );
  } else {
    disabledSites.value = [...disabledSites.value, currentSite.value];
  }
}

async function logout() {
  await userAuth.removeValue();
}
</script>

<template>
  <v-card min-width="400">
    <v-card-item>
      <v-card-title> AI Image Detector </v-card-title>

      <v-card-subtitle> Settings </v-card-subtitle>

      <template #append>
        <settings-svg class="icon" />
      </template>
    </v-card-item>
    <v-card-text class="pa-0">
      <v-list
        v-model:selected="toggles"
        class="pa-0 overflow-visible"
        lines="two"
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
                  :color="PrimaryColor"
                />
              </template>

              Data used for image analysis is never stored.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Check images as you browse and display an icon to indicate if its
            real or AI.
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColor"
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
                  :color="PrimaryColor"
                />
              </template>
              Metadata (GPS, camera info, etc.) will be removed before sending
              the image for analysis.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Also check images that are private (not accessible by just the URL).
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColor"
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
                  :color="PrimaryColor"
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
                :color="PrimaryColor"
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
                  :color="PrimaryColor"
                />
              </template>

              Images are kept secure and private, they will only used to improve
              the detector.
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Also upload images that are private when reporting them.
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColor"
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
          @click.prevent="toggleSiteDisable"
        >
          <v-list-item-title> Disable for this site </v-list-item-title>

          <v-list-item-subtitle opacity="1">
            <span class="text-medium-emphasis">
              Disable automatic image check for just this site:
            </span>
            <span :style="{ color: PrimaryColor }">
              {{ currentSite }}
            </span>
          </v-list-item-subtitle>

          <template #append="{ isActive }">
            <v-list-item-action class="ml-3">
              <v-switch
                :color="PrimaryColor"
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
                      <v-btn @click.prevent="isActive.value = false">
                        Cancel
                      </v-btn>
                      <v-btn :color="AiIndicatorColor" @click.prevent="logout">
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
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  display: block;
  height: 38px;
  width: 38px;
}
</style>
