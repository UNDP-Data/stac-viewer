import type { Stac, StacCollection } from '$lib/types';

class StacAPI {
	stac: Stac;
	constructor(stac: Stac) {
		this.stac = stac;
	}

	async getCollection() {
		const url = `${this.stac.url}/collections`;
		const res = await fetch(url);
		const collection = await res.json();
		const stacCollection: StacCollection[] = collection.collections;
		return stacCollection;
	}

	async getItems(collection: StacCollection, bbox: number[]) {
		if (!collection) return;

		const url = `${this.stac.url}/search`;
		const payload = {
			collections: [collection.id],
			limit: 10,
			bbox: bbox
		};
		console.log(payload);
		const res = await fetch(url, {
			method: 'POST',
			mode: 'no-cors',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		const geojson = await res.json();
		console.log(geojson);
		return geojson;
	}
}

export default StacAPI;
