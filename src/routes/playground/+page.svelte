<script>
	import GridBuilder from "$lib/components/GridBuilder.svelte";
</script>

<svelte:head>
	<title>Layr</title>
	<meta
		name="description"
		content="A premium drag-and-drop Layr built with Svelte 5 and Tailwind CSS."
	/>
</svelte:head>

<main class="min-h-screen bg-[var(--app-bg)]">
	<GridBuilder />
</main>
