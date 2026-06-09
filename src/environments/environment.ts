// Desarrollo: el frontend habla SOLO con el API Gateway (host unico, nginx :8090).
// El gateway (carpeta api-gateway/) enruta a cada microservicio por prefijo.
// Levantarlo: cd api-gateway && docker compose up -d  (requiere MS1/MS2/MS3 arriba).
export const environment = {
  production: false,
  graphqlUrl: 'http://localhost:8090/graphql', // gateway -> MS1 (:3001)
  ms2RestUrl: 'http://localhost:8090/api/docs', // gateway -> MS2 (:8080)
  ms3RestUrl: 'http://localhost:8090/api/ops', // gateway -> MS3 (:8000)
  metabaseUrl: '', // URL del dashboard Metabase (embed)
};
