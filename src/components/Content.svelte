<script lang="ts">
	import type { Stac, StacCollection } from '$lib/types';
	import { map } from '../stores';
	import { onMount } from 'svelte';
	import colormaps from '$lib/colormaps';

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

	const getStacList = async () => {
		const res = await fetch('./stac.json');
		const json = await res.json();
		return json;
	};

	$: selectedStacUrl, getStacCollection();
	const getStacCollection = async () => {
		if (!selectedStacUrl) return;
		// const url = selectedStacUrl
		const url = './collections.json'; // use downloaded collection instead of requesting from API
		const res = await fetch(url);
		const collection = await res.json();
		stacCollection = collection.collections;
		console.log(stacCollection);
	};

	const handleCollectionClick = async (collection: StacCollection) => {
		if (Object.keys(targetedCollections).length > 0) {
			Object.keys(targetedCollections).forEach((key) => {
				removeStacLayer(key);
			});
		}
		targetedCollections[collection.id] = collection;
		await renderCollectionLayers(collection);
	};

	const renderCollectionLayers = async (collection: StacCollection) => {
		const key = collection.id;

		const url = `${baseUrl.replace('stac', 'data')}mosaic/register`;
		const payload = {
			collections: [key],
			bbox: collection.extent.spatial.bbox[0],
			metadata: {
				type: 'mosaic',
				assets: Object.keys(collection.item_assets)
			}
		};
		console.log(url, JSON.stringify(payload));
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			return;
		}
		const json = await res.json();
		const layerId = key;
		const tilejson = json.links.find(
			(link: { rel: string; type: string; href: string }) => link.rel === 'tilejson'
		);
		console.log(tilejson);
		if (!tilejson) return;
		removeStacLayer(layerId);
		let colormap = 'viridis';
		const matchedColors = colormaps.filter((color) => key.indexOf(color) > -1);
		if (matchedColors.length > 0) {
			colormap = matchedColors[0];
		}
		colormap = `&colormap_name=${colormap}`;
		$map.addSource(layerId, {
			url: `${tilejson.href}?assets=${payload.metadata.assets[0]}&collection=${key}${colormap}`,
			type: 'raster',
			minzoom: 5,
			bounds: [payload.bbox[0], payload.bbox[1], payload.bbox[2], payload.bbox[3]]
		});
		$map.addLayer({
			id: layerId,
			type: 'raster',
			source: layerId
		});
		// $map.fitBounds([
		// 	[payload.bbox[0], payload.bbox[1]],
		// 	[payload.bbox[2], payload.bbox[3]]
		// ]);
	};

	const removeStacLayer = (id: string) => {
		if ($map.getLayer(id)) $map.removeLayer(id);
		if ($map.getSource(id)) $map.removeSource(id);
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
