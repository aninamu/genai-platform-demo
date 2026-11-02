export const REPOS: readonly string[] = ["aninamu/genai-platform-demo"];

export function watches(fullName: string): boolean {
  return REPOS.some((repo) => repo.toLowerCase() === fullName.toLowerCase());
}
