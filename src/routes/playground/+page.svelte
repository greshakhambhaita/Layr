<script>
	import GridBuilder from "$lib/components/GridBuilder.svelte";
</script>

<svelte:head>
	<title>Bento Grid Builder</title>
	<meta
		name="description"
		content="A premium drag-and-drop bento grid builder built with Svelte 5 and Tailwind CSS."
	/>
</svelte:head>

<main class="min-h-screen bg-[var(--app-bg)]">
	<GridBuilder />
</main>
