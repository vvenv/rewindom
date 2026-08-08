import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


export interface LocalRestoreCandidate {
  file_path: string;
  filename: string;
  size_bytes: number;
  modified_at: number;
}

const LOCAL_RESTORE_CANDIDATES_KEY = [
  "platform",
  "restore",
  "local-candidates",
] as const;

export function usePlatformLocalRestore() {
  const { data: candidatesData, refetch: refetchCandidates } = useQuery({
    queryKey: LOCAL_RESTORE_CANDIDATES_KEY,
    queryFn: () =>
      api.get<{ candidates: LocalRestoreCandidate[] }>(
        "/platform/restore/local-candidates",
      ),
  });

  return {
    candidates: candidatesData?.candidates ?? [],
    refetchCandidates,
  };
}
