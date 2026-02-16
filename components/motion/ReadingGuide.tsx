"use client";

import { ReadingHUD } from "@/components/motion/ReadingHUD";

type ReadingGuideProps = {
  scopeId: string;
  itemSelector?: string;
};

export function ReadingGuide({ scopeId, itemSelector }: ReadingGuideProps) {
  return <ReadingHUD scopeId={scopeId} itemSelector={itemSelector} />;
}
