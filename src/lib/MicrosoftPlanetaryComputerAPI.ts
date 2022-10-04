import type { StacCollection } from '$lib/types';

export interface CqlArg {
	op: string;
	args: { [key: string]: string } | string | number | CqlArg;
}

export interface MosaicInfo {
	name: string;
	description: string;
	cql: CqlArg[];
}

class MicrosoftPlanetaryComputerAPI {
	BASE_API = 'https://planetarycomputer.microsoft.com/api';

	mapMosaicInfo: { [key: string]: MosaicInfo[] } = {};

	async getCollection() {
		// const url = `${this.BASE_API}/stac/v1/collections`
		const url = `./collections.json`;
		const res = await fetch(url);
		const collection = await res.json();
		const stacCollection: StacCollection[] = collection.collections;
		return stacCollection;
	}

	async getMosaicInfo(collectionId: string) {
		if (this.mapMosaicInfo[collectionId]) {
			return this.mapMosaicInfo[collectionId];
		} else {
			const url = `${this.BASE_API}/data/v1/mosaic/info?collection=${collectionId}`;
			const res = await fetch(url);
			const json = await res.json();
			const mosaics: MosaicInfo[] = json.mosaics;
			this.mapMosaicInfo[collectionId] = mosaics;
			return mosaics;
		}
	}

	async registerMosaic(collectionId: string, cql?: CqlArg[]) {
		const url = `${this.BASE_API}/data/v1/mosaic/register`;
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
							collectionId
						]
					}
				]
			}
		};
		if (cql && cql.length > 0) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			payload.filter.args = [...payload.filter.args, ...cql];
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
		const tilejson: { rel: string; type: string; href: string } = json.links.find(
			(link: { rel: string; type: string; href: string }) => link.rel === 'tilejson'
		);
		return tilejson;
	}
}

export default MicrosoftPlanetaryComputerAPI;
