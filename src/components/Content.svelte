<script lang="ts">
	import type { Stac, StacCollection } from 'src/lib/types';

	import { onMount } from 'svelte';
	let stacList: Stac[];
	let selectedStacUrl = '';
	let stacCollection: StacCollection[];
	onMount(async () => {
		stacList = await getStacList();
		if (stacList.length > 0) {
			selectedStacUrl = stacList[0].url;
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
		const res = await fetch(selectedStacUrl);
		const collection = await res.json();
		stacCollection = collection.collections;
		console.log(stacCollection);
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
						<span class="panel-icon">
							<i class="fas fa-book" aria-hidden="true" />
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
