import "server-only";

export type OAuthProviders = {
  github: boolean;
  google: boolean;
};

export function getOAuthProviders(): OAuthProviders {
  return {
    github: Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
    ),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  };
}
