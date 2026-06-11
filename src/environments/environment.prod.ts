// Produccion: todo pasa por el API Gateway (host unico, Railway).
// El gateway enruta a MS1 (Azure), MS2 (AWS) y MS3 (GCP).
export const environment = {
  production: true,
  graphqlUrl: 'https://api-gateway-production-9dbd.up.railway.app/graphql',
  ms2RestUrl: 'https://api-gateway-production-9dbd.up.railway.app/api/docs',
  ms3RestUrl: 'https://api-gateway-production-9dbd.up.railway.app/api/ops',
  metabaseUrl: '', // URL del dashboard Metabase (embed), si se usa
};
