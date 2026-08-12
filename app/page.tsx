import { Suspense } from "react";
import ProjectList from "@/components/ProjectList";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ProjectList />
    </Suspense>
  );
}
