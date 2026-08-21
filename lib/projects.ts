export type Project = {
	name: string;
	description: string;
	href: string;
	repo?: string;
	/** Shown in the homepage's projects block. */
	featured?: boolean;
};

const icelandProjects: Project[] = [
	{
		name: "planitor.io",
		description:
			"Business intelligence for people working in Iceland's planning, property, transport and construction sectors.",
		href: "https://www.planitor.io",
		repo: "https://github.com/planitor/planitor",
		featured: true,
	},
	{
		name: "Lyklaborð",
		description:
			"A privacy-first Icelandic iOS keyboard with BÍN-powered autocorrect and on-device learning.",
		href: "https://lyklabord.solberg.is",
		repo: "https://github.com/jokull/LyklabordApp",
		featured: true,
	},
	{
		name: "orflaedi.is",
		description:
			"Icelandic e-bike listings in one place — find retailers and models, and compare prices.",
		href: "https://www.orflaedi.is",
		repo: "https://github.com/jokull/orflaedi",
		featured: true,
	},
	{
		name: "lemma-is",
		description: "Icelandic lemmatization for JavaScript.",
		href: "https://github.com/jokull/lemma-is",
		repo: "https://github.com/jokull/lemma-is",
	},
	{
		name: "icelandic-data",
		description: "A Claude Code–native data toolkit for Icelandic public datasets.",
		href: "https://github.com/jokull/icelandic-data",
		featured: true,
	},
	{
		name: "awesome-rvk.is",
		description:
			"A community-maintained guide to help newcomers have a successful start in Reykjavík.",
		href: "https://www.awesome-rvk.is",
		repo: "https://github.com/jokull/awesome-reykjavik",
	},
	{
		name: "agencies.is",
		description: "Community-maintained list of Icelandic digital agencies.",
		href: "https://www.agencies.is",
		repo: "https://github.com/jokull/is-agencies",
	},
	{
		name: "RÚV Noise",
		description: "macOS menubar app that streams RÚV radio with a lo-fi FM effect.",
		href: "https://github.com/jokull/ruv-noise",
	},
	{
		name: "moona",
		description:
			"Command line for the Noona.is appointment marketplace — search, book, cancel.",
		href: "https://github.com/jokull/moona",
	},
];

const otherProjects: Project[] = [
	{
		name: "result-rpc",
		description:
			"Typed RPC for React, with one wire-safe error union from the server to the component that handles it.",
		href: "https://result-rpc.com",
		repo: "https://github.com/jokull/result-rpc",
		featured: true,
	},
	{
		name: "onwardpg",
		description:
			"A PostgreSQL schema-diff planner that generates the compatibility window around an application deployment.",
		href: "https://onwardpg.solberg.is",
		repo: "https://github.com/jokull/onwardpg",
	},
	{
		name: "procpane",
		description:
			"An agent-native process supervisor for Turborepo, with health-gated services, local HTTPS and queryable logs.",
		href: "https://github.com/jokull/procpane",
		repo: "https://github.com/jokull/procpane",
	},
	{
		name: "agent-cms",
		description:
			"Agent-first headless CMS on Cloudflare Workers. Schemas, content, and publishing driven by MCP.",
		href: "https://github.com/jokull/agent-cms",
	},
	{
		name: "Loftur",
		description:
			"A runtime website engine for AI agents over MCP — schema, content, code and design with no build step.",
		href: "https://loftur.app",
		repo: "https://github.com/jokull/loftur",
		featured: true,
	},
	{
		name: "UDL",
		description:
			"A single Go binary replacing Sonarr + Radarr + NZBGet for Usenet-based media automation.",
		href: "https://github.com/jokull/udl",
		repo: "https://github.com/jokull/udl",
	},
	{
		name: "gymrat.is",
		description: "The simplest and fastest way to track your weight lifting progress.",
		href: "https://www.gymrat.is",
		repo: "https://github.com/jokull/gymrat",
	},
];

/** Homepage block: the featured projects in their original group order. */
export const featuredProjects: Project[] = [
	...icelandProjects.filter((project) => project.featured),
	...otherProjects.filter((project) => project.featured),
];

export const projectGroups = [
	{ label: "Iceland", projects: icelandProjects },
	{ label: "Other", projects: otherProjects },
] as const;
