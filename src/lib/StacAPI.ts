import type { Stac, StacCollection, StacItemFeatureCollection } from '$lib/types';
import type { GeoJSONFeature, LngLatBounds } from 'maplibre-gl';

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

	async getItemProperties(collection: StacCollection) {
		const url = `${this.stac.url}/collections/${collection.id}/items?limit=1`;
		const res = await fetch(url);
		const fc: StacItemFeatureCollection = await res.json();
		return fc.features[0].properties;
	}

	async searchItems(collection: StacCollection, bounds: LngLatBounds) {
		if (!collection) return;

		const properties = await this.getItemProperties(collection);

		const url = `${this.stac.url}/search`;
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
							collection.id
						]
					},
					{
						op: 's_intersects',
						args: [
							{
								property: 'geometry'
							},
							{
								type: 'Polygon',
								coordinates: [
									[
										bounds.getSouthWest().toArray(),
										bounds.getSouthEast().toArray(),
										bounds.getNorthEast().toArray(),
										bounds.getNorthWest().toArray(),
										bounds.getSouthWest().toArray()
									]
								]
							}
						]
					}
				]
			},
			limit: 10,
			sortby: [
				{
					field: 'datetime',
					direction: 'asc'
				}
			]
		};

		if (properties['eo:cloud_cover']) {
			const CqlArg = {
				op: '<=',
				args: [
					{
						property: 'eo:cloud_cover'
					},
					10
				]
			};
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			payload.filter.args.push(CqlArg);
		}

		const res = await fetch(url, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			body: JSON.stringify(JSON.parse(JSON.stringify(payload)))
		});

		const geojson = await res.json();
		return geojson;
	}

	async getPreviousNextStacItems(stacItems: StacItemFeatureCollection, type: 'next' | 'previous') {
		if (!stacItems) return;
		const link = stacItems.links.find((link) => link.rel === type);
		if (!link) return;
		console.log(link);
		const res = await fetch(link.href, {
			method: link.method,
			headers: {
				accept: link.type,
				'content-type': link.type
			},
			body: JSON.stringify(link.body)
		});
		const geojson = await res.json();
		return geojson;
	}
}

export default StacAPI;
