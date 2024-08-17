<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@fontsource/roboto/scss/mixins' as Roboto;
@include Roboto.faces(
  $directory: '@fontsource/roboto/files',
  $weights: all,
  $styles: all
);

:deep() {
  $color-pack: false;
  $layers: true;
  @import 'vuetify';

  & > * {
    @extend :root;
  }
}
</style>
