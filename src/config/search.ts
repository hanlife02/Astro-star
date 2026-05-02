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
  applicationId: "0RTMRFND63",
  apiKey: "70bc81eadf006b0f9b4bb5df1a2de464",
  indexName: "hanlife02_com_0rtmrfnd63_articles",
  attributes: {
    primaryText: "url",
    secondaryText: "headline",
    tertiaryText: undefined,
    url: "url",
    image: undefined,
  },
  darkMode: false,
} satisfies AlgoliaSiteSearchConfig;

export const algoliaCrawlerVerification = "4DD129FBB60A97E4";

export const isAlgoliaSiteSearchConfigured = Boolean(
  algoliaSiteSearchConfig.applicationId &&
  algoliaSiteSearchConfig.apiKey &&
  algoliaSiteSearchConfig.indexName,
);
