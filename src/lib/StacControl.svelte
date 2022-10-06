<script lang="ts">
	import { onMount } from 'svelte';
	import AutoComplete from 'simple-svelte-autocomplete';
	import type { Stac, StacCollection, StacItemFeatureCollection } from '$lib/types';
	import StacAPI from './StacAPI';
	import type { Map } from 'maplibre-gl';

	export let map: Map;

	const TITILER_ENDPOINT = 'https://titiler.undpgeohub.org';
	const COG_MIME_TYPE = 'image/tiff; application=geotiff; profile=cloud-optimized';

	let stacApi: StacAPI | undefined;
	let stacList: Stac[];
	let selectedStac: Stac;
	let selectedCollection: StacCollection | undefined;
	let stacCollection: StacCollection[];
	let stacItems: StacItemFeatureCollection | undefined;

	let selectedAsset: string;
	let assets: string[] = [];
	let MSToken: { [key: string]: string } = {};

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
		if (stacItems && stacItems.features.length > 0) {
			removeLayer(stacItems?.features[0].collection);
			stacItems = undefined;
		}
		selectedCollection = undefined;
	};

	const getStacItems = async () => {
		if (!(stacApi && selectedCollection)) return;

		await getMsStacToken();

		const bounds = map.getBounds();
		const geojson = await stacApi.searchItems(selectedCollection, bounds);
		stacItems = geojson;
		if (stacItems && stacItems.features.length > 0) {
			const allAssets = Object.keys(stacItems.features[0].assets).filter((key) => {
				if (stacItems?.features[0].assets[key].type === COG_MIME_TYPE) {
					return true;
				}
			});
			if (assets.toString() !== allAssets.toString()) {
				assets = allAssets;
			}
		}
		updateLayer();
	};

	const getMsStacToken = async () => {
		if (!selectedCollection) return;
		if (MSToken[selectedCollection.id]) {
			return MSToken[selectedCollection.id];
		}
		const url = `${selectedStac.url.replace('stac/v1', '')}/sas/v1/token/${selectedCollection.id}`;
		const res = await fetch(url);
		const json = await res.json();
		const token = json.token;
		MSToken[selectedCollection.id] = token;
		return token;
	};

	const updateLayer = () => {
		const itemLayerId = 'stac-items';
		removeLayer(itemLayerId);
		map.addSource(itemLayerId, {
			type: 'geojson',
			data: stacItems
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

	const getPreviousNextStacItems = async (type: 'next' | 'previous') => {
		if (!stacItems) return;
		stacItems = await stacApi?.getPreviousNextStacItems(stacItems, type);
		updateLayer();
	};

	const removeLayer = (id: string) => {
		if (!id) return;
		if (map.getLayer(id)) map.removeLayer(id);
		if (map.getSource(id)) map.removeSource(id);
	};

	$: selectedAsset, createMosaicRasterTile();

	const createMosaicRasterTile = async () => {
		const mosaicJson = await createMosaiJSON();
		if (!mosaicJson) return;
		const mosaicTileJson = await createMosaicTileJson(mosaicJson);

		const layerId = 'mosaicjson';
		removeLayer(layerId);
		map.addSource(layerId, {
			type: 'raster',
			url: mosaicTileJson
		});
		map.addLayer({
			id: layerId,
			type: 'raster',
			source: layerId,
			minzoom: 0,
			maxzoom: 22
		});
	};

	const createMosaiJSON = async () => {
		if (!selectedAsset) return;
		const urls: string[] = [];
		stacItems?.features.forEach((f) => {
			const url = f.assets[selectedAsset].href;
			if (selectedCollection && selectedStac.id === 'msft') {
				urls.push(`${url}?${MSToken[selectedCollection.id]}`);
			} else {
				urls.push(`${url}`);
			}
		});

		const url = `${TITILER_ENDPOINT}/mosaicjson/create?${urls
			.map((url, index) => `${index > 0 ? '&' : ''}url=${getBase64EncodedUrl(url)}`)
			.join('')}`;
		console.log(url);
		return url;
	};

	const createMosaicTileJson = async (mosaicJsonurl: string) => {
		const rio_formula = 'gamma G 1.85 gamma B 1.95 sigmoidal RGB 35 0.13 saturation 1.15';
		const url = `${TITILER_ENDPOINT}/mosaicjson/tilejson.json?tile_scale=1&TileMatrixSetId=WebMercatorQuad&url=${encodeURIComponent(
			mosaicJsonurl
		)}&resampling=nearest&color_formula=${encodeURIComponent(rio_formula)}`;
		console.log(url);
		return url;
	};

	const getBase64EncodedUrl = (url: string) => {
		const [base, sign] = url.split('?');
		return `${base}?${btoa(sign)}`;
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

{#if stacItems && stacItems.features.length > 0}
	{#if Object.keys(assets).length > 0}
		<div class="panel-block">
			<div class="select is-fullwidth">
				<select bind:value={selectedAsset}>
					<option value={undefined} />
					{#each assets as asset}
						<option value={asset}>{asset}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}
	<p class="panel-heading m-0 pt-1 pb-1">
		{#if stacItems.links.find((link) => link.rel === 'previous')}
			<button
				class="button is-small"
				on:click={() => {
					getPreviousNextStacItems('previous');
				}}>Previous</button
			>
		{/if}
		{#if stacItems.links.find((link) => link.rel === 'next')}
			<button
				class="button is-small"
				on:click={() => {
					getPreviousNextStacItems('next');
				}}>Next</button
			>
		{/if}
	</p>
	<div class="item-contents">
		{#each stacItems.features as item}
			<div class="panel-block">
				<div class="card m-0">
					<div class="card-content m-0 p-0">
						<div class="media">
							<div class="media-left">
								<figure class="image is-64x64">
									<img src={item.assets['rendered_preview'].href} alt="Placeholder image" />
								</figure>
							</div>
							<div class="media-content">
								<p class="subtitle is-6 m-0 p-0">{item.id}</p>
								<p class="subtitle is-6 m-0 p-0">EPSG:{item.properties['proj:epsg']}</p>
								<time class="subtitle is-6 m-0 p-0" datetime="2016-1-1"
									>{item.properties['datetime']}</time
								>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style lang="scss">
	.item-contents {
		height: 300px;
		overflow-y: auto;
	}
</style>
