<script lang="ts">
	import type { Stac } from '$lib/types';
	import { map } from '../stores';
	import { onMount } from 'svelte';
	import StacCollectionControl from '$lib/StacCollectionControl.svelte';

	let stacList: Stac[];
	let selectedStac: Stac;

	onMount(async () => {
		stacList = await getStacList();
		if (stacList.length > 0) {
			selectedStac = stacList[0];
		}
	});

	const getStacList = async () => {
		const res = await fetch('./stac.json');
		const json = await res.json();
		return json;
	};
</script>

<div class="stac-container">
	<nav class="panel">
		<p class="panel-heading">Stac</p>
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
		{#if selectedStac && selectedStac.id === 'msft'}
			<StacCollectionControl bind:map={$map} />
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
</style>
