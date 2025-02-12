<script setup>
import { mdiInformationOutline, mdiLockAlert } from '@mdi/js';
import { isHttpUrl } from 'common/utilities/url.js';

import SettingsSvg from '@/assets/settings.svg';
import {
  AiIndicatorColor,
  PrimaryColorDark,
  PrimaryColorLight,
  RealIndicatorColor,
} from '@/utilities/color.js';
import { useSettings } from '@/utilities/settings.js';
import { userAuth, userSettings } from '@/utilities/storage.js';

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
    (storedSettings.value = {
      ...Object.fromEntries(newVal.map((key) => [key, true])),
      ...Object.fromEntries(
        Object.entries(storedSettings.value).filter(
          ([, value]) => typeof value !== 'boolean'
        )
      ),
    }),
});

const disabledSites = computed({
  get: () => storedSettings.value?.disabledSites ?? [],
  set: async (newVal) =>
    (storedSettings.value = {
      ...storedSettings.value,
      disabledSites: newVal,
    }),
});

const indicatorPosition = computed({
  get: () => storedSettings.value?.indicatorPosition ?? 'top-left',
  set: async (newVal) =>
    (storedSettings.value = {
      ...storedSettings.value,
      indicatorPosition: newVal,
    }),
});

const reloadNeeded = computed(() => {
  const [original, current] = [originalSettings.value, storedSettings.value];
  if (!original || !current) return false;

  const site = currentSite.value;
  if (!site) return false;

  return (
    original.autoCheck !== current.autoCheck ||
    (!original.autoCheckPrivate && current.autoCheckPrivate) ||
    (original.autoCheck &&
      original.disabledSites.includes(site) !==
        current.disabledSites.includes(site))
  );
});

/**
 * @param {string} site
 */
async function toggleDisabledSite(site) {
  const sites = disabledSites.value;
  site = site.toLowerCase();

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
  <v-card min-width="450" width="min-content" class="d-flex flex-column">
    <v-card-item class="pb-0">
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Settings</v-card-subtitle>
      <template #append>
        <v-icon class="settings-icon mb-2" :icon="SettingsSvg" />
      </template>
    </v-card-item>

    <v-card-text class="pa-0 d-flex flex-column overflow-hidden">
      <v-fade-transition>
        <div v-if="reloadNeeded" class="text-medium-emphasis d-flex px-4 py-2">
          A reload is required for changes to take effect.
          <v-btn class="ml-6" :color="RealIndicatorColor" @click="reload">
            Reload Site
          </v-btn>
        </div>
      </v-fade-transition>

      <v-list
        v-show="storedSettings !== null"
        v-model:selected="toggles"
        class="pa-0"
        lines="two"
        density="comfortable"
        select-strategy="leaf"
      >
        <!-- TODO Restore these once we can afford infra -->
        <div class="position-relative">
          <v-list-item
            class="px-4"
            value="autoCheck (TODO: Remove)"
            :disabled="true"
          >
            <v-list-item-title class="d-flex mb-1 gc-2">
              Automatically analyze images

              <v-tooltip location="top center">
                <template #activator="{ props }">
                  <v-icon
                    v-bind="props"
                    :icon="mdiInformationOutline"
                    :color="PrimaryColorLight"
                  />
                </template>

                <StyleProvider>
                  Data used for image analysis is never stored. Requires a page
                  reload for changes to take effect.
                </StyleProvider>
              </v-tooltip>
            </v-list-item-title>

            <v-list-item-subtitle>
              Analyze images as you browse and display an icon on the image to
              indicate if its real or AI.
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
            :disabled="true /* !toggles.includes('autoCheck') */"
          >
            <v-list-item-title class="mb-1"> Icon position </v-list-item-title>
            <v-list-item-subtitle>Where to show the icon.</v-list-item-subtitle>

            <template #append>
              <v-list-item-action class="ml-3">
                <v-select
                  v-model="indicatorPosition"
                  variant="solo-filled"
                  density="compact"
                  min-width="155"
                  :items="[
                    {
                      title: 'Top left',
                      value: 'top-left',
                      props: { class: 'overflow-hidden' },
                    },
                    {
                      title: 'Top right',
                      value: 'top-right',
                      props: { class: 'overflow-hidden' },
                    },
                    {
                      title: 'Bottom left',
                      value: 'bottom-left',
                      props: { class: 'overflow-hidden' },
                    },
                    {
                      title: 'Bottom right',
                      value: 'bottom-right',
                      props: { class: 'overflow-hidden' },
                    },
                  ]"
                  hide-details
                  flat
                >
                </v-select>
              </v-list-item-action>
            </template>
          </v-list-item>

          <v-list-item
            class="pr-4 pl-8"
            value="autoCheckPrivate (TODO: Remove)"
            :disabled="true /* !toggles.includes('autoCheck') */"
          >
            <v-list-item-title class="d-flex mb-1 gc-2">
              Analyze private images

              <v-tooltip location="top center">
                <template #activator="{ props }">
                  <v-icon
                    v-bind="props"
                    :icon="mdiInformationOutline"
                    :color="PrimaryColorLight"
                  />
                </template>

                <StyleProvider>
                  Metadata (GPS, camera info, etc.) will not be used for image
                  analysis. May increase bandwidth usage.
                </StyleProvider>
              </v-tooltip>
            </v-list-item-title>

            <v-list-item-subtitle>
              Also analyze private images (not accessible by a link alone).
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

          <div
            class="position-absolute top-0 left-0 bottom-0 right-0 d-flex align-center justify-center"
          >
            <div
              class="position-absolute top-0 left-0 bottom-0 right-0 bg-surface-variant opacity-40"
            ></div>
            <v-menu
              location="bottom center"
              open-on-hover
              close-delay="100"
              :open-on-click="false"
            >
              <template #activator="{ props, isActive }">
                <v-icon
                  v-bind="props"
                  class="locked-icon"
                  :class="{ 'menu-open': isActive }"
                  :icon="mdiLockAlert"
                  color="surface"
                />
              </template>

              <StyleProvider>
                <div class="bg-surface-variant rounded py-2 px-4">
                  <p>
                    <strong>
                      Automatic analysis is temporarily disabled, but images can
                      still be individually checked using the right-click menu.
                    </strong>
                  </p>
                  <br />
                  <p>
                    Unfortunately, automatic analysis requires significantly
                    more infrastructure than manual checks.
                  </p>
                  <br />
                  <p>
                    Currently, we cannot afford to cover the cost of this
                    infrastructure on our own (roughly $300 per month).
                  </p>
                  <br />
                  <p>
                    But, all donations made through
                    <a
                      href="https://patreon.com/ai_image_detector"
                      target="_blank"
                      title="Patreon"
                      :style="{ color: PrimaryColorDark }"
                      >Patreon</a
                    >
                    or
                    <a
                      href="https://ko-fi.com/ai_image_detector"
                      target="_blank"
                      title="Ko-fi"
                      :style="{ color: PrimaryColorDark }"
                      >Ko-fi</a
                    >
                    will first go to funding better infrastructure and
                    re-enabling this feature.
                  </p>
                  <br />
                  <p>Thank you for your understanding and continued support!</p>
                </div>
              </StyleProvider>
            </v-menu>
          </div>
        </div>

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

              <StyleProvider>
                Images are kept secure and private, they will only used to
                improve the detector.
              </StyleProvider>
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Upload image data, to help improve the detector, when reporting as
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

              <StyleProvider>
                Metadata (GPS, camera info, etc.) will be removed before
                uploading.
              </StyleProvider>
            </v-tooltip>
          </v-list-item-title>

          <v-list-item-subtitle>
            Also upload private images when reporting them.
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
          <v-list-item-title class="mb-1">
            Disable for this site
          </v-list-item-title>

          <v-list-item-subtitle opacity="1">
            <span class="text-medium-emphasis">
              Disable automatic image analysis for just this site:
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
.settings-icon {
  height: 38px;
  width: 38px;
}

.locked-icon {
  height: 50%;
  width: auto;

  transition: transform 0.3s;
  transform-origin: center;

  &:hover,
  &:focus,
  &.menu-open {
    transform: scale(1.1);
  }
}
</style>
