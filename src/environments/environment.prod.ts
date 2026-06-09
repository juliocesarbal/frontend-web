// Produccion: todo pasa por el API Gateway (host unico).
export const environment = {
  production: true,
  graphqlUrl: 'https://<gateway-host>/graphql',
  ms2RestUrl: 'https://<gateway-host>/api/docs',
  ms3RestUrl: 'https://<gateway-host>/api/ops',
  metabaseUrl: 'https://<metabase-host>/dashboard/1',
};
