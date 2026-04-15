export const AWS_CONFIG = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_example',
      userPoolClientId: import.meta.env.VITE_CLIENT_ID || 'example_client_id',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_AUTH_DOMAIN || 'certprep360-dev.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173'],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173'],
          responseType: 'code' as const,
        }
      }
    }
  },
  API: {
    REST: {
      CertPrepApi: {
        endpoint: import.meta.env.VITE_API_URL || 'https://api.example.com/dev',
        region: 'us-east-1'
      }
    }
  }
};
