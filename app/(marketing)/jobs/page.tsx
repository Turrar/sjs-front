import { JobsBrowseContent } from "@/components/jobs/jobs-browse-content";

/** Публичная витрина (маркетинг): без боковой панели кабинета */
export default function JobsBrowsePage() {
  return <JobsBrowseContent detailBasePath="/jobs" />;
}
