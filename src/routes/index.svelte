<script lang="ts">
	import Content from '../components/Content.svelte';

	import Map from '../components/Map.svelte';

	const title = 'Sveltekit Maplibre boilerplate';
</script>

<sveltekit:head>
	<title>{title}</title>
</sveltekit:head>

<div>
	<Content />
	<Map />
</div>

<style>
	@import 'bulma/css/bulma.css';
	@import '@fortawesome/fontawesome-free/css/all.min.css';
</style>
