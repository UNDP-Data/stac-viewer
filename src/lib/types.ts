export interface Stac {
	description: string;
	icon: string;
	id: string;
	label: string;
	path: string;
	published: boolean;
	selected: boolean;
	tags: string[];
	type: string;
	url: string;
}

// https://planetarycomputer.microsoft.com/api/stac/v1/collections
export interface StacCollection {
	id: string;
	type: string;
	links: {
		rel: string;
		type: string;
		href: string;
	}[];
	title: string;
	assets: {
		[key: string]: {
			href: string;
			type: string;
			roles: string[];
			title: string;
		};
	};
	extent: {
		spatial: {
			bbox: number[][];
		};
		temporal: {
			interval: string[][];
		};
	};
	license: string;
	'sci:doi': string;
	keywords: string;
	providers: {
		url: string;
		name: string;
		roles: string[];
	}[];
	description: string;
	stac_version: string;
	// skipped other properties
}
