import * as dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';

dotenv.config();

const client = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
    Accept: 'application/vnd.github.packages-preview+json',
  },
});

export default client;
