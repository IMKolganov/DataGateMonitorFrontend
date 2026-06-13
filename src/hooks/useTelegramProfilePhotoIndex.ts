import { useQuery } from "@tanstack/react-query";
import { fetchTelegramProfilePhotoIndex } from "../api/telegramProfilePhotoIndex";

const queryKey = ["tgbot-users", "profile-photo-index"] as const;

export function useTelegramProfilePhotoIndex(enabled = true) {
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchTelegramProfilePhotoIndex(signal),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const index = query.data;

  return {
    ...query,
    index,
    hasCachedPhoto: (telegramId: number | undefined) =>
      telegramId != null && index?.has(telegramId) === true,
  };
}
