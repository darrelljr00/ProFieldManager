import { useQuery } from "@tanstack/react-query";
import type { FrontendSlider } from "@shared/schema";

export function useHeroSlides() {
  return useQuery<FrontendSlider[]>({
    queryKey: ['/api/frontend/sliders'],
    select: (data) => data.filter(slide => slide.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
  });
}
