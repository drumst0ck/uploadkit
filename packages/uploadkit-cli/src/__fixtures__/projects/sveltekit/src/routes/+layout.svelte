<script lang="ts">
  // Fixture layout — init should NOT modify .svelte files.
  let { children } = $props();
</script>

{@render children()}
