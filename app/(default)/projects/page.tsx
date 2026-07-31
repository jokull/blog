import type { Metadata } from "@/src/lib/metadata";

export const metadata: Metadata = {
	title: "Projects — Jökull Sólberg",
	description: "Things I've built — mostly for Iceland.",
	alternates: {
		canonical: "/projects",
	},
};

type Project = {
	name: string;
	description: string;
	href: string;
	repo?: string;
};

const icelandProjects: Project[] = [
	{
		name: "planitor.io",
		description:
			"Business intelligence for people working in Iceland's planning, property, transport and construction sectors.",
		href: "https://www.planitor.io",
		repo: "https://github.com/planitor/planitor",
	},
	{
		name: "Lyklaborð",
		description:
			"A privacy-first Icelandic iOS keyboard with BÍN-powered autocorrect and on-device learning.",
		href: "https://lyklabord.solberg.is",
		repo: "https://github.com/jokull/LyklabordApp",
	},
	{
		name: "orflaedi.is",
		description: "Finder for used and new car parts in Iceland.",
		href: "https://www.orflaedi.is",
		repo: "https://github.com/jokull/orflaedi",
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

function ProjectItem({ project }: { project: Project }) {
	return (
		<li className="flex flex-col gap-1">
			<div className="flex items-baseline gap-2">
				<a
					href={project.href}
					target="_blank"
					rel="noopener"
					className="font-medium text-blue-500 hover:text-blue-600"
				>
					{project.name}
				</a>
				{project.repo ? (
					<a
						href={project.repo}
						target="_blank"
						rel="noopener"
						className="text-stone-400 text-xs hover:text-stone-600"
					>
						source
					</a>
				) : null}
			</div>
			<p className="text-sm text-stone-600">{project.description}</p>
		</li>
	);
}

export default function ProjectsPage() {
	return (
		<div className="max-w-xl">
			<h1 className="mb-8 font-medium text-lg">Projects</h1>

			<div className="flex flex-col gap-10">
				<section>
					<h2 className="mb-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
						Iceland
					</h2>
					<ul className="flex flex-col gap-5">
						{icelandProjects.map((project) => (
							<ProjectItem key={project.name} project={project} />
						))}
					</ul>
				</section>

				<section>
					<h2 className="mb-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
						Other
					</h2>
					<ul className="flex flex-col gap-5">
						{otherProjects.map((project) => (
							<ProjectItem key={project.name} project={project} />
						))}
					</ul>
				</section>
			</div>
		</div>
	);
}
