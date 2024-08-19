<script setup>
import SettingsSvg from '@/assets/settings.svg';
import { PrimaryColor } from '@/utilities/color.js';
import { mdiInformationOutline } from '@mdi/js';
</script>

<template>
  <v-card min-width="450">
    <v-card-item>
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Settings</v-card-subtitle>
      <template #append>
        <settings-svg class="icon" />
      </template>
    </v-card-item>
    <v-card-text class="pa-0">
      <v-list lines="two" class="pa-0 overflow-visible">
        <v-list-item class="px-4" value="auto-check">
          <v-list-item-title>Automatically check images</v-list-item-title>

          <v-list-item-subtitle>
            Will check images as you browse and display an icon to indicate if
            its real or AI.

            <div class="d-flex text-caption mt-1 gc-2">
              <v-icon :icon="mdiInformationOutline"></v-icon>
              Image data is not stored when analyzing them.
            </div>
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
