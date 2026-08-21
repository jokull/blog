import type { Metadata } from "@/src/lib/metadata";
import { projectGroups } from "@/lib/projects";
import type { Project } from "@/lib/projects";

export const metadata: Metadata = {
	title: "Projects — Jökull Sólberg",
	description: "Things I've built — mostly for Iceland.",
	alternates: {
		canonical: "/projects",
	},
};

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
				{projectGroups.map((group) => (
					<section key={group.label}>
						<h2 className="mb-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
							{group.label}
						</h2>
						<ul className="flex flex-col gap-5">
							{group.projects.map((project) => (
								<ProjectItem key={project.name} project={project} />
							))}
						</ul>
					</section>
				))}
			</div>
		</div>
	);
}
