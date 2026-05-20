export interface AlgoliaSiteSearchConfig {
  applicationId: string;
  apiKey: string;
  indexName: string;
  attributes: {
    primaryText: string;
    secondaryText?: string;
    tertiaryText?: string;
    url?: string;
    image?: string;
  };
  darkMode: boolean;
}

export const algoliaSiteSearchConfig = {
  applicationId: "",
  apiKey: "",
  indexName: "",
  attributes: {
    primaryText: "headline",
    secondaryText: "excerpt",
    tertiaryText: "url",
    url: "url",
    image: undefined,
  },
  darkMode: false,
} satisfies AlgoliaSiteSearchConfig;

export const algoliaCrawlerVerification = "";

export const isAlgoliaSiteSearchConfigured = Boolean(
  algoliaSiteSearchConfig.applicationId &&
  algoliaSiteSearchConfig.apiKey &&
  algoliaSiteSearchConfig.indexName,
);
