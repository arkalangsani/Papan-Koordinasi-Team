import Board from "@/components/Board";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  return <Board projectSlug={params.slug} />;
}
