<script>
  import favicon from "$lib/assets/LayrIcon.svg";
  import { themeStore } from "$lib/themeStore.svelte.js";
  import { onMount } from "svelte";
  import "../app.css";

  let { children } = $props();

  onMount(() => {
    themeStore.loadPreference();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
