import { inject } from '@angular/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { environment } from '../../../environments/environment';

// Configura Apollo (GraphQL) apuntando a MS1. El JWT lo agrega el jwtInterceptor
// porque HttpLink usa el HttpClient de Angular.
export const graphqlProvider = provideApollo(() => {
  const httpLink = inject(HttpLink);
  return {
    cache: new InMemoryCache(),
    link: httpLink.create({ uri: environment.graphqlUrl }),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
      query: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
    },
  };
});
