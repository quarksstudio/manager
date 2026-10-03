export const EXIT_CODES = {
  success: 0,
  genericFailure: 1,
  invalidArguments: 2,
  authentication: 3,
  notFound: 4,
  dependencyFailure: 5,
  permissionDenied: 6,
  networkFailure: 7,
  cancelled: 8,
  verificationFailure: 9,
  configurationFailure: 10,
} as const;
