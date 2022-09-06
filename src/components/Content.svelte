<script lang="ts">
	import type { Stac, StacCollection } from '$lib/types';
	import { map } from '../stores';
	import { onMount } from 'svelte';
	import type { GeoJSONFeature } from 'maplibre-gl';
	let stacList: Stac[];
	let baseUrl = '';
	let selectedStacUrl = '';
	let stacCollection: StacCollection[];

	let targetedCollections: { [key: string]: StacCollection } = {};

	onMount(async () => {
		stacList = await getStacList();
		if (stacList.length > 0) {
			selectedStacUrl = stacList[0].url;
			baseUrl = selectedStacUrl.replace('collections', '');
		}
	});

	$: if ($map) {
		$map.on('moveend', async () => {
			await renderCollectionLayers();
		});
	}

	const getStacList = async () => {
		const res = await fetch('./stac.json');
		const json = await res.json();
		return json;
	};

	$: selectedStacUrl, getStacCollection();
	const getStacCollection = async () => {
		if (!selectedStacUrl) return;
		const res = await fetch(selectedStacUrl);
		const collection = await res.json();
		stacCollection = collection.collections;
	};

	const handleCollectionClick = async (collection: StacCollection) => {
		targetedCollections[collection.id] = collection;
		await renderCollectionLayers();
	};

	const renderCollectionLayers = async () => {
		const extent = $map.getBounds();

		const keys = Object.keys(targetedCollections);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const url = `${baseUrl}search?collections=${key}&bbox=${[
				extent.toArray().join(',')
			]}&sortby=id&limit=250`;

			const res = await fetch(url);
			const geojson = await res.json();
			const features: GeoJSONFeature[] = geojson.features;
			// console.log(features)
			features.forEach((feature) => {
				const layerId = feature.id;
				if (typeof layerId !== 'string') return;
				// eslint-disable-next-line
				// @ts-ignore
				const tilejson = feature.assets.tilejson;
				if (!tilejson) return;
				if ($map.getSource(layerId)) return;
				$map.addSource(layerId, {
					url: tilejson.href,
					type: 'raster',
					minzoom: 5
				});
				if ($map.getLayer(layerId)) return;
				$map.addLayer({
					id: layerId,
					type: 'raster',
					source: layerId
				});
			});
		}
		$map.redraw();
	};
</script>

<div class="stac-container">
	<nav class="panel">
		<p class="panel-heading">Stac</p>
		<div class="panel-block">
			<p class="control">
				{#if stacList && stacList.length > 0}
					<div class="select">
						<select bind:value={selectedStacUrl}>
							{#each stacList as stac}
								<option value={stac.url}>{stac.label}</option>
							{/each}
						</select>
					</div>
				{/if}
			</p>
		</div>

		{#if stacCollection && stacCollection.length > 0}
			<div class="collection-container">
				{#each stacCollection as collection}
					<!-- svelte-ignore a11y-missing-attribute -->
					<a class="panel-block">
						<span
							class="panel-icon"
							on:click={() => {
								handleCollectionClick(collection);
							}}
						>
							<i class="fas fa-plus" aria-hidden="true" />
						</span>
						{collection.title}
					</a>
				{/each}
			</div>
		{/if}
	</nav>
</div>

<style lang="scss">
	$height: calc(100vh - 64px);

	.stac-container {
		background-color: rgba(255, 255, 255, 0.5);
		border: 1px solid #ccc;
		color: rgba(74, 74, 74);
		font-family: ProximaNova, sans-serif;
		font-size: 11px;
		left: 10px;
		padding: 10px;
		position: absolute;
		top: 10px;
		z-index: 10;
		width: 300px;
		height: $height;
	}

	.collection-container {
		overflow-y: auto;
		height: calc($height - 150px);
	}
</style>
