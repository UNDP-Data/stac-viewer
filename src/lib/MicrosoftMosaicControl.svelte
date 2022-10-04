<script lang="ts">
	import { onMount } from 'svelte';
	import AutoComplete from 'simple-svelte-autocomplete';
	import MicrosoftPlanetaryComputerAPI from '$lib/MicrosoftPlanetaryComputerAPI';
	import type { CqlArg, MosaicInfo } from '$lib/MicrosoftPlanetaryComputerAPI';
	import type { StacCollection } from './types';
	import colormaps from '$lib/colormaps';
	import type { Map } from 'maplibre-gl';

	export let map: Map;

	let currentCollectionId: string;

	let msApi: MicrosoftPlanetaryComputerAPI;
	let selectedCollection: StacCollection;
	let stacCollection: StacCollection[];

	let selectedFilter: MosaicInfo;
	let collectionFilters: MosaicInfo[] = [];

	let selectedAsset = '';
	let assetsList: string[] = [];

	let selectedColormap = '';

	let tileJSON: { rel: string; type: string; href: string } | undefined;

	onMount(async () => {
		msApi = new MicrosoftPlanetaryComputerAPI();
		await getStacCollection();
	});

	$: selectedCollection, getAssets();
	$: selectedCollection, getColormap();
	$: selectedCollection, getCollectionFilter();
	$: selectedCollection, getTileJSON();
	$: selectedAsset, getTileJSON();
	$: selectedColormap, getTileJSON();
	$: selectedFilter, getTileJSON();
	$: tileJSON, createRaterLayer();

	const createRaterLayer = () => {
		const options: { [key: string]: string } = {};
		if (selectedCollection) {
			options.collection = selectedCollection.id;
		}
		if (selectedAsset) {
			options.assets = selectedAsset;
		}
		if (selectedColormap) {
			options.colormap_name = selectedColormap;
		}
		if (!tileJSON) return;
		const url = `${tileJSON.href}?${Object.keys(options)
			.map((key: string) => `${key}=${options[key]}`)
			.join('&')}`;

		removeRasterLayer(currentCollectionId);

		currentCollectionId = selectedCollection.id;
		removeRasterLayer(currentCollectionId);
		map.addSource(currentCollectionId, {
			url: url,
			type: 'raster',
			minzoom: 5
		});
		map.addLayer({
			id: currentCollectionId,
			type: 'raster',
			source: currentCollectionId
		});
	};

	const removeRasterLayer = (id: string) => {
		if (!id) return;
		if (map.getLayer(id)) map.removeLayer(id);
		if (map.getSource(id)) map.removeSource(id);
	};

	const getTileJSON = async () => {
		if (!selectedCollection) return;
		let cql: CqlArg[] | undefined = undefined;
		if (selectedFilter && selectedFilter.cql) {
			cql = selectedFilter.cql;
		}
		tileJSON = await msApi.registerMosaic(selectedCollection.id, cql);
	};

	const getStacCollection = async () => {
		if (!msApi) return;
		stacCollection = await msApi.getCollection();
	};

	const getCollectionFilter = async () => {
		if (!msApi) return;
		if (!selectedCollection) return;
		collectionFilters = await msApi.getMosaicInfo(selectedCollection.id);
		if (collectionFilters.length > 0) {
			selectedFilter = collectionFilters[0];
		}
	};

	const getAssets = () => {
		if (!selectedCollection) return;

		if (selectedCollection.item_assets) {
			assetsList = Object.keys(selectedCollection.item_assets);

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
		}
	};

	const getColormap = () => {
		if (!selectedCollection) return;
		const matchedColors = colormaps.filter((color) => selectedCollection.id.indexOf(color) > -1);
		if (matchedColors.length > 0) {
			switch (selectedCollection.id) {
				case 'alos-dem':
					selectedColormap = 'terrain';
					break;
				default:
					selectedColormap = matchedColors[0];
					break;
			}
		}
	};
</script>

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
{#if selectedCollection}
	{#if collectionFilters && collectionFilters.length > 0}
		<div class="panel-block">
			<div class="select is-fullwidth">
				<select bind:value={selectedFilter}>
					{#each collectionFilters as filter}
						<option value={filter}>{filter.name}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

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

<style lang="scss">
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
