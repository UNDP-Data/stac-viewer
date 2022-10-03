<script lang="ts">
	import type { Stac, StacCollection } from '$lib/types';
	import { map } from '../stores';
	import { onMount } from 'svelte';
	import colormaps from '$lib/colormaps';
	import AutoComplete from 'simple-svelte-autocomplete';

	let stacList: Stac[];
	let baseUrl = '';
	let selectedStacUrl = '';
	let stacCollection: StacCollection[];
	let selectedCollection: StacCollection;
	let targetedCollections: { [key: string]: StacCollection } = {};
	let selectedColormap = '';

	let assetsList: string[] = [];
	let selectedAsset = '';

	let selectedCloudCover: number;
	let cloudCoverOptions = [
		{ title: `Most recent (no cloud)`, value: 0 },
		{ title: `Most recent (low cloud)`, value: 5 },
		{ title: `Most recent (any cloud cover)`, value: 10 },
		{ title: `Don't filter by cloud cover`, value: -1 }
	];

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
		const url = selectedStacUrl;
		// const url = './collections.json'; // use downloaded collection instead of requesting from API
		const res = await fetch(url);
		const collection = await res.json();
		stacCollection = collection.collections;
		baseUrl = selectedStacUrl.replace('collections', '');
		console.log(stacCollection);
	};

	$: selectedCollection, handleCollectionSelected();
	$: selectedColormap, handleCollectionSelected();
	$: selectedAsset, handleCollectionSelected();
	$: selectedCloudCover, handleCollectionSelected();

	const handleCollectionSelected = async () => {
		if (Object.keys(targetedCollections).length > 0) {
			Object.keys(targetedCollections).forEach((key) => {
				removeStacLayer(key);
			});
		}
		if (!selectedCollection) return;
		targetedCollections[selectedCollection.id] = selectedCollection;
		await renderCollectionLayers();
	};

	const renderCollectionLayers = async () => {
		const key = selectedCollection.id;
		console.log(selectedCollection);
		const url = `${baseUrl.replace('stac', 'data')}mosaic/register`;
		const payload = {
			'filter-lang': 'cql2-json',
			filter: {
				op: 'and',
				args: [
					{
						op: '=',
						args: [
							{
								property: 'collection'
							},
							key
						]
					}
				]
			}
		};
		if (selectedCloudCover > -1) {
			payload.filter.args.push({
				op: '<=',
				args: [
					{
						property: 'eo:cloud_cover'
					},
					selectedCloudCover.toString()
				]
			});
		}
		if (selectedCollection.item_assets) {
			assetsList = Object.keys(selectedCollection.item_assets);
		}
		console.log(url, JSON.stringify(payload));
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				accept: 'application/json',
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
		// let colormap = selectedColormap;
		const matchedColors = colormaps.filter((color) => key.indexOf(color) > -1);
		if (matchedColors.length > 0) {
			selectedColormap = matchedColors[0];
		}
		const colormap = selectedColormap ? `&colormap_name=${selectedColormap}` : '';

		if (!assetsList.includes(selectedAsset)) {
			selectedAsset = '';
		}
		if (!selectedAsset && assetsList.length > 0) {
			switch (selectedCollection.id) {
				case 'sentinel-2-l2a':
					selectedAsset = 'visual';
					break;
				default:
					selectedAsset = assetsList[0];
					break;
			}
		}
		if (!selectedAsset) {
			selectedAsset = 'data';
		}
		const assets = `assets=${selectedAsset}`;

		$map.addSource(layerId, {
			url: `${tilejson.href}?${assets}&collection=${key}${colormap}`,
			type: 'raster',
			minzoom: 5
			// bounds: [payload.bbox[0], payload.bbox[1], payload.bbox[2], payload.bbox[3]]
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
			<div class="panel-block">
				<p class="control has-icons-left">
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
			{#if assetsList && assetsList.length > 0}
				<div class="panel-block">
					<p class="control has-icons-left">
						<AutoComplete
							items={assetsList}
							bind:selectedItem={selectedAsset}
							placeholder="Choose a assets"
						/>
						<span class="icon is-left">
							<i class="fas fa-search" aria-hidden="true" />
						</span>
					</p>
				</div>
			{/if}
			{#if selectedCollection}
				<div class="panel-block">
					<p class="control has-icons-left" />
					<div class="select">
						<select bind:value={selectedCloudCover}>
							{#each cloudCoverOptions as option}
								<option value={option.value}>{option.title}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="panel-block">
					<p class="control has-icons-left">
						<AutoComplete
							items={colormaps}
							bind:selectedItem={selectedColormap}
							placeholder="Choose a colormap"
						/>
						<span class="icon is-left">
							<i class="fas fa-search" aria-hidden="true" />
						</span>
					</p>
				</div>
			{/if}
		{/if}
	</nav>
</div>

<style lang="scss">
	.stac-container {
		background-color: rgba(255, 255, 255, 0.8);
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
	}

	:global(.autocomplete-input) {
		background-color: #fff;
		border-radius: 10px;
		border: 1px solid #ccc;
		box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.1);
		color: #4a4a4a;
		font-family: ProximaNova, sans-serif;
		font-size: 11px;
		height: 40px !important;
	}

	:global(.autocomplete-list) {
		top: 5px !important;
		background-color: #fff;
		border-radius: 10px;
		border: 1px solid #ccc;
		box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.1);
	}
</style>
