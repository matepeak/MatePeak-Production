export interface AvatarResolutionInput {
  previewUrl?: string | null;
  profilePictureUrl?: string | null;
  avatarUrl?: string | null;
  profilesAvatarUrl?: string | null;
  metadataAvatarUrl?: string | null;
  metadataPictureUrl?: string | null;
}

export const getValidImageUrl = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const normalizedLower = normalized.toLowerCase();
  if (normalizedLower === "null" || normalizedLower === "undefined") {
    return "";
  }

  return normalized;
};

export const resolveAvatarUrl = ({
  previewUrl,
  profilePictureUrl,
  avatarUrl,
  profilesAvatarUrl,
  metadataAvatarUrl,
  metadataPictureUrl,
}: AvatarResolutionInput): string => {
  return (
    getValidImageUrl(previewUrl) ||
    getValidImageUrl(profilePictureUrl) ||
    getValidImageUrl(avatarUrl) ||
    getValidImageUrl(profilesAvatarUrl) ||
    getValidImageUrl(metadataAvatarUrl) ||
    getValidImageUrl(metadataPictureUrl) ||
    ""
  );
};
