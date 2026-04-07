<script>
import "../app.css";
import favicon from '$lib/assets/favicon.svg';
import { themeStore } from '$lib/themeStore.svelte.js';
import { onMount } from 'svelte';

let { children } = $props();

onMount(() => {
  themeStore.loadPreference();
});
</script>

<svelte:head>
	<link rel="icon" href="{favicon}" />
</svelte:head>

{@render children()}
