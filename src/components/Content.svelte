<script lang="ts">
	import { map } from '../stores';
	import MicrosoftMosaicControl from '$lib/MicrosoftMosaicControl.svelte';
	import StacControl from '$lib/StacControl.svelte';

	const tabs = [
		{ title: 'Microsoft Mosaic', id: 'msmosaic' },
		{ title: 'STAC', id: 'stac' }
	];
	let selectedTab: string = tabs[tabs.length - 1].id;
</script>

<div class="stac-container">
	<nav class="panel">
		<p class="panel-heading">Stac</p>
		<div class="panel-block">
			<div class="tabs">
				<ul>
					{#each tabs as tab}
						<li
							class={`${selectedTab === tab.id ? 'is-active' : ''}`}
							on:click={() => {
								selectedTab = tab.id;
							}}
						>
							<a>{tab.title}</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		{#if selectedTab === 'msmosaic'}
			<MicrosoftMosaicControl bind:map={$map} />
		{:else}
			<StacControl bind:map={$map} />
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
