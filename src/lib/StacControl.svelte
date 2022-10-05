<script lang="ts">
	import { onMount } from 'svelte';
	import AutoComplete from 'simple-svelte-autocomplete';
	import type { Stac, StacCollection } from '$lib/types';
	import StacAPI from './StacAPI';
	import type { Map } from 'maplibre-gl';

	export let map: Map;

	let stacApi: StacAPI | undefined;
	let stacList: Stac[];
	let selectedStac: Stac;
	let selectedCollection: StacCollection;
	let stacCollection: StacCollection[];

	onMount(async () => {
		stacList = await getStacList();
		if (stacList.length > 0) {
			selectedStac = stacList[0];
		}

		map.on('moveend', async () => {
			await getStacItems();
		});
	});

	$: selectedStac, getStacCollection();
	$: selectedCollection, getStacItems();

	const getStacList = async () => {
		const res = await fetch('./stac.json');
		const json = await res.json();
		return json;
	};

	const getStacCollection = async () => {
		if (!selectedStac) {
			stacApi = undefined;
			return;
		}
		stacApi = new StacAPI(selectedStac);
		stacCollection = await stacApi.getCollection();
	};

	const getStacItems = async () => {
		if (!(stacApi && selectedCollection)) return;
		const bounds = map.getBounds();
		const geojson = await stacApi.searchItems(selectedCollection, bounds);

		const itemLayerId = 'stac-items';
		removeLayer(itemLayerId);
		map.addSource(itemLayerId, {
			type: 'geojson',
			data: geojson
		});
		map.addLayer({
			id: itemLayerId,
			type: 'fill',
			source: itemLayerId,
			layout: {},
			paint: {
				'fill-color': 'rgba(255,255,255,0)',
				'fill-opacity': 0.4,
				'fill-outline-color': 'rgba(255,0,0,1)'
			}
		});
	};

	const removeLayer = (id: string) => {
		if (!id) return;
		if (map.getLayer(id)) map.removeLayer(id);
		if (map.getSource(id)) map.removeSource(id);
	};
</script>

<div class="panel-block">
	<p class="control">
		{#if stacList && stacList.length > 0}
			<div class="select">
				<select bind:value={selectedStac}>
					{#each stacList as stac}
						<option value={stac}>{stac.label}</option>
					{/each}
				</select>
			</div>
		{/if}
	</p>
</div>

{#if stacCollection}
	<div class="panel-block">
		<p class="control has-icons-left">
			<!-- svelte-ignore missing-declaration -->
			<AutoComplete
				items={stacCollection}
				bind:selectedItem={selectedCollection}
				placeholder="Choose a collection"
				labelFieldName="title"
				labelFunction={(properties) => (properties.title ? properties.title : properties.id)}
			/>
			<span class="icon is-left">
				<i class="fas fa-search" aria-hidden="true" />
			</span>
		</p>
	</div>
{/if}

<style lang="scss">
</style>
