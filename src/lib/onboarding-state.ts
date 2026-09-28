type OnboardingProfile = {
  onboardingCompletedAt: Date | null;
  heightCm: number | null;
};

export function requiresOnboarding(profile: OnboardingProfile | null | undefined) {
  return !profile?.onboardingCompletedAt || profile.heightCm == null;
}
