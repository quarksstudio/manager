export enum Provider {
  google = 'google.com',
  github = 'github.com',
  twitter = 'twitter.com',
  facebook = 'facebook.com',
}

export type ProviderName = keyof typeof Provider;
