<script setup>
import SettingsSvg from '@/assets/settings.svg';
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Settings</v-card-subtitle>
      <template #append>
        <settings-svg class="icon" />
      </template>
    </v-card-item>
    <v-card-text>
      <v-list lines="three">
        <v-list-group value="auto-check">
          <template #activator="{ props }">
            <v-list-item class="px-0" >
              <v-list-item-title>Automatically check images</v-list-item-title>

              <v-list-item-subtitle>
                Will check images as you browse and display an icon to indicate
                if its real or AI.
              </v-list-item-subtitle>

              <template #append="{ isActive }">
                <v-list-item-action>
                  <v-switch v-bind="props" :model-value="isActive" inset  />
                </v-list-item-action>
              </template>
            </v-list-item>
          </template>
        </v-list-group>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  aspect-ratio: 1 / 1;
  width: 38px;
}
</style>
