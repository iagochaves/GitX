import * as dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';

dotenv.config();

const client = new GraphQLClient('http://localhost:3334/graphql', {
  // headers: {
  //   Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
  //   Accept: 'application/vnd.github.packages-preview+json',
  // },
});

export default client;
