import { featuredProjects } from "@/lib/projects";
import { Link } from "@/src/lib/navigation";

export function SelectedProjects() {
	return (
		<section>
			<div className="mb-4 flex items-baseline justify-between">
				<h2 className="font-bold text-black/55 text-sm">projects</h2>
				<Link href="/projects" className="text-blue-500 hover:text-blue-600 text-sm">
					all →
				</Link>
			</div>
			<ul className="flex flex-col gap-4">
				{featuredProjects.map((project) => (
					<li key={project.name} className="flex flex-col gap-0.5">
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
				))}
			</ul>
		</section>
	);
}
